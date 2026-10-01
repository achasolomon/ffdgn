/**
 * Check whether any media asset references a file in public/assets/videos.
 * Run: npx tsx scripts/check-video-refs.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const refs = await prisma.mediaAsset.findMany({
    where: { OR: [{ url: { contains: "assets/videos" } }, { url: { endsWith: ".mp4" } }] },
    select: { id: true, title: true, url: true, visibility: true },
  });
  console.log(`media assets referencing local video files: ${refs.length}`);
  for (const r of refs) console.log(`  ${r.title}  ${r.url}  (${r.visibility})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());