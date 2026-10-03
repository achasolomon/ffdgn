import { dbLive } from "@/lib/db";
import { probeRateLimiter } from "@/lib/rate-limit";

/**
 * Liveness/readiness probe for uptime monitors and container orchestrators.
 *
 * Unauthenticated by design: it exposes only whether MySQL is reachable, which
 * is not sensitive and is required for the probe to work before anyone has
 * signed in. Returns 503 when degraded so load balancers pull the instance.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  // Both dependencies are probed live rather than read from the short-lived
  // `dbReady()` cache, so the answer reflects now. A cache would let a load
  // balancer act on a database state from up to fifteen seconds ago.
  const ready = await dbLive().catch(() => false);
  const limiter = await probeRateLimiter();
  // In-memory rate limiting means every instance enforces its own quota, which
  // is not a working brute-force control on a multi-replica deploy. Treat it as
  // degraded in production so a missing REDIS_URL is visible to monitoring
  // rather than discovered during an incident.
  const limiterMisconfigured = process.env.NODE_ENV === "production" && limiter.backend === "memory";

  // Redis is configured but not answering. The limiter is failing open, so
  // requests still succeed and DB lockout still protects the login path — the
  // instance is working, just degraded. Reporting 503 here would make an
  // orchestrator restart every replica during a Redis blip, which does not fix
  // Redis and drops capacity exactly when the fleet is already impaired. Redis
  // being *unconfigured* is different: that is a misconfiguration to catch.
  const limiterDown = !limiter.reachable;

  const healthy = ready && !limiterMisconfigured;
  const payload = {
    status: healthy && !limiterDown ? "ok" : "degraded",
    db: ready ? "ready" : "unreachable",
    rateLimit: {
      backend: limiter.backend,
      ...(limiter.error ? { lastError: limiter.error } : {}),
      ...(limiterMisconfigured ? { warning: "REDIS_URL is not set; rate limits are per-instance" } : {}),
      ...(limiterDown
        ? {
            warning:
              "REDIS_URL is set but Redis is unreachable; requests are allowed (fail-open) and " +
              "rate limits are not being enforced",
          }
        : {}),
    },
    timestamp: new Date().toISOString(),
  };
  return new Response(JSON.stringify(payload, null, 2), {
    status: healthy ? 200 : 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}