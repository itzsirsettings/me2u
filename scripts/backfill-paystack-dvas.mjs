#!/usr/bin/env node
/**
 * Backfills Paystack dedicated virtual accounts (DVAs) for eligible NG profiles.
 * Usage:
 *   node --env-file=.env scripts/backfill-paystack-dvas.mjs
 *   node --env-file=.env scripts/backfill-paystack-dvas.mjs --dry-run
 */
import pg from "pg";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const { Client } = pg;
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

// Fallback so the script also works when run without `node --env-file=.env`.
loadEnvFile(resolve(".env"), false);
loadEnvFile(resolve("server/.env"), false);
loadEnvFile(resolve(".env.local"), true);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

const preferredBank = process.env.PAYSTACK_DVA_PREFERRED_BANK || "titan-paystack";

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

if (
  !process.env.DATABASE_URL &&
  !(process.env.PGHOST && process.env.PGPASSWORD && process.env.PGDATABASE)
) {
  throw new Error("DATABASE_URL or PostgreSQL connection variables are required.");
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: { rejectUnauthorized: false },
});

async function fetchProfiles() {
  const { rows } = await client.query(
    "SELECT id, email, first_name, last_name, phone, country_code FROM profiles",
  );
  return rows;
}

async function fetchDedicatedAccounts() {
  const { rows } = await client.query(
    "SELECT user_id, account_number, status FROM paystack_dedicated_accounts",
  );
  return rows;
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
      const email = String(account?.customer?.email || "")
        .trim()
        .toLowerCase();
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
    status:
      account?.active === false ? "inactive" : account?.account_number ? "active" : "pending",
  };
}

async function saveAccount(row) {
  if (dryRun) return;
  await client.query(
    `INSERT INTO paystack_dedicated_accounts
       (user_id, customer_code, dedicated_account_id, account_name, account_number, bank_name, bank_slug, assignment_payload, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id) DO UPDATE SET
       customer_code = EXCLUDED.customer_code,
       dedicated_account_id = EXCLUDED.dedicated_account_id,
       account_name = EXCLUDED.account_name,
       account_number = EXCLUDED.account_number,
       bank_name = EXCLUDED.bank_name,
       bank_slug = EXCLUDED.bank_slug,
       assignment_payload = EXCLUDED.assignment_payload,
       status = EXCLUDED.status`,
    [
      row.user_id,
      row.customer_code,
      row.dedicated_account_id,
      row.account_name,
      row.account_number,
      row.bank_name,
      row.bank_slug,
      JSON.stringify(row.assignment_payload ?? {}),
      row.status,
    ],
  );
}

async function saveStatus(userId, status, payload) {
  if (dryRun) return;
  await client.query(
    `INSERT INTO paystack_dedicated_accounts (user_id, status, assignment_payload)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       status = EXCLUDED.status,
       assignment_payload = EXCLUDED.assignment_payload`,
    [userId, status, JSON.stringify(payload ?? {})],
  );
}

async function main() {
  await client.connect();

  const profiles = await fetchProfiles();
  const accountRows = await fetchDedicatedAccounts();
  const accountsByUser = new Map(accountRows.map((row) => [row.user_id, row]));

  let managedAccountsByEmail = new Map();
  try {
    managedAccountsByEmail = await fetchManagedAccountsByEmail();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Paystack request failed.";
    console.log(
      `Paystack managed account lookup failed; continuing with assignment requests. (${message})`,
    );
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
      console.log(
        `${dryRun ? "would activate" : "activated"} ${normalizedEmail}: existing Paystack DVA found`,
      );
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
        console.log(
          `pending ${normalizedEmail}: ${payload?.message || "assignment in progress"}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Paystack request failed.";
      const status = isDedicatedAccountUnavailable(message) ? "unavailable" : "pending";
      try {
        await saveStatus(profile.id, status, { message });
      } catch (saveError) {
        const saveMessage = saveError instanceof Error ? saveError.message : "unknown error";
        console.log(`failed to save ${normalizedEmail}: ${saveMessage}`);
      }
      summary[status === "unavailable" ? "unavailable" : "failed"] += 1;
      console.log(`${status} ${normalizedEmail}: ${message}`);
    }
  }

  console.log(JSON.stringify({ dryRun, preferredBank, summary }, null, 2));
}

try {
  await main();
} finally {
  await client.end();
}
