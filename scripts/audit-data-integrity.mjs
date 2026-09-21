import pg from "pg";

// Run inside the application service, where PostgreSQL's private network is reachable.
// This script never prints user records, connection strings, or database error messages.
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  statement_timeout: 15000,
});

try {
  await client.connect();
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const { rows } = await client.query(`SELECT
    (SELECT COUNT(*) FROM profiles) AS users,
    (SELECT COUNT(*) FROM referrals) AS referrals,
    (SELECT COUNT(*) FROM referral_reward_events) AS referral_reward_events,
    (SELECT COUNT(*) FROM affiliate_rewards) AS legacy_referral_rewards,
    (SELECT COUNT(*) FROM transactions WHERE type = 'affiliate_reward') AS paid_referral_transactions,
    (SELECT COUNT(*) FROM profiles WHERE trust_score = 50) AS profiles_at_default_trust_score,
    (SELECT COUNT(*) FROM profiles WHERE kyc_verified AND registration_deposit_paid AND NOT account_unlocked) AS verified_paid_accounts_locked,
    (SELECT COUNT(*) FROM profiles p WHERE p.verified_referral_count <>
      (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = p.id AND r.first_withdrawal_rewarded)) AS mismatched_verified_referral_counts,
    (SELECT COUNT(*) FROM profiles p WHERE NOT EXISTS
      (SELECT 1 FROM wallets w WHERE w.user_id = p.id)) AS profiles_missing_wallet,
    (SELECT COUNT(*) FROM referrals r WHERE r.signup_rewarded AND NOT EXISTS
      (SELECT 1 FROM referral_reward_events e WHERE e.recipient_id = r.referrer_id
       AND e.source_user_id = r.referee_id AND e.reward_type = 'direct_signup')) AS signup_flags_without_current_reward_event,
    (SELECT COUNT(*) FROM (SELECT LOWER(TRIM(email)) FROM auth_users GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1) duplicates) AS duplicate_normalized_emails,
    (SELECT COUNT(*) FROM (SELECT LOWER(TRIM(username)) FROM profiles WHERE username IS NOT NULL GROUP BY LOWER(TRIM(username)) HAVING COUNT(*) > 1) duplicates) AS duplicate_normalized_usernames`);
  const { rows: triggers } = await client.query(`SELECT
    t.tgname AS trigger_name, c.relname AS table_name
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    WHERE NOT t.tgisinternal AND (t.tgname LIKE '%trust_score%' OR t.tgname LIKE '%referral%')
    ORDER BY c.relname, t.tgname`);
  const { rows: functionSources } = await client.query(`SELECT
    POSITION('affiliate_rewards' IN pg_get_functiondef(p.oid)) > 0 AS trust_uses_legacy_rewards
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private' AND p.proname = 'me2u_refresh_trust_score'`);
  await client.query("ROLLBACK");
  console.log(
    JSON.stringify({ ok: true, counts: rows[0], trust: functionSources[0] ?? null, triggers }),
  );
} catch (error) {
  process.exitCode = 1;
  console.error(JSON.stringify({ ok: false, errorCode: error.code ?? "audit_failed" }));
} finally {
  await client.end();
}
