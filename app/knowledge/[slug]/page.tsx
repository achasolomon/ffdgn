import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Download, Quote } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { Reveal } from "@/components/ui";
import { getCommitteesMap, getDocRepo, getEventTitles, listDocs } from "@/lib/repo";
import { formatDate } from "@/lib/search";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
 const authored = await websiteMetadata(`/knowledge/${(await params).slug}`);
 if (authored) return authored;

  const d = await getDocRepo((await params).slug);
  return { title: d?.visibility === "PUBLIC" && d.status === "Published" ? d.title : "Publication" };
}
export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const copy = await getTemplateCopy("page-knowledge-slug");

  const managed = await managedWebsitePage(`/knowledge/${(await params).slug}`);
  if (managed) return managed;

  const d = await getDocRepo((await params).slug);
  if (!d || d.visibility !== "PUBLIC" || d.status !== "Published") notFound();
  const [eventTitles, committees, all] = await Promise.all([getEventTitles(d.event ? [d.event] : []), getCommitteesMap(), listDocs()]);
  const publicDocs = all.filter(x => x.slug !== d.slug && x.status === "Published" && x.visibility === "PUBLIC");
  const related = publicDocs.sort((a,b) => Number(b.topic === d.topic)-Number(a.topic === d.topic) || Number(b.type === d.type)-Number(a.type === d.type) || b.published.localeCompare(a.published)).slice(0,3);
  const citation = `${d.author} (${d.year}). ${d.title}. Forum of Former Deputy Governors of Nigeria, Knowledge Centre.`;
  return <div className="publication-page mx-auto max-w-shell px-5 py-12">
    <Breadcrumbs items={[{ label: copy("field-001"), href: templateRoute(copy("field-002")) }, { label: d.title }]} />
    <header className="document-header"><p className="eyebrow-light">{copy("field-003")}{d.type}</p><h1 className="font-display">{d.title}</h1><div className="document-byline"><span>{d.author}</span><span>{formatDate(d.published)}</span>{d.topic && <Link href={`/knowledge?q=${encodeURIComponent(d.topic)}#library`}>{d.topic}</Link>}</div></header>
    <div className="document-layout">
      <div className="document-reading"><section aria-labelledby="summary-title" id="summary"><Reveal><p className="eyebrow">{copy("field-004")}</p><h2 id="summary-title" className="font-display">{copy("field-005")}</h2><div className="document-summary">{d.summary.trim() ? d.summary.split(/\n\s*\n/).map((paragraph,i) => <p key={i}>{paragraph}</p>) : <p>{copy("field-006")}</p>}</div></Reveal></section>
        <section className="document-context" aria-labelledby="context-title"><Reveal><p className="eyebrow">{copy("field-007")}</p><h2 id="context-title" className="font-display">{copy("field-008")}</h2><dl><div><dt>{copy("field-009")}</dt><dd>{d.author}</dd></div><div><dt>{copy("field-010")}</dt><dd>{formatDate(d.published)}</dd></div>{d.event && eventTitles.get(d.event) && <div><dt>{copy("field-011")}</dt><dd><Link href={`/events/${d.event}`}>{eventTitles.get(d.event)} <ArrowRight size={15} /></Link></dd></div>}{d.committee && <div><dt>{copy("field-012")}</dt><dd><Link href={templateRoute(copy("field-013"))}>{committees.get(d.committee) ?? d.committee} <ArrowRight size={15} /></Link></dd></div>}</dl></Reveal></section>
        <section className="document-citation" aria-labelledby="citation-title"><Quote size={28} aria-hidden /><p className="eyebrow">{copy("field-014")}</p><h2 id="citation-title" className="font-display">{copy("field-015")}</h2><p>{citation}</p></section>
      </div>
      <aside className="document-sidebar" aria-label={copy("field-016")}><div className="document-access"><p className="eyebrow-light">{copy("field-017")}</p><div className="document-cover" aria-hidden><span>{copy("field-018")}</span><p className="font-display">{d.type}</p><span>{d.year}</span></div><h2 className="font-display">{d.fileUrl ? copy("field-019") : copy("field-020")}</h2>{d.fileUrl ? <><p>{copy("field-021")}</p><a href={d.fileUrl} download className="document-download"><Download size={17} /> {copy("field-022")}</a></> : <p>{copy("field-023")}</p>}<dl className="document-file-facts">{[[copy("field-024"),d.type],[copy("field-025"),String(d.year)],[copy("field-026"),String(d.pages)],[copy("field-027"),d.size],[copy("field-028"),d.downloads.toLocaleString()]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div><Link href={`/knowledge?type=${encodeURIComponent(d.type)}#library`} className="document-collection-link">{copy("field-029")}<ArrowRight size={16} /></Link></aside>
    </div>
    {related.length > 0 && <section className="document-related" aria-labelledby="related-title"><p className="eyebrow">{copy("field-030")}</p><h2 id="related-title" className="font-display">{copy("field-031")}</h2><div>{related.map(r => <article key={r.slug}><p className="eyebrow">{r.type} {copy("field-032")}{r.year}</p><h3 className="font-display"><Link href={`/knowledge/${r.slug}`}>{r.title}</Link></h3><p>{r.summary}</p><Link href={`/knowledge/${r.slug}`} className="portrait-link">{copy("field-033")}<ArrowRight size={16} /></Link></article>)}</div></section>}
    <Link href={templateRoute(copy("field-002"))} className="document-back"><ArrowLeft size={17} /> {copy("field-034")}</Link>
  </div>;
}
export const revalidate = 300;
