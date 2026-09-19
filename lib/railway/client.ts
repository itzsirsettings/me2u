import { Pool, PoolClient } from "pg";
import { parse as parsePgConnectionString } from "pg-connection-string";
import baseLogger from "../server/logger";

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
    let host: string | undefined;
    let port: number | undefined;
    let user: string | undefined;
    let password: string | undefined;
    let database: string | undefined;

    if (process.env.DATABASE_URL) {
      try {
        const parsed = parsePgConnectionString(process.env.DATABASE_URL);
        host = parsed.host || undefined;
        port = parsed.port ? Number(parsed.port) : undefined;
        user = parsed.user || undefined;
        password = parsed.password || undefined;
        database = parsed.database || undefined;
      } catch {
        const match = process.env.DATABASE_URL.match(
          /^postgresql?:\/\/([^:@\s]+):([^@\s]+)@([^:/\s]+)(?::(\d+))?(?:\/([^\s?]+))?/,
        );
        if (match) {
          const [, mUser, mPassword, mHost, mPort, mDatabase] = match;
          user = mUser || undefined;
          password = mPassword || undefined;
          host = mHost || undefined;
          port = mPort ? Number(mPort) : undefined;
          database = mDatabase || undefined;
        }
      }
    }

    const finalHost = process.env.PGHOST || host;
    const finalPort = Number(process.env.PGPORT || port || 5432);
    const finalUser = process.env.PGUSER || user;
    const finalPassword = process.env.PGPASSWORD || password;
    const finalDatabase = process.env.PGDATABASE || database;

    const sslEnforced =
      process.env.NODE_ENV === "production" ||
      process.env.PGSSLMODE === "require" ||
      Boolean(process.env.DATABASE_URL?.includes("ssl=true")) ||
      Boolean(process.env.DATABASE_URL?.includes("sslmode=require"));

    let ssl: boolean | { rejectUnauthorized: boolean; ca?: string } = false;
    if (sslEnforced) {
      // Allow self-signed certificates in development/Railway environments
      // Set PGSSLMODE=verify-full to enforce strict certificate validation
      const rejectUnauthorized = process.env.PGSSLMODE === "verify-full";
      ssl = { rejectUnauthorized };
      
      if (process.env.PGSSLROOTCERT) {
        ssl = { ...ssl, ca: process.env.PGSSLROOTCERT };
      }
    }

    const statementTimeoutMs = Number(process.env.PG_STATEMENT_TIMEOUT_MS ?? 25_000);
    const idleTimeoutMs = Number(process.env.PG_IDLE_TIMEOUT_MS ?? 60_000);
    const safeIdleMs = Math.max(idleTimeoutMs, statementTimeoutMs + 5_000);

    pool = new Pool({
      user: finalUser,
      password: finalPassword,
      host: finalHost,
      port: finalPort,
      database: finalDatabase,
      ssl,
      connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 10_000),
      statement_timeout: statementTimeoutMs,
      idleTimeoutMillis: safeIdleMs,
      max: Number(process.env.PG_MAX_POOL_SIZE ?? 20),
      min: 0,
      allowExitOnIdle: true,
      ...({ acquireTimeoutMillis: Number(process.env.PG_ACQUIRE_TIMEOUT_MS ?? 15_000) } as Record<string, unknown>),
    });

    pool.on("error", (err) => {
      const payload = {
        message: err.message,
        code: (err as any).code,
        severity: (err as any).severity,
      };
      try {
        baseLogger.error(payload, "[pg_pool_error]");
      } catch {
        console.error("[pg_pool_error]", JSON.stringify(payload));
      }
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
 * Single-shot user-scoped query (no explicit tx). For multi-statement use withUserTransaction.
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
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const result = await client.query(text, params);
    return { rows: result.rows as T[] };
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

/**
 * Gracefully shut down the PostgreSQL connection pool.
 * Call this from your SIGTERM/SIGINT handler to cleanly close all connections
 * before process exit.
 */
export async function shutdownPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
