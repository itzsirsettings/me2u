import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import { parse as parsePgConnectionString } from "pg-connection-string";
import jwt from "jsonwebtoken";
import { logWarn } from "./logger";

let pool: Pool | null = null;

function hasDbConfig() {
  return Boolean(
    process.env.DATABASE_URL ||
      (process.env.PGHOST && process.env.PGPASSWORD && process.env.PGDATABASE),
  );
}

function getDbClient(): Pool {
  if (!hasDbConfig()) {
    throw new Error("Missing DATABASE_URL or PostgreSQL connection variables.");
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
        // Fallback for connection strings that pg-connection-string cannot parse.
        try {
          const url = new URL(process.env.DATABASE_URL);
          user = decodeURIComponent(url.username) || undefined;
          password = decodeURIComponent(url.password) || undefined;
          host = url.hostname || undefined;
          port = url.port ? Number(url.port) : undefined;
          database = url.pathname.length > 1 ? url.pathname.slice(1) : undefined;
        } catch {
          // Leave values undefined; the pool below will surface the failure.
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
      Boolean(process.env.DATABASE_URL?.includes("ssl=true"));

    let ssl: boolean | { rejectUnauthorized: boolean; ca?: string } = false;
    if (sslEnforced) {
      ssl = { rejectUnauthorized: process.env.PGSSLMODE !== "verify-full" };
      if (process.env.PGSSLROOTCERT) ssl = { ...ssl, ca: process.env.PGSSLROOTCERT };
    }

    pool = new Pool({
      user: finalUser,
      password: finalPassword,
      host: finalHost,
      port: finalPort,
      database: finalDatabase,
      ssl,
      connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 10000),
      statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS ?? 25000),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 60000),
      max: Number(process.env.PG_MAX_POOL_SIZE ?? 20),
      min: 0,
      allowExitOnIdle: true,
    });

    pool.on("error", (err) => {
      logWarn("[pg_pool_error]", { message: err.message, code: (err as any).code });
    });
  }

  return pool;
}
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[] }> {
  const client = getDbClient();
  const result = await client.query(text, params);
  return { rows: result.rows as T[] };
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getDbClient().connect();
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

export async function withUserTransaction<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getDbClient().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config($1, $2, true)", ["app.current_user_id", userId]);
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

function getJwtSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) throw new Error("AUTH_TOKEN_SECRET environment variable is required");
  return secret;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  jti: string;
  iat: number;
  exp: number;
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: "me2u",
      audience: "app.me2u",
    }) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function getUserFromBearer(authorization = ""): Promise<{
  id: string;
  email?: string;
  role: string;
}> {
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Please log in first.");

  const payload = verifyToken(token);
  if (!payload) throw new Error("Session expired. Please log in again.");

  const { rows } = await query<{ id: string }>(
    "SELECT user_id FROM auth_sessions WHERE jwt_id = $1 AND expires_at > NOW()",
    [payload.jti],
  );

  if (rows.length === 0) {
    throw new Error("Session expired. Please log in again.");
  }

  return { id: payload.userId, email: payload.email || undefined, role: payload.role };
}

export async function assertAdmin(userId: string): Promise<void> {
  const { rows } = await query<{ role: string }>(
    "SELECT role FROM profiles WHERE id = $1",
    [userId],
  );

  if (rows.length === 0 || rows[0].role !== "admin") {
    throw new Error("Admin access required.");
  }
}

export type AuthenticatedRequestUser = {
  id: string;
  email?: string;
  role: string;
};

@Injectable()
export class RailwayDbService implements OnModuleInit, OnModuleDestroy {
  onModuleInit() {
    if (!hasDbConfig()) {
      logWarn("[railway-db] DATABASE_URL not configured - database queries will fail at runtime");
    }
  }

  onModuleDestroy() {
    if (pool) {
      pool.end().catch(() => undefined);
      pool = null;
    }
  }

  getPool(): Pool {
    return getDbClient();
  }
}
