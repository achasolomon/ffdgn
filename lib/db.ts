import { PrismaClient } from "@prisma/client";

// Singleton — avoids exhausting MySQL connections during dev HMR.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** Null when DATABASE_URL is absent (preview builds) or MySQL unreachable. */
export async function dbReady(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
