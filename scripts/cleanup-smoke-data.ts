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
  //
  // After `npm run db:harden` the app account has no DELETE on audit_log, which
  // is the point: the trail is append-only. That makes this cleanup impossible
  // through the app, so it is skipped with a count instead of crashing the whole
  // script and taking the contact cleanup above down with it. Removing test
  // rows is an administrative action:
  //   docker exec ffdgn-mysql mysql -uroot -p… ffdgn \
  //     -e "DELETE FROM audit_log WHERE action LIKE 'auth.login%' OR action LIKE 'media.%';"
  try {
    const audit = await prisma.auditLog.deleteMany({
      where: { OR: [{ action: { startsWith: "auth.login" } }, { action: { startsWith: "media." } }] },
    });
    console.log(`\ndeleted ${audit.count} test audit row(s)`);
  } catch {
    const count = await prisma.auditLog.count();
    console.log(
      `\nskipped test audit cleanup: this account cannot DELETE from audit_log (hardened grants).\n` +
        `  ${count} audit row(s) present. Test rows need an administrative delete; see the comment in this script.`,
    );
  }

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