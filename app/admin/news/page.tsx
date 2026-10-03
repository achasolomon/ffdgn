import Link from "next/link";
import { AdminNewsManager } from "@/components/admin-news-manager";
import { db, dbReady } from "@/lib/db";
import { getAuth } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";

export default async function AdminNewsPage() {
  const auth = await getAuth();
  if (!auth || !hasPermission(auth.user.role, "news.publish")) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">News desk</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#1c3526]">Access unavailable</h1>
        <p className="mt-2 text-sm text-[#69776d]">News management requires the news publishing capability.</p>
        <Link href="/admin" className="mt-5 inline-flex text-sm font-semibold text-[#23613f]">Back to overview</Link>
      </div>
    );
  }

  const live = await dbReady();
  const [rows, events, docs] = live
    ? await Promise.all([
        db.newsArticle.findMany({
          include: { event: { select: { slug: true } }, linkedDocs: { include: { doc: { select: { slug: true } } } } },
          orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
          take: 100,
        }),
        db.forumEvent.findMany({ orderBy: { startDate: "desc" }, select: { slug: true } }),
        db.knowledgeDoc.findMany({ orderBy: { title: "asc" }, select: { slug: true } }),
      ])
    : [[], [], []];

  const articles = rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    category: row.category,
    date: row.date.toISOString().slice(0, 10),
    location: row.location,
    excerpt: row.excerpt,
    body: row.body,
    imageUrl: row.imageUrl ?? "",
    relatedEvent: row.event?.slug ?? "",
    relatedDocs: row.linkedDocs.map((link) => link.doc.slug),
    status: row.status,
    official: row.official,
  }));

  return (
    <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Publishing / News</p>
          <h1 className="mt-1.5 text-[26px] font-semibold tracking-normal text-[#1c3526]">News desk</h1>
          <p className="mt-1 text-[13px] text-[#738077]">Create, review, publish, or archive official communications.</p>
        </div>
        <p className="border border-[#dce2dc] bg-white px-3 py-2 text-[11px] font-medium text-[#68756b]">{rows.filter((row) => row.status === "Published").length} live · {rows.filter((row) => row.status === "Draft").length} drafts</p>
      </div>
      {!live && <p role="alert" className="mb-5 border border-[#e4d3a8] bg-[#fffaf0] px-4 py-3 text-[13px] text-[#755b23]">MySQL is unavailable. Connect the database to manage articles.</p>}
      <AdminNewsManager articles={articles} eventSlugs={events.map((event) => event.slug)} documentSlugs={docs.map((doc) => doc.slug)} />
    </div>
  );
}