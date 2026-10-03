import { PrismaClient } from "@prisma/client";

// Singleton — avoids exhausting MySQL connections during dev HMR.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** How long a healthy result is trusted before re-probing. */
const TTL_MS = 15_000;

/** How long a failure is remembered before a retry is permitted. */
const FAILURE_BACKOFF_MS = 5_000;

type Probe = { result: boolean; at: number };

/**
 * `dbReady()` used to issue `SELECT 1` on every call. Several pages call it many
 * times per render — the homepage alone reaches it through a dozen repo
 * functions — so one request could spend a dozen round trips establishing a
 * connection that was already open.
 *
 * The result is cached for a few seconds instead. The TTL is short on purpose: a
 * cached `true` that outlived a database restart would serve the console a blank
 * page, and a cached `false` would hide content from visitors, for that window.
 * Seconds is the right order of magnitude for reconnection, and far cheaper than
 * a round trip per call.
 */
const globalForProbe = globalThis as unknown as {
  prismaProbe?: Probe;
  /** In-flight probe, shared so concurrent callers issue one `SELECT 1`. */
  prismaProbePending?: Promise<boolean>;
};

async function probe(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Null when DATABASE_URL is absent (preview builds) or MySQL unreachable.
 *
 * A caller that receives `false` cannot tell "the database is down" from "the
 * first 50 ms of a recovery have not elapsed yet"; treat it as down and render
 * the same way either way.
 */
export function dbReady(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return Promise.resolve(false);

  const now = Date.now();
  const cached = globalForProbe.prismaProbe;
  if (cached) {
    const window = cached.result ? TTL_MS : FAILURE_BACKOFF_MS;
    if (now - cached.at < window) return Promise.resolve(cached.result);
  }
  if (globalForProbe.prismaProbePending) return globalForProbe.prismaProbePending;

  const pending = probe().then((result) => {
    globalForProbe.prismaProbe = { result, at: Date.now() };
    globalForProbe.prismaProbePending = undefined;
    return result;
  });
  globalForProbe.prismaProbePending = pending;
  return pending;
}

/**
 * Uncached probe, for `/api/healthz` only.
 *
 * The health endpoint exists to report what is true at this instant. Serving it
 * from the cache would mean a load balancer keeps an instance in rotation for up
 * to 15 s after MySQL went away, or evicts a healthy instance for 5 s during a
 * brief blip — both decisions made on information that is already out of date.
 */
export function dbLive(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return Promise.resolve(false);
  return probe();
}

/** Test seam: force the next `dbReady()` call to probe. */
export function resetDbProbe(): void {
  globalForProbe.prismaProbe = undefined;
  globalForProbe.prismaProbePending = undefined;
}
