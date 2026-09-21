// Operator-only recovery, never part of application startup. Dry-run by default.
// Usage: node scripts/restore-admin.cjs EMAIL [--apply]
const { Client } = require("pg");

(async () => {
  const email = (process.argv[2] || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Provide an exact account email.");
  const apply = process.argv.includes("--apply");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '10s'");
    const { rows } = await client.query(
      `SELECT p.id, p.role
      FROM profiles p JOIN auth_users a ON a.id = p.id
      WHERE lower(trim(p.email)) = $1 AND lower(trim(a.email)) = $1
      ${apply ? "FOR UPDATE OF p, a" : ""}`,
      [email],
    );
    if (rows.length !== 1) {
      await client.query("ROLLBACK");
      console.log(
        JSON.stringify({
          applied: false,
          matchingAccounts: rows.length,
          reason: "An exact existing account is required.",
        }),
      );
      return;
    }
    const previousRole = rows[0].role;
    if (apply && previousRole !== "admin") {
      await client.query("UPDATE profiles SET role = 'admin' WHERE id = $1", [rows[0].id]);
      await client.query(
        `INSERT INTO admin_audit_logs
        (admin_user_id, action, entity_type, entity_id, metadata)
        VALUES (NULL, 'operator_restore_admin', 'profiles', $1, $2::jsonb)`,
        [
          rows[0].id,
          JSON.stringify({
            previousRole,
            newRole: "admin",
            authorization: "Explicit account-owner instruction",
            recovery:
              "Restore previousRole for this entity_id to reverse; no financial or credential fields changed.",
          }),
        ],
      );
    }
    await client.query(apply ? "COMMIT" : "ROLLBACK");
    console.log(
      JSON.stringify({
        applied: apply,
        matchingAccounts: 1,
        previousRole,
        currentRole: apply ? "admin" : previousRole,
      }),
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(JSON.stringify({ applied: false, code: error.code || "RECOVERY_FAILED" }));
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})().catch(() => {
  console.error("Invalid recovery arguments.");
  process.exitCode = 1;
});
