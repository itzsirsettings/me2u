const { Client } = require("pg");

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    const e = await c.query(
      "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.withdrawal_request_status'::regtype ORDER BY enumsortorder",
    );
    console.log("ENUMS " + JSON.stringify(e.rows));
    const s = await c.query(
      "SELECT migration_name FROM public.schema_migrations ORDER BY migration_name",
    );
    console.log("APPLIED " + JSON.stringify(s.rows.map((r) => r.migration_name)));
    const w = await c.query(
      "SELECT status, count(*)::int AS n FROM public.withdrawal_requests GROUP BY status ORDER BY status",
    );
    console.log("WITHDRAWAL_STATUS " + JSON.stringify(w.rows));
  } finally {
    await c.end();
  }
}

main().catch((err) => {
  console.error("ERR " + err.message);
  process.exit(1);
});
