import { dbReady } from "@/lib/db";
import { rateLimiterHealth } from "@/lib/rate-limit";

/**
 * Liveness/readiness probe for uptime monitors and container orchestrators.
 *
 * Unauthenticated by design: it exposes only whether MySQL is reachable, which
 * is not sensitive and is required for the probe to work before anyone has
 * signed in. Returns 503 when degraded so load balancers pull the instance.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const ready = await dbReady().catch(() => false);
  const limiter = rateLimiterHealth();
  // In-memory rate limiting means every instance enforces its own quota, which
  // is not a working brute-force control on a multi-replica deploy. Treat it as
  // degraded in production so a missing REDIS_URL is visible to monitoring
  // rather than discovered during an incident.
  const limiterMisconfigured = process.env.NODE_ENV === "production" && limiter.backend === "memory";
  const payload = {
    status: ready && !limiterMisconfigured ? "ok" : "degraded",
    db: ready ? "ready" : "unreachable",
    rateLimit: {
      backend: limiter.backend,
      ...(limiter.lastRedisError ? { lastError: limiter.lastRedisError } : {}),
      ...(limiterMisconfigured ? { warning: "REDIS_URL is not set; rate limits are per-instance" } : {}),
    },
    timestamp: new Date().toISOString(),
  };
  return new Response(JSON.stringify(payload, null, 2), {
    status: ready && !limiterMisconfigured ? 200 : 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}