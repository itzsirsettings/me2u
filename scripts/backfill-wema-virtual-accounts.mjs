#!/usr/bin/env node
/**
 * Backfills Wema/ALAT virtual accounts for eligible profiles.
 * Usage:
 *   node --env-file=.env scripts/backfill-wema-virtual-accounts.mjs
 *   node --env-file=.env scripts/backfill-wema-virtual-accounts.mjs --dry-run
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

const wemaReady =
  process.env.WEMA_ENABLED === "true" &&
  Boolean(process.env.WEMA_BASE_URL?.trim() && process.env.WEMA_API_KEY?.trim());

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
    "SELECT id, email, first_name, last_name, phone, kyc_verified, nin_last4 FROM profiles",
  );
  return rows;
}

async function fetchExistingVirtualAccounts() {
  try {
    const { rows } = await client.query(
      "SELECT user_id, provider, account_number, status FROM virtual_accounts",
    );
    return rows;
  } catch (error) {
    if (/virtual_accounts/.test(String(error.message || ""))) {
      console.log(
        "virtual_accounts table is not available yet. Apply the Wema migration before running a live backfill.",
      );
      return [];
    }
    throw error;
  }
}

async function saveStatus(userId, status, payload) {
  if (dryRun) return;
  await client.query(
    `INSERT INTO virtual_accounts (user_id, provider, status, response_payload)
     VALUES ($1, 'wema', $2, $3)
     ON CONFLICT (provider, user_id) DO UPDATE SET
       status = EXCLUDED.status,
       response_payload = EXCLUDED.response_payload`,
    [userId, status, JSON.stringify(payload ?? {})],
  );
}

async function saveAccount(userId, account, payload, accountNumber) {
  if (dryRun) return;
  await client.query(
    `INSERT INTO virtual_accounts (user_id, provider, provider_reference, account_name, account_number, bank_name, bank_code, status, response_payload)
     VALUES ($1, 'wema', $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (provider, user_id) DO UPDATE SET
       provider_reference = EXCLUDED.provider_reference,
       account_name = EXCLUDED.account_name,
       account_number = EXCLUDED.account_number,
       bank_name = EXCLUDED.bank_name,
       bank_code = EXCLUDED.bank_code,
       status = EXCLUDED.status,
       response_payload = EXCLUDED.response_payload`,
    [
      userId,
      account?.reference || account?.accountReference || account?.id || null,
      account?.accountName || account?.account_name || null,
      accountNumber,
      account?.bankName || account?.bank_name || "Wema Bank",
      account?.bankCode || account?.bank_code || null,
      accountNumber ? "active" : "pending",
      JSON.stringify(payload ?? {}),
    ],
  );
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
      "Ocp-Apim-Subscription-Key": required("WEMA_API_KEY"),
      Authorization: process.env.WEMA_AUTHORIZATION || `Bearer ${process.env.WEMA_API_KEY}`,
      ...(process.env.WEMA_CLIENT_ID ? { "x-client-id": process.env.WEMA_CLIENT_ID } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status === false)
    throw new Error(payload?.message || "Wema request failed.");

  const account = payload?.data || payload;
  const accountNumber =
    account?.accountNumber || account?.account_number || account?.nuban || null;
  await saveAccount(profile.id, account, payload, accountNumber);
  return accountNumber ? "active" : "pending";
}

async function main() {
  await client.connect();

  const profiles = await fetchProfiles();
  const accounts = await fetchExistingVirtualAccounts();
  const wemaAccountsByUser = new Map(
    accounts.filter((row) => row.provider === "wema").map((row) => [row.user_id, row]),
  );

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
      await saveStatus(profile.id, "not_configured", {
        message: "Wema/ALAT credentials are not configured.",
      });
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
      const message = error instanceof Error ? error.message : "Wema request failed.";
      await saveStatus(profile.id, "unavailable", { message });
      console.log(`failed ${profile.email}: ${message}`);
    }
  }

  console.log(JSON.stringify({ dryRun, wemaReady, summary }, null, 2));
}

try {
  await main();
} finally {
  await client.end();
}
