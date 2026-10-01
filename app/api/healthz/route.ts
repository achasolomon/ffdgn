import { dbReady } from "@/lib/db";

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
  const payload = {
    status: ready ? "ok" : "degraded",
    db: ready ? "ready" : "unreachable",
    timestamp: new Date().toISOString(),
  };
  return new Response(JSON.stringify(payload, null, 2), {
    status: ready ? 200 : 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}