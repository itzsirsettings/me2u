import Redis from "ioredis";

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
    redis = new Redis(url, { maxRetriesPerRequest: 1, enableReadyCheck: false, lazyConnect: true });
    redis.on("error", () => {
      // Fall back to in-memory buckets when Redis is unreachable.
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
  return bucket.count > limit;
}

/**
 * Distributed-safe rate limiter.
 * Uses Redis (INCR + PEXPIRE) when REDIS_URL is configured, otherwise falls
 * back to the in-process bucket map for local development / single instance.
 */
export async function isRateLimitedAsync(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const client = getRedis();
  if (!client) return isRateLimitedMemory(key, limit, windowMs);

  try {
    const count = await client.incr(`ratelimit:${key}`);
    if (count === 1) {
      await client.pexpire(`ratelimit:${key}`, windowMs);
    }
    return count > limit;
  } catch {
    return isRateLimitedMemory(key, limit, windowMs);
  }
}

export function isRateLimited(key: string, limit: number, windowMs: number) {
  return isRateLimitedMemory(key, limit, windowMs);
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

