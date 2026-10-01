/**
 * Remove smoke-test submissions from the contact inbox.
 * Run: npx tsx scripts/cleanup-smoke-data.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.contactMessage.findMany({
    where: { email: { endsWith: "@example.com" }, name: { in: ["Smoke Test", "Bot"] } },
    select: { id: true, name: true, subject: true },
  });
  console.log(`found ${messages.length} smoke-test message(s)`);
  for (const m of messages) console.log(`  ${m.id}  ${m.name} — ${m.subject}`);

  const deleted = await prisma.contactMessage.deleteMany({
    where: { email: { endsWith: "@example.com" }, name: { in: ["Smoke Test", "Bot"] } },
  });
  console.log(`deleted ${deleted.count}`);

  const remaining = await prisma.contactMessage.count();
  console.log(`contact_messages rows remaining: ${remaining}`);

  // Media fixtures created by earlier upload smoke tests.
  const assets = await prisma.mediaAsset.findMany({
    where: { title: { contains: "SMOKE" } },
    select: { id: true, title: true, url: true },
  });
  if (assets.length > 0) {
    console.log(`\nfound ${assets.length} SMOKE media asset(s)`);
    for (const a of assets) console.log(`  ${a.id}  ${a.title}  ${a.url}`);
    const removed = await prisma.mediaAsset.deleteMany({ where: { title: { contains: "SMOKE" } } });
    console.log(`deleted ${removed.count}`);
  }

  // Audit rows describing test activity — keep genuine baseline entries.
  const audit = await prisma.auditLog.deleteMany({
    where: { OR: [{ action: { startsWith: "auth.login" } }, { action: { startsWith: "media." } }] },
  });
  console.log(`\ndeleted ${audit.count} test audit row(s)`);

  const finalAudit = await prisma.auditLog.count();
  console.log(`audit rows remaining: ${finalAudit}`);

  const mediaCount = await prisma.mediaAsset.count();
  const uploads = await prisma.mediaAsset.findMany({
    where: { url: { startsWith: "/uploads/" } },
    select: { id: true, title: true, url: true },
  });
  console.log(`\nmedia assets: ${mediaCount} total, ${uploads.length} served from /uploads`);
  for (const a of uploads) console.log(`  ${a.title}  ${a.url}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());