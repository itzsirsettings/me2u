import { Pool, PoolClient } from "pg";

let pool: Pool | null = null;

export function hasRailwayDbConfig() {
  return Boolean(
    process.env.DATABASE_URL ||
      (process.env.PGHOST && process.env.PGPASSWORD && process.env.PGDATABASE),
  );
}

export function getRailwayDbClient(): Pool {
  if (!hasRailwayDbConfig()) {
    throw new Error(
      "Missing DATABASE_URL or PostgreSQL connection variables (PGHOST, PGPASSWORD, PGDATABASE).",
    );
  }

  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ||
      `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`;

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }, // required for Railway PostgreSQL SSL
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  return pool;
}

/** Simple query — no RLS session variable set. Use for admin/service queries. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[] }> {
  const client = getRailwayDbClient();
  const result = await client.query(text, params);
  return { rows: result.rows as T[] };
}

/**
 * Run a query scoped to a specific user.
 * Sets `app.current_user_id` as a local session variable so RLS policies
 * using `public.app_user_id()` work correctly.
 */
export async function queryAsUser<T = Record<string, unknown>>(
  userId: string,
  text: string,
  params?: unknown[],
): Promise<{ rows: T[] }> {
  const client = await getRailwayDbClient().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const result = await client.query(text, params);
    await client.query("COMMIT");
    return { rows: result.rows as T[] };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Run multiple statements inside a single transaction scoped to a user.
 * Sets `app.current_user_id` so RLS is enforced throughout the transaction.
 *
 * Usage:
 *   const result = await withUserTransaction(userId, async (client) => {
 *     const { rows } = await client.query("SELECT ...", [...]);
 *     await client.query("UPDATE ...", [...]);
 *     return rows[0];
 *   });
 */
export async function withUserTransaction<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getRailwayDbClient().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Run multiple statements inside a plain transaction (no user scoping).
 * Use for admin operations that bypass RLS.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getRailwayDbClient().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
