/**
 * Sliding-window rate limiter.
 *
 * Backends
 * --------
 * Redis (`REDIS_URL` set) is used when available, because the in-process map
 * cannot enforce anything that matters once the app runs on more than one
 * instance: counters reset on every deploy, an attacker just spreads requests
 * across replicas, and each replica enforces the full limit independently.
 *
 * The in-memory fallback is for local development and single-instance use. It is
 * NOT adequate for production, which is why `rateLimiterHealth()` exposes which
 * backend is live so a misconfigured deploy is visible rather than silent.
 *
 * Failure mode
 * ------------
 * Redis failures **fail open** (the request is allowed) by default, because
 * rate limiting is a defence-in-depth control and taking authentication offline
 * entirely because a cache is unreachable turns a degradation into an outage.
 * That choice is only safe because a second, durable control sits behind it: the
 * `failedLogins` / `lockedUntil` columns on `User` are stored in MySQL and
 * survive both Redis loss and instance restarts.
 *
 * Set `RATE_LIMIT_FAIL_CLOSED=true` if your threat model prefers availability
 * loss over unthrottled attempts. For the credential path this is the safer
 * default in production, since account lockout already exists in the database.
 */
import Redis from "ioredis";

type Bucket = { hits: number[] };

/** Backend selection is resolved once per process. */
type Store =
  | { kind: "memory"; buckets: Map<string, Bucket> }
  | { kind: "redis"; client: Redis };

const memoryBuckets = new Map<string, Bucket>();
let store: Store | null = null;
let lastRedisError: string | null = null;

/** Cap on distinct keys held in memory, so a flood of unique keys cannot OOM. */
const MAX_MEMORY_KEYS = 10_000;

function memoryStore(): Store {
  return { kind: "memory", buckets: memoryBuckets };
}

function resolveStore(): Store {
  if (store) return store;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    store = memoryStore();
    return store;
  }
  try {
    const client = new Redis(url, {
      // Bound the damage a slow or dead Redis can do: give up quickly rather
      // than queueing commands indefinitely and turning a cache outage into a
      // slow login for every user.
      maxRetriesPerRequest: 2,
      connectTimeout: 2_000,
      retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2_000)),
    });
    client.on("error", (err: Error) => {
      lastRedisError = err.message;
    });
    store = { kind: "redis", client };
  } catch (err) {
    lastRedisError = err instanceof Error ? err.message : String(err);
    console.warn(
      `[rate-limit] Redis client could not be constructed (${lastRedisError}); falling back to in-memory.`,
    );
    store = memoryStore();
  }
  return store;
}

/** Test seam: force a backend without touching env. */
export function __setRateLimitStore(next: Store | null): void {
  store = next;
}

/**
 * Which limiter is actually running, and whether Redis is healthy.
 * Surfaced on /api/healthz so an operator sees "rate limiting is per-instance"
 * before an attacker does.
 */
export function rateLimiterHealth(): {
  backend: "redis" | "memory";
  lastRedisError: string | null;
} {
  const active = resolveStore();
  return { backend: active.kind, lastRedisError };
}

function failClosedConfigured(): boolean {
  return process.env.RATE_LIMIT_FAIL_CLOSED === "true";
}

/**
 * Sliding-window check.
 *
 * Returns `ok: false` once `limit` hits fall inside `windowMs`. `remaining` is
 * informational only and is best-effort under Redis.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number }> {
  const active = resolveStore();

  if (active.kind === "redis") {
    try {
      return await redisWindow(active.client, key, limit, windowMs);
    } catch (err) {
      lastRedisError = err instanceof Error ? err.message : String(err);
      if (failClosedConfigured()) {
        console.warn(`[rate-limit] Redis unavailable, failing closed for "${key}": ${lastRedisError}`);
        return { ok: false, remaining: 0 };
      }
      return { ok: true, remaining: limit };
    }
  }

  return memoryWindow(key, limit, windowMs);
}

/**
 * Sliding window in one Redis hash: field = timestamp, value = 1.
 *
 * ZRANGEBYSCORE trims expired hits, ZCARD counts what remains, and EXPIRE bounds
 * the key's lifetime so idle windows clean themselves up. Doing it this way
 * keeps the window sliding rather than resetting at a fixed boundary, which a
 * plain INCR + EXPIRE counter cannot do — a caller could otherwise send the full
 * quota at the end of one window and again at the start of the next.
 */
async function redisWindow(
  client: Redis,
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; remaining: number }> {
  const redisKey = `rl:${key}`;
  const now = Date.now();
  const cutoff = now - windowMs;
  const unique = `${now}-${Math.random().toString(36).slice(2, 10)}`;

  const pipeline = client.multi();
  pipeline.zremrangebyscore(redisKey, 0, cutoff);
  pipeline.zadd(redisKey, now, unique);
  pipeline.zcard(redisKey);
  pipeline.pexpire(redisKey, windowMs);
  const results = await pipeline.exec();

  const count = Number(results?.[2]?.[1] ?? 0);
  if (!Number.isFinite(count)) throw new Error("unexpected Redis response");

  // The just-added member is counted, so exceeding means count > limit.
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}

function memoryWindow(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const existing = memoryBuckets.get(key);
  const hits = (existing?.hits ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    memoryBuckets.set(key, { hits });
    evictIfOversized();
    return { ok: false, remaining: 0 };
  }

  hits.push(now);
  memoryBuckets.set(key, { hits });
  evictIfOversized();
  return { ok: true, remaining: limit - hits.length };
}

/**
 * Drop empty and expired buckets, then the oldest, if still over cap.
 *
 * Without this a scan flood (every request using a unique key, e.g. a distinct
 * contact email) grows the map for the life of the process.
 */
function evictIfOversized(): void {
  if (memoryBuckets.size <= MAX_MEMORY_KEYS) return;
  const now = Date.now();
  const longestWindow = DEFAULT_WINDOWS_MS;

  for (const [key, bucket] of memoryBuckets) {
    if (bucket.hits.every((t) => now - t >= longestWindow)) memoryBuckets.delete(key);
  }
  if (memoryBuckets.size <= MAX_MEMORY_KEYS) return;

  const ordered = [...memoryBuckets.entries()].sort(
    (a, b) => (a[1].hits.at(-1) ?? 0) - (b[1].hits.at(-1) ?? 0),
  );
  for (const [key] of ordered) {
    if (memoryBuckets.size <= MAX_MEMORY_KEYS) break;
    memoryBuckets.delete(key);
  }
}

/** Widest window any caller currently uses, so eviction keeps live buckets. */
const DEFAULT_WINDOWS_MS = 10 * 60 * 1000;

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
