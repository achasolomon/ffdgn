import { getTemplateCopy } from "@/lib/template-repo";
import type { Metadata } from "next";
import { listDocs, listEvents, listMembers, listNews } from "@/lib/repo";
import { listPublishedWebsitePages } from "@/lib/website-repo";

export default async function Sitemap() {
  const copy = await getTemplateCopy("page-sitemap");

  const [events, news, documents, members, pages] = await Promise.all([
    listEvents(), listNews(), listDocs(), listMembers(), listPublishedWebsitePages(),
  ]);
  const urls = [
    "", copy("field-001"), copy("field-002"), copy("field-003"), copy("field-004"), copy("field-005"),
    copy("field-006"), copy("field-007"), copy("field-008"), copy("field-009"), copy("field-010"), copy("field-011"),  copy("field-012"),
    copy("field-013"), copy("field-014"), copy("field-015"),
    ...events.map((e) => `/events/${e.slug}`),
    ...news.map((n) => `/news/${n.slug}`),
    ...documents.filter((d) => d.visibility === "PUBLIC" && d.status === "Published").map((d) => `/knowledge/${d.slug}`),
    ...members.filter((m) => m.visibility === "PUBLIC").map((m) => `/members/${m.slug}`),
    ...pages.map(({ page }) => page.path === "/" ? "" : page.path),
  ];
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <p className="eyebrow">{copy("field-016")}</p>
      <h1 className="font-display mt-2 text-4xl text-forest-950">{copy("field-017")}</h1>
      <ul className="mt-6 grid gap-1 text-sm md:grid-cols-2">
        {[...new Set(urls)].map((u) => <li key={u}><a href={u || "/"} className="text-primary">{copy("field-018")}{u || copy("field-019")}</a></li>)}
      </ul>
    </div>
  );
}

export const metadata: Metadata = { title: "Sitemap" };

export const revalidate = 300; // CMS-driven: refresh from MySQL every 5 minutes
