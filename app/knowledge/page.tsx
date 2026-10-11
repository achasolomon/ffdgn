import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, Search } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, EmptyState, Reveal } from "@/components/ui";
import { listDocs } from "@/lib/repo";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getTemplateCopy("page-knowledge");

 const authored = await websiteMetadata("/knowledge");
 return authored ?? { title: copy("field-001") };
}
export default async function KnowledgePage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string; year?: string; sort?: string }> }) {
  const copy = await getTemplateCopy("page-knowledge");

  const managed = await managedWebsitePage("/knowledge");
  if (managed) return managed;

  const params = await searchParams;
  const type = params.type ?? "", year = params.year ?? "";
  const sort = params.sort === "downloads" ? "downloads" : "newest";
  const q = (params.q ?? "").trim().toLowerCase();
  const publications = (await listDocs()).filter(d => d.status === "Published" && d.visibility === "PUBLIC");
  const years = [...new Set(publications.map(d => d.year))].sort((a,b) => b-a);
  const types = [...new Set(publications.map(d => d.type))].sort();
  const topics = [...new Set(publications.map(d => d.topic))].filter(Boolean).sort();
  const filtered = publications.filter(d => (!type || d.type === type) && (!year || String(d.year) === year) && (!q || `${d.title} ${d.topic} ${d.author}`.toLowerCase().includes(q))).sort((a,b) => sort === "downloads" ? b.downloads-a.downloads : b.year-a.year || b.published.localeCompare(a.published));
  const featured = !type && !year && !q && sort === "newest" ? filtered[0] : undefined;
  return <div className="knowledge-page mx-auto max-w-shell px-5 py-12">
    <Breadcrumbs items={[{ label: copy("field-001") }]} />
    <section className="knowledge-intro"><SectionHeading as="h1" eyebrow={copy("field-002")} title={copy("field-003")} lede={copy("field-004")} /><a href={templateRoute(copy("field-005"))} className="portrait-link">{copy("field-006")}<ArrowRight size={18} /></a><dl className="knowledge-totals"><div><dt>{copy("field-007")}</dt><dd>{publications.length}</dd></div><div><dt>{copy("field-008")}</dt><dd>{types.length}</dd></div><div><dt>{copy("field-009")}</dt><dd>{topics.length}</dd></div></dl></section>
    {featured && <Reveal><article className="knowledge-feature"><div className="knowledge-feature-mark" aria-hidden><span>{copy("field-010")}</span><p>{copy("field-011")}<br />{copy("field-012")}</p><span>{featured.year} {copy("field-013")}{featured.type}</span></div><div className="knowledge-feature-copy"><p className="eyebrow-light">{copy("field-014")}{featured.type}</p><h2 className="font-display"><Link href={`/knowledge/${featured.slug}`}>{featured.title}</Link></h2><p>{featured.summary}</p><p className="knowledge-byline">{featured.author} {copy("field-015")}{featured.year}</p><Link href={`/knowledge/${featured.slug}`} className="portrait-link">{copy("field-016")}<ArrowRight size={17} /></Link>{featured.fileUrl && <a href={featured.fileUrl} download className="knowledge-download"><Download size={16} /> {copy("field-017")}</a>}</div></article></Reveal>}
    <section className="knowledge-collections" aria-labelledby="collection-title"><p className="eyebrow">{copy("field-018")}</p><h2 id="collection-title" className="font-display">{copy("field-019")}</h2><div>{types.map((collection,index) => <Link key={collection} href={`/knowledge?type=${encodeURIComponent(collection)}#library`} aria-current={type === collection ? "page" : undefined}><span className="collection-number">{String(index+1).padStart(2,"0")}</span><span><strong>{collection}</strong><small>{publications.filter(d => d.type === collection).length} {copy("field-020")}{publications.filter(d => d.type === collection).length === 1 ? "" : copy("field-021")}</small></span><ArrowRight size={18} /></Link>)}</div></section>
    <section id="library" className="knowledge-library" aria-labelledby="library-title"><div className="knowledge-library-heading"><p className="eyebrow">{copy("field-022")}</p><h2 id="library-title" className="font-display">{copy("field-023")}</h2></div>
      <form className="knowledge-search" role="search" aria-label={copy("field-024")} action="/knowledge#library"><div><label htmlFor="kq">{copy("field-025")}</label><input id="kq" name="q" defaultValue={params.q ?? ""} placeholder={copy("field-026")} /></div><div><label htmlFor="kt">{copy("field-027")}</label><select id="kt" name="type" defaultValue={type}><option value="">{copy("field-028")}</option>{types.map(t => <option key={t}>{t}</option>)}</select></div><div><label htmlFor="ky">{copy("field-029")}</label><select id="ky" name="year" defaultValue={year}><option value="">{copy("field-030")}</option>{years.map(y => <option key={y}>{y}</option>)}</select></div><div><label htmlFor="ks">{copy("field-031")}</label><select id="ks" name="sort" defaultValue={sort}><option value="newest">{copy("field-032")}</option><option value="downloads">{copy("field-033")}</option></select></div><button type="submit"><Search size={16} /> {copy("field-034")}</button></form>
      <div className="knowledge-topics" aria-label={copy("field-035")}>{topics.map(topic => <Link key={topic} href={`/knowledge?q=${encodeURIComponent(topic)}#library`}>{topic}</Link>)}</div>
      <div className="directory-status"><p role="status">{copy("field-036")}{filtered.length} {copy("field-037")}{publications.length} {copy("field-038")}</p>{(type || year || q || sort !== "newest") && <Link href={templateRoute(copy("field-039"))}>{copy("field-040")}</Link>}</div>
      {filtered.length ? <ul className="publication-grid">{filtered.map(d => <li key={d.slug}><article className="publication-card"><p className="eyebrow">{d.type} {copy("field-013")}{d.year}</p><h3 className="font-display"><Link href={`/knowledge/${d.slug}`}>{d.title}</Link></h3><p className="publication-summary">{d.summary}</p><p className="publication-author">{d.author}</p><div className="publication-footer"><span>{d.topic}</span><Link href={`/knowledge/${d.slug}`}>{copy("field-041")}<ArrowRight size={15} /></Link></div><p className="publication-file">{d.fileUrl ? copy("field-051", {value1: d.pages, value2: d.size}) : copy("field-042")}</p></article></li>)}</ul> : <EmptyState title={copy("field-043")} description={copy("field-044")} href={templateRoute(copy("field-045"))} actionLabel="View all publications" />}
    </section>
    <div className="knowledge-member-access"><div><p className="eyebrow-light">{copy("field-046")}</p><h2 className="font-display">{copy("field-047")}</h2><p>{copy("field-048")}</p></div><Link href={templateRoute(copy("field-049"))} className="portrait-link">{copy("field-050")}<ArrowRight size={18} /></Link></div>
  </div>;
}
export const revalidate = 300;
