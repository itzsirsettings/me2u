/**
 * Idempotency + audit helpers for financial API routes.
 * Idempotency: clients send `Idempotency-Key` header; first response is cached
 * in `request_idempotency` table and replayed for duplicates (24h TTL).
 * Audit: every money movement writes to `audit_events` table.
 */
import type { PoolClient } from "pg";
import { query } from "@/lib/railway/client";
import { logApiError, logInfo } from "@/lib/server/logger";

const IDEMPOTENCY_TTL_HOURS = 24;

type DbLike = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

async function ensureTables(db: DbLike): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS request_idempotency (
      key TEXT PRIMARY KEY,
      user_id TEXT,
      route TEXT NOT NULL,
      status INTEGER NOT NULL DEFAULT 200,
      body JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT,
      action TEXT NOT NULL,
      route TEXT,
      ip TEXT,
      user_agent TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await db.query(
    `DELETE FROM request_idempotency WHERE created_at < NOW() - ($1 || ' hours')::interval`,
    [String(IDEMPOTENCY_TTL_HOURS)],
  ).catch((err) => logApiError("idempotency-cleanup", err));
}

export function readIdempotencyKey(request: Request): string {
  return (
    request.headers.get("idempotency-key") ||
    request.headers.get("x-idempotency-key") ||
    ""
  ).trim().slice(0, 128);
}

function toJsonBody(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value };
}

/** Replay a cached response if this idempotency key was already processed. */
export async function replayIfDuplicate(
  db: DbLike,
  opts: { key: string; userId: string; route: string },
): Promise<Response | null> {
  if (!opts.key) return null;
  try {
    await ensureTables(db);
    const { rows } = await db.query(
      `SELECT status, body FROM request_idempotency WHERE key = $1 AND user_id = $2 LIMIT 1`,
      [opts.key, opts.userId],
    );
    const hit = rows[0];
    if (!hit) return null;
    const status = typeof hit.status === "number" ? hit.status : 200;
    return Response.json(toJsonBody(hit.body), { status });
  } catch (err) {
    logApiError("idempotency-replay", err);
    return null;
  }
}

/** Cache a successful financial response for future duplicate delivery. */
export async function rememberIdempotentResponse(
  db: DbLike,
  opts: { key: string; userId: string; route: string; status: number; body: unknown },
): Promise<void> {
  if (!opts.key) return;
  try {
    await ensureTables(db);
    await db.query(
      `INSERT INTO request_idempotency (key, user_id, route, status, body)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (key) DO NOTHING`,
      [opts.key, opts.userId, opts.route, opts.status, JSON.stringify(toJsonBody(opts.body))],
    );
  } catch (err) {
    logApiError("idempotency-remember", err);
  }
}

export async function logAuditEvent(opts: {
  db?: DbLike;
  client?: PoolClient;
  userId?: string | null;
  action: string;
  route?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const runner: DbLike = opts.client
    ? {
        query: (text: string, params?: unknown[]) =>
          (opts.client as PoolClient)
            .query(text, params as unknown[])
            .then((r) => ({ rows: r.rows as Array<Record<string, unknown>> })),
      }
    : { query };
  try {
    await ensureTables(runner);
    await runner.query(
      `INSERT INTO audit_events (user_id, action, route, ip, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        opts.userId ?? null,
        opts.action,
        opts.route ?? null,
        opts.ip ?? null,
        (opts.userAgent ?? "").slice(0, 500) || null,
        JSON.stringify(opts.metadata ?? {}),
      ],
    );
    logInfo(`audit:${opts.action}`, { userId: opts.userId ?? undefined, route: opts.route });
  } catch (err) {
    logApiError("audit-log", err);
  }
}

export function requestMeta(request: Request): { ip: string; userAgent: string } {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    request.headers.get("cf-connecting-ip")?.trim() ||
    (forwarded ? forwarded.split(",")[0]?.trim() : "") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return { ip, userAgent: request.headers.get("user-agent") || "" };
}