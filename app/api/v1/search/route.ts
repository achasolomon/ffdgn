import { institutionalSearch } from "@/lib/search";
import { db, dbReady, fail, failFrom, ok } from "../_lib";

/** GET /api/v1/search?q= — public records only; member-restricted hits stay in the portal. */
export async function GET(req: Request) {
  try {
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
    if (!q) return fail("VALIDATION", "Query parameter 'q' is required.", 422);

    if (await dbReady()) {
      const [members, events, docs, news] = await Promise.all([
        db.member.findMany({ where: { visibility: "PUBLIC", OR: [{ fullName: { contains: q } }, { title: { contains: q } }] }, take: 10, select: { slug: true, fullName: true, title: true } }),
        db.forumEvent.findMany({ where: { OR: [{ title: { contains: q } }, { theme: { contains: q } }] }, take: 10, select: { slug: true, title: true, theme: true, city: true } }),
        db.knowledgeDoc.findMany({ where: { status: "Published", visibility: "PUBLIC", OR: [{ title: { contains: q } }, { topic: { contains: q } }] }, take: 10, select: { slug: true, title: true, type: true, year: true } }),
        db.newsArticle.findMany({ where: { OR: [{ title: { contains: q } }, { excerpt: { contains: q } }] }, take: 10, select: { slug: true, title: true, category: true, date: true } }),
      ]);
      return ok({
        Members: members.map((m) => ({ kind: "Members", title: m.fullName, subtitle: m.title, href: `/members/${m.slug}` })),
        Events: events.map((e) => ({ kind: "Events", title: e.title, subtitle: `${e.theme} · ${e.city}`, href: `/events/${e.slug}` })),
        Publications: docs.map((d) => ({ kind: "Publications", title: d.title, subtitle: `${String(d.type).replace(/_/g, " ")} · ${d.year}`, href: `/knowledge/${d.slug}` })),
        News: news.map((n) => ({ kind: "News", title: n.title, subtitle: `${n.category} · ${new Date(n.date).toISOString().slice(0, 10)}`, href: `/news/${n.slug}` })),
        Committees: [],
        Partnerships: [],
      }, { source: "mysql" });
    }
    return ok(institutionalSearch(q));
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
