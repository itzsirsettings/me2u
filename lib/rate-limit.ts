import Redis from "ioredis";
import baseLogger from "@/lib/server/logger";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
let lastSweepAt = 0;
let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.REDIS_URL;
  if (!url) {
    redis = null;
    return redis;
  }
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 2000,
      commandTimeout: 1500,
    });
    redis.on("error", (err) => {
      try {
        baseLogger.warn({ message: err?.message }, "[redis_rate_limit_error]");
      } catch {
        // fall back silently to in-memory
      }
    });
    redis.connect().catch(() => undefined);
  } catch {
    redis = null;
  }
  return redis;
}

function sweepExpiredBuckets(now: number) {
  if (now - lastSweepAt < 60_000) return;
  lastSweepAt = now;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function isRateLimitedMemory(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  sweepExpiredBuckets(now);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  if (bucket.count === limit + 1) {
    try {
      baseLogger.warn({ key, limit, windowMs }, "[rate_limit_memory_hit]");
    } catch {
      // ignore
    }
  }
  return bucket.count > limit;
}

/**
 * Distributed-safe rate limiter.
 * Uses Redis (INCR + PEXPIRE — sliding-window semantics via PEXPIRE on every call)
 * when REDIS_URL is configured, otherwise falls back to in-process bucket map.
 */
export async function isRateLimitedAsync(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const client = getRedis();
  if (!client) return isRateLimitedMemory(key, limit, windowMs);

  try {
    const redisKey = `ratelimit:${key}`;
    const count = await client.incr(redisKey);
    // Sliding window: refresh TTL on every hit so the window resets with activity
    await client.pexpire(redisKey, windowMs);
    if (count === limit + 1) {
      try {
        baseLogger.warn({ key, limit, windowMs }, "[rate_limit_redis_hit]");
      } catch {
        // ignore
      }
    }
    return count > limit;
  } catch {
    return isRateLimitedMemory(key, limit, windowMs);
  }
}

/**
 * Async rate limiter (alias of isRateLimitedAsync). Call with `await`.
 *
 * NOTE: The synchronous memory-only `isRateLimitedMemory` is intentionally
 * unexported — every API route MUST await this function to guarantee
 * distributed consistency when Redis is present.
 */
export function isRateLimited(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  return isRateLimitedAsync(key, limit, windowMs);
}

export function getClientIp(request: Request) {
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) return vercelForwardedFor.split(",")[0]?.trim() || "unknown";

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";

  return request.headers.get("x-real-ip") || "unknown";
}

