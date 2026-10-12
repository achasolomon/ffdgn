import { loadEnvConfig } from "@next/env";
import { Prisma } from "@prisma/client";

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const { db } = await import("../lib/db");
  try {
    const result = await db.conferenceImport.updateMany({ where: { state: "Preview", expiresAt: { lt: new Date() }, NOT: { rows: { equals: Prisma.DbNull } } }, data: { rows: Prisma.DbNull } });
    console.log(`Purged ${result.count} expired conference preview payloads.`);
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
