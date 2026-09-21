// Read-only aggregate audit. Never prints credentials, identities, or document contents.
const { Client } = require("pg");

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '15s'");
    const checks = {
      profiles: "SELECT COUNT(*)::int AS count FROM profiles",
      missingWallets:
        "SELECT COUNT(*)::int AS count FROM profiles p LEFT JOIN wallets w ON w.user_id = p.id WHERE w.user_id IS NULL",
      missingAuthUsers:
        "SELECT COUNT(*)::int AS count FROM profiles p LEFT JOIN auth_users a ON a.id = p.id WHERE a.id IS NULL",
      lockedConfirmedDeposits:
        "SELECT COUNT(*)::int AS count FROM profiles WHERE registration_deposit_paid AND NOT COALESCE(account_unlocked, false)",
      duplicateEmails:
        "SELECT COUNT(*)::int AS groups FROM (SELECT lower(trim(email)) FROM auth_users GROUP BY lower(trim(email)) HAVING COUNT(*) > 1) d",
      negativeWallets:
        "SELECT COUNT(*)::int AS count FROM wallets WHERE balance < 0 OR locked < 0",
      invalidTrustScores:
        "SELECT COUNT(*)::int AS count FROM profiles WHERE trust_score < 0 OR trust_score > 100 OR trust_score IS NULL",
      privateFiles: "SELECT bucket, COUNT(*)::int AS count FROM private_files GROUP BY bucket",
      pendingProofs:
        "SELECT type, COUNT(*)::int AS count FROM payment_proofs WHERE status = 'pending' GROUP BY type",
      referralDrift:
        "SELECT COUNT(*)::int AS count FROM profiles p WHERE COALESCE(p.verified_referral_count, 0) <> (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = p.id AND r.first_withdrawal_rewarded)",
    };
    const report = {};
    for (const [name, sql] of Object.entries(checks))
      report[name] = (await client.query(sql)).rows;
    await client.query("ROLLBACK");
    console.log(JSON.stringify({ mode: "read-only", checks: report }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(JSON.stringify({ mode: "read-only", error: error.code || "AUDIT_FAILED" }));
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
