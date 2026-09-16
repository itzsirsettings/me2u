import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const dryRun = process.argv.includes("--dry-run");
const preferredBank = process.env.PAYSTACK_DVA_PREFERRED_BANK || "titan-paystack";

function loadEnvFile(path, override = true) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (!override && process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(resolve("server/.env"), false);
loadEnvFile(resolve(".env.local"), true);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function normalizeNigerianPhone(phone) {
  const value = String(phone || "").trim();
  if (value.startsWith("+")) return value;

  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return `+234${digits.slice(1)}`;
  if (digits.length === 13 && digits.startsWith("234")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

function isDedicatedAccountUnavailable(message) {
  return /dedicated\s+nuban|reserved\s+accounts?|business\s+is\s+not\s+enabled|not\s+available\s+for\s+your\s+business|dedicated\s+account/i.test(
    message,
  );
}

async function paystack(path, init = {}) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${required("PAYSTACK_SECRET_KEY")}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status === false) {
    throw new Error(payload?.message || "Paystack request failed.");
  }
  return payload;
}

async function fetchAll(table, columns) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

async function fetchManagedAccountsByEmail() {
  const byEmail = new Map();
  let page = 1;
  let pageCount = 1;

  do {
    const query = new URLSearchParams({
      active: "true",
      currency: "NGN",
      provider_slug: preferredBank,
      perPage: "50",
      page: String(page),
    });
    const payload = await paystack(`/dedicated_account?${query.toString()}`);
    for (const account of payload?.data || []) {
      const email = String(account?.customer?.email || "").trim().toLowerCase();
      if (email && account?.account_number) byEmail.set(email, account);
    }
    pageCount = Number(payload?.meta?.pageCount || 1);
    page += 1;
  } while (page <= pageCount);

  return byEmail;
}

function accountRow(userId, account, payload) {
  return {
    user_id: userId,
    customer_code: account?.customer?.customer_code || null,
    dedicated_account_id: account?.id ? String(account.id) : null,
    account_name: account?.account_name || null,
    account_number: account?.account_number || null,
    bank_name: account?.bank?.name || account?.bank?.bank_name || null,
    bank_slug: account?.bank?.slug || null,
    assignment_payload: payload,
    status: account?.active === false ? "inactive" : account?.account_number ? "active" : "pending",
  };
}

async function saveAccount(row) {
  if (dryRun) return;
  const { error } = await supabase
    .from("paystack_dedicated_accounts")
    .upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

async function saveStatus(userId, status, payload) {
  await saveAccount({
    user_id: userId,
    assignment_payload: payload,
    status,
  });
}

const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const profiles = await fetchAll("profiles", "id,email,first_name,last_name,phone,country_code");
const accountRows = await fetchAll("paystack_dedicated_accounts", "user_id,account_number,status");
const accountsByUser = new Map(accountRows.map((row) => [row.user_id, row]));

let managedAccountsByEmail = new Map();
try {
  managedAccountsByEmail = await fetchManagedAccountsByEmail();
} catch (error) {
  console.log(`Paystack managed account lookup failed; continuing with assignment requests. (${error.message})`);
}

const summary = {
  totalProfiles: profiles.length,
  activeAlready: 0,
  activatedFromPaystack: 0,
  assignmentRequested: 0,
  pending: 0,
  unavailable: 0,
  skipped: 0,
  failed: 0,
};

for (const profile of profiles) {
  const existing = accountsByUser.get(profile.id);
  if (existing?.account_number) {
    summary.activeAlready += 1;
    continue;
  }

  if ((profile.country_code || "NG") !== "NG") {
    summary.skipped += 1;
    console.log(`skipped ${profile.email}: DVA is only enabled for NG profiles`);
    continue;
  }

  if (!profile.email || !profile.first_name || !profile.last_name || !profile.phone) {
    summary.skipped += 1;
    console.log(`skipped ${profile.email || profile.id}: missing email, name, or phone`);
    continue;
  }

  const normalizedEmail = String(profile.email).trim().toLowerCase();
  const managedAccount = managedAccountsByEmail.get(normalizedEmail);
  if (managedAccount?.account_number) {
    await saveAccount(accountRow(profile.id, managedAccount, managedAccount));
    summary.activatedFromPaystack += 1;
    console.log(`${dryRun ? "would activate" : "activated"} ${normalizedEmail}: existing Paystack DVA found`);
    continue;
  }

  const body = {
    email: normalizedEmail,
    first_name: profile.first_name,
    last_name: profile.last_name,
    phone: normalizeNigerianPhone(profile.phone),
    preferred_bank: preferredBank,
    country: "NG",
  };

  try {
    if (dryRun) {
      summary.assignmentRequested += 1;
      console.log(`would request DVA assignment for ${normalizedEmail}`);
      continue;
    }

    const payload = await paystack("/dedicated_account/assign", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (payload?.data?.account_number) {
      await saveAccount(accountRow(profile.id, payload.data, payload));
      summary.assignmentRequested += 1;
      console.log(`created ${normalizedEmail}: DVA assigned`);
    } else {
      await saveStatus(profile.id, "pending", payload);
      summary.pending += 1;
      console.log(`pending ${normalizedEmail}: ${payload?.message || "assignment in progress"}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Paystack request failed.";
    const status = isDedicatedAccountUnavailable(message) ? "unavailable" : "pending";
    try {
      await saveStatus(profile.id, status, { message });
    } catch (saveError) {
      console.log(`failed to save ${normalizedEmail}: ${saveError.message}`);
    }
    summary[status === "unavailable" ? "unavailable" : "failed"] += 1;
    console.log(`${status} ${normalizedEmail}: ${message}`);
  }
}

console.log(JSON.stringify({ dryRun, preferredBank, summary }, null, 2));
