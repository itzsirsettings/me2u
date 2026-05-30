import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const dryRun = process.argv.includes("--dry-run");

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

const wemaReady =
  process.env.WEMA_ENABLED === "true" &&
  Boolean(process.env.WEMA_BASE_URL?.trim() && process.env.WEMA_API_KEY?.trim());

const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

async function fetchExistingVirtualAccounts() {
  try {
    return await fetchAll("virtual_accounts", "user_id,provider,account_number,status");
  } catch (error) {
    if (String(error.message || "").includes("virtual_accounts")) {
      console.log("virtual_accounts table is not available yet. Apply the Wema migration before running a live backfill.");
      return [];
    }
    throw error;
  }
}

async function saveStatus(userId, status, payload) {
  if (dryRun) return;
  const { error } = await supabase.from("virtual_accounts").upsert(
    {
      user_id: userId,
      provider: "wema",
      status,
      response_payload: payload,
    },
    { onConflict: "provider,user_id" },
  );
  if (error) throw new Error(error.message);
}

async function requestWemaVirtualAccount(profile) {
  const baseUrl = process.env.WEMA_BASE_URL.replace(/\/$/, "");
  const path = process.env.WEMA_VIRTUAL_ACCOUNT_PATH || "/virtual-accounts";
  const body = {
    customerReference: profile.id,
    fullName: `${profile.first_name} ${profile.last_name}`.trim(),
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: profile.email,
    phoneNumber: profile.phone || undefined,
  };

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": process.env.WEMA_API_KEY,
      Authorization: process.env.WEMA_AUTHORIZATION || `Bearer ${process.env.WEMA_API_KEY}`,
      ...(process.env.WEMA_CLIENT_ID ? { "x-client-id": process.env.WEMA_CLIENT_ID } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status === false) throw new Error(payload?.message || "Wema request failed.");

  const account = payload?.data || payload;
  const accountNumber = account?.accountNumber || account?.account_number || account?.nuban || null;
  const { error } = await supabase.from("virtual_accounts").upsert(
    {
      user_id: profile.id,
      provider: "wema",
      provider_reference: account?.reference || account?.accountReference || account?.id || null,
      account_name: account?.accountName || account?.account_name || null,
      account_number: accountNumber,
      bank_name: account?.bankName || account?.bank_name || "Wema Bank",
      bank_code: account?.bankCode || account?.bank_code || null,
      status: accountNumber ? "active" : "pending",
      response_payload: payload,
    },
    { onConflict: "provider,user_id" },
  );
  if (error) throw new Error(error.message);
  return accountNumber ? "active" : "pending";
}

const profiles = await fetchAll("profiles", "id,email,first_name,last_name,phone,kyc_verified,nin_last4");
const accounts = await fetchExistingVirtualAccounts();
const wemaAccountsByUser = new Map(accounts.filter((row) => row.provider === "wema").map((row) => [row.user_id, row]));

const summary = {
  totalProfiles: profiles.length,
  activeAlready: 0,
  skipped: 0,
  requested: 0,
  pending: 0,
  notConfigured: 0,
  failed: 0,
};

for (const profile of profiles) {
  const existing = wemaAccountsByUser.get(profile.id);
  if (existing?.account_number) {
    summary.activeAlready += 1;
    continue;
  }

  if (!profile.kyc_verified || !profile.nin_last4) {
    summary.skipped += 1;
    console.log(`skipped ${profile.email}: KYC/NIN is incomplete`);
    continue;
  }

  if (!wemaReady) {
    summary.notConfigured += 1;
    await saveStatus(profile.id, "not_configured", { message: "Wema/ALAT credentials are not configured." });
    console.log(`${dryRun ? "would mark" : "marked"} ${profile.email}: Wema not configured`);
    continue;
  }

  try {
    if (dryRun) {
      summary.requested += 1;
      console.log(`would request Wema virtual account for ${profile.email}`);
      continue;
    }
    const status = await requestWemaVirtualAccount(profile);
    summary[status === "active" ? "requested" : "pending"] += 1;
    console.log(`${status} ${profile.email}: Wema virtual account request completed`);
  } catch (error) {
    summary.failed += 1;
    await saveStatus(profile.id, "unavailable", { message: error.message });
    console.log(`failed ${profile.email}: ${error.message}`);
  }
}

console.log(JSON.stringify({ dryRun, wemaReady, summary }, null, 2));
