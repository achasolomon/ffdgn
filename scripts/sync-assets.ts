/**
 * Syncs public/assets/* into the media library (MySQL).
 * Convention: filename (minus extension) = record slug.
 *   leadership/<member-slug>.jpg  → member portrait (profile + cards)
 *   events/<event-slug>.jpg        → event cover; other files → event gallery
 *   news/<news-slug>.jpg           → article lead image + thumbnails
 *   partnerships/<partner-slug>.png → partner logo (catalogued)
 *   gallery/*, hero/*              → catalogued (gallery / hero collections)
 *   videos/*.mp4                   → video archive (FILE provider)
 * Run: `npm run assets:sync`
 */
import { readdir, stat } from "node:fs/promises";
import { extname, join, basename } from "node:path";
import { db } from "../lib/db";

const ROOT = join(process.cwd(), "public", "assets");
const IMG_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
const VID_EXT = new Set([".mp4", ".webm"]);

async function filesIn(dir: string): Promise<string[]> {
  try {
    const names = await readdir(dir);
    const out: string[] = [];
    for (const n of names) {
      if (n === "README.md" || n.startsWith(".")) continue;
      const full = join(dir, n);
      if ((await stat(full)).isFile()) out.push(n);
    }
    return out.sort();
  } catch {
    return [];
  }
}

const slugOf = (file: string) => basename(file, extname(file)).toLowerCase();

async function main() {
  const live = !!process.env.DATABASE_URL;
  if (!live) {
    console.error("DATABASE_URL not set — nothing to sync.");
    process.exit(1);
  }
  let catalogued = 0, wired = 0;

  const upsertAsset = async (a: {
    title: string; kind: "IMAGE" | "VIDEO"; category: string; url: string;
    altText: string; eventId?: string | null;
  }) => {
    const existing = await db.mediaAsset.findFirst({ where: { url: a.url } });
    if (existing) {
      await db.mediaAsset.update({
        where: { id: existing.id },
        data: { title: a.title, kind: a.kind, category: a.category, altText: a.altText, eventId: a.eventId ?? null },
      });
    } else {
      await db.mediaAsset.create({
        data: {
          title: a.title, kind: a.kind, category: a.category, url: a.url,
          provider: a.kind === "VIDEO" ? "FILE" : null,
          photographer: "FFDGN Media Unit", copyright: "© FFDGN",
          altText: a.altText, eventId: a.eventId ?? null, visibility: "PUBLIC",
        },
      });
    }
    catalogued++;
  };

  const members = await db.member.findMany({ select: { id: true, slug: true, fullName: true } });
  const events = await db.forumEvent.findMany({ select: { id: true, slug: true, title: true } });
  const articles = await db.newsArticle.findMany({ select: { id: true, slug: true, title: true } });
  const memberBySlug = new Map(members.map((m) => [m.slug, m]));
  const eventBySlug = new Map(events.map((e) => [e.slug, e]));
  const newsBySlug = new Map(articles.map((n) => [n.slug, n]));

  // Leadership portraits
  for (const f of await filesIn(join(ROOT, "leadership"))) {
    if (!IMG_EXT.has(extname(f).toLowerCase())) continue;
    const url = `/assets/leadership/${f}`;
    const m = memberBySlug.get(slugOf(f));
    if (m) {
      await db.member.update({ where: { id: m.id }, data: { photoUrl: url } });
      wired++;
    }
    await upsertAsset({
      title: m ? `${m.fullName} — official portrait` : `Leadership photo ${slugOf(f)}`,
      kind: "IMAGE", category: "Portrait", url,
      altText: m ? `Portrait of ${m.fullName}` : `Leadership photograph`,
    });
  }

  // Event covers + gallery
  for (const f of await filesIn(join(ROOT, "events"))) {
    if (!IMG_EXT.has(extname(f).toLowerCase())) continue;
    const url = `/assets/events/${f}`;
    const e = eventBySlug.get(slugOf(f));
    if (e) {
      await db.forumEvent.update({ where: { id: e.id }, data: { coverUrl: url } });
      wired++;
    }
    await upsertAsset({
      title: e ? `${e.title} — photograph` : `Event photograph ${slugOf(f)}`,
      kind: "IMAGE", category: "Conference", url,
      altText: e ? `Photograph from ${e.title}` : "Forum event photograph",
      eventId: e?.id ?? null,
    });
  }

  // News images
  for (const f of await filesIn(join(ROOT, "news"))) {
    if (!IMG_EXT.has(extname(f).toLowerCase())) continue;
    const url = `/assets/news/${f}`;
    const n = newsBySlug.get(slugOf(f));
    if (n) {
      await db.newsArticle.update({ where: { id: n.id }, data: { imageUrl: url } });
      wired++;
    }
    await upsertAsset({
      title: n ? n.title : `Press image ${slugOf(f)}`,
      kind: "IMAGE", category: "Press", url, altText: n ? n.title : "Forum press photograph",
    });
  }

  // Partnership logos, hero, loose gallery, videos
  for (const f of await filesIn(join(ROOT, "partnerships"))) {
    if (!IMG_EXT.has(extname(f).toLowerCase())) continue;
    const url = `/assets/partnerships/${f}`;
    const existing = await db.partnership.findUnique({ where: { slug: slugOf(f) } });
    if (existing) {
      await db.partnership.update({ where: { id: existing.id }, data: { logoUrl: url } });
      wired++;
    }
    await upsertAsset({
      title: existing ? `${existing.name} — logo` : `Partner logo ${slugOf(f)}`,
      kind: "IMAGE", category: "Partner", url,
      altText: existing ? `Logo of ${existing.name}` : "Partner organisation logo",
    });
  }
  for (const f of await filesIn(join(ROOT, "hero"))) {
    if (!IMG_EXT.has(extname(f).toLowerCase())) continue;
    await upsertAsset({
      title: "Homepage hero visual", kind: "IMAGE", category: "Hero",
      url: `/assets/hero/${f}`, altText: "Forum of Former Deputy Governors of Nigeria",
    });
  }
  for (const f of await filesIn(join(ROOT, "gallery"))) {
    if (!IMG_EXT.has(extname(f).toLowerCase())) continue;
    await upsertAsset({
      title: `Gallery photograph ${slugOf(f)}`, kind: "IMAGE", category: "Archive",
      url: `/assets/gallery/${f}`, altText: "Forum photograph",
    });
  }
  for (const f of await filesIn(join(ROOT, "videos"))) {
    if (!VID_EXT.has(extname(f).toLowerCase())) continue;
    await upsertAsset({
      title: `Video ${slugOf(f).replace(/-/g, " ")}`, kind: "VIDEO", category: "Conference",
      url: `/assets/videos/${f}`, altText: "Forum video recording",
    });
  }
  for (const f of await filesIn(join(ROOT, "brand"))) {
    if (!IMG_EXT.has(extname(f).toLowerCase())) continue;
    await upsertAsset({
      title: `Brand asset ${slugOf(f)}`, kind: "IMAGE", category: "Brand",
      url: `/assets/brand/${f}`, altText: "FFDGN brand asset",
    });
  }

  console.log(JSON.stringify({ catalogued, wired }));
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try { await db.$disconnect(); } catch { /* noop */ }
  process.exit(1);
});
