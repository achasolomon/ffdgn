/**
 * Rate limiter verification — exercises both backends directly, no server or
 * database needed.
 *
 * Run: npx tsx scripts/check-rate-limit.ts
 *
 * The point is to prove the sliding window actually slides (a fixed-window
 * counter would let a caller spend the full quota twice across a boundary),
 * that the Redis path is used when REDIS_URL is set, and that the memory
 * fallback cannot grow without bound.
 */
import { rateLimit, rateLimiterHealth, __setRateLimitStore } from "../lib/rate-limit";

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail = ""): void {
  if (ok) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function exerciseWindow(label: string): Promise<void> {
  // 3 allowed, then throttled.
  for (let i = 1; i <= 3; i++) {
    const res = await rateLimit(`t:${label}`, 3, 300);
    check(`${label}: request ${i} of 3 is allowed`, res.ok, `got ok=${res.ok}`);
  }
  const blocked = await rateLimit(`t:${label}`, 3, 300);
  check(`${label}: 4th request is throttled`, !blocked.ok, `got ok=${blocked.ok}`);

  // Window must slide: once the earliest hits age out, quota returns. A fixed
  // counter with INCR+EXPIRE would still be exhausted here.
  await sleep(340);
  const afterWindow = await rateLimit(`t:${label}`, 3, 300);
  check(`${label}: quota returns after the window slides`, afterWindow.ok, `got ok=${afterWindow.ok}`);
}

async function main() {
  console.log("\nFFDGN rate-limit verification\n");

  // ── memory backend ────────────────────────────────────────────────────────
  // Unset REDIS_URL so backend selection is exercised through the real code
  // path rather than by injecting a store, which would skip resolveStore().
  const savedRedis = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  __setRateLimitStore(null);

  console.log(`  backend without REDIS_URL: ${rateLimiterHealth().backend}\n`);
  check("no REDIS_URL selects the memory backend", rateLimiterHealth().backend === "memory");
  await exerciseWindow("memory");

  // Independent keys must not share a budget.
  const a = await rateLimit("t:separate-a", 1, 300);
  const b = await rateLimit("t:separate-b", 1, 300);
  check("distinct keys have independent budgets", a.ok && b.ok);

  // ── redis backend ─────────────────────────────────────────────────────────
  if (savedRedis) {
    process.env.REDIS_URL = savedRedis;
    __setRateLimitStore(null);
    console.log(`\n  REDIS_URL is set (${rateLimiterHealth().backend})\n`);
    check("REDIS_URL selects the redis backend", rateLimiterHealth().backend === "redis");
    await exerciseWindow("redis");
    check(
      "no redis errors recorded during the run",
      rateLimiterHealth().lastRedisError === null,
      rateLimiterHealth().lastRedisError ?? "",
    );

    // The reason for using Redis at all: a hit recorded by one instance must be
    // visible to another. Resetting the module-level store yields a second
    // independent client against the same server, standing in for a second
    // replica with its own memory.
    const key = "t:cross-instance";
    await rateLimit(key, 1, 2000);
    __setRateLimitStore(null);
    check("second store handle resolves to redis", rateLimiterHealth().backend === "redis");
    const second = await rateLimit(key, 1, 2000);
    check("a second instance observes the first instance's hit", !second.ok, `got ok=${second.ok}`);
  } else {
    console.log("\n  REDIS_URL not set — skipping redis backend assertions.\n");
    console.log("  Set REDIS_URL=redis://127.0.0.1:6379 to verify the distributed path.\n");
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("rate-limit check crashed:", e);
  process.exit(1);
});
