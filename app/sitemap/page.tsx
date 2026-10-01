import type { Metadata } from "next";
import { listDocs, listEvents, listMembers, listNews } from "@/lib/repo";

export default async function Sitemap() {
  const [events, news, documents, members] = await Promise.all([
    listEvents(), listNews(), listDocs(), listMembers(),
  ]);
  const urls = [
    "", "/about", "/about/history", "/about/governance", "/leadership", "/members",
    "/events", "/knowledge", "/news", "/committees", "/partnerships", "/contact",
    ...events.map((e) => `/events/${e.slug}`),
    ...news.map((n) => `/news/${n.slug}`),
    ...documents.filter((d) => d.visibility === "PUBLIC" && d.status === "Published").map((d) => `/knowledge/${d.slug}`),
    ...members.filter((m) => m.visibility === "PUBLIC").map((m) => `/members/${m.slug}`),
  ];
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <p className="eyebrow">Resources</p>
      <h1 className="font-display mt-2 text-4xl text-forest-950">Sitemap</h1>
      <ul className="mt-6 grid gap-1 text-sm md:grid-cols-2">
        {urls.map((u) => <li key={u}><a href={u || "/"} className="text-primary">ffdgn.org.ng{u || "/"}</a></li>)}
      </ul>
    </div>
  );
}

export const metadata: Metadata = { title: "Sitemap" };

export const revalidate = 300; // CMS-driven: refresh from MySQL every 5 minutes
