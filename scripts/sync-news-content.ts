/**
 * One-off content repair: refresh news article bodies from lib/data.ts.
 * Bodies were previously truncated mid-sentence in the seed baseline.
 * Run: npx tsx scripts/sync-news-content.ts
 */
import { PrismaClient } from "@prisma/client";
import { news } from "../lib/data";

const prisma = new PrismaClient();

async function main() {
  let updated = 0;
  for (const n of news) {
    const body = n.body.join("\n\n");
    const res = await prisma.newsArticle.updateMany({
      where: { slug: n.slug, body },
      data: { body },
    });
    if (res.count === 0) {
      await prisma.newsArticle.update({ where: { slug: n.slug }, data: { body } });
      updated += 1;
      console.log(`updated: ${n.slug}`);
    }
  }
  console.log(`news bodies synchronised (${updated} changed)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
