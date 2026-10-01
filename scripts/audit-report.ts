/**
 * Inspect the audit trail. Run: npx tsx scripts/audit-report.ts [limit]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const limit = Number(process.argv[2] ?? 30);

async function main() {
  const total = await prisma.auditLog.count();
  console.log(`total audit rows: ${total}\n`);
  const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  for (const r of rows) {
    console.log(
      `${r.createdAt.toISOString()}  ${r.action.padEnd(24)} ${String(r.resource).padEnd(30)} ${
        r.previousValue ? `[${r.previousValue} -> ${r.newValue}]` : (r.newValue ?? "")
      }`,
    );
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());