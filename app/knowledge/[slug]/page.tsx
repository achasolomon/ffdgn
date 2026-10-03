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
  const managed = await managedWebsitePage(`/knowledge/${(await params).slug}`);
  if (managed) return managed;

  const d = await getDocRepo((await params).slug);
  if (!d || d.visibility !== "PUBLIC" || d.status !== "Published") notFound();
  const [eventTitles, committees, all] = await Promise.all([getEventTitles(d.event ? [d.event] : []), getCommitteesMap(), listDocs()]);
  const publicDocs = all.filter(x => x.slug !== d.slug && x.status === "Published" && x.visibility === "PUBLIC");
  const related = publicDocs.sort((a,b) => Number(b.topic === d.topic)-Number(a.topic === d.topic) || Number(b.type === d.type)-Number(a.type === d.type) || b.published.localeCompare(a.published)).slice(0,3);
  const citation = `${d.author} (${d.year}). ${d.title}. Forum of Former Deputy Governors of Nigeria, Knowledge Centre.`;
  return <div className="publication-page mx-auto max-w-shell px-5 py-12">
    <Breadcrumbs items={[{ label: "Knowledge Centre", href: "/knowledge" }, { label: d.title }]} />
    <header className="document-header"><p className="eyebrow-light">Policy & Knowledge / {d.type}</p><h1 className="font-display">{d.title}</h1><div className="document-byline"><span>{d.author}</span><span>{formatDate(d.published)}</span>{d.topic && <Link href={`/knowledge?q=${encodeURIComponent(d.topic)}#library`}>{d.topic}</Link>}</div></header>
    <div className="document-layout">
      <div className="document-reading"><section aria-labelledby="summary-title" id="summary"><Reveal><p className="eyebrow">01 / Overview</p><h2 id="summary-title" className="font-display">About this publication</h2><div className="document-summary">{d.summary.trim() ? d.summary.split(/\n\s*\n/).map((paragraph,i) => <p key={i}>{paragraph}</p>) : <p>A summary of this publication has not yet been published.</p>}</div></Reveal></section>
        <section className="document-context" aria-labelledby="context-title"><Reveal><p className="eyebrow">02 / Publication context</p><h2 id="context-title" className="font-display">From the Forum’s work</h2><dl><div><dt>Issued by</dt><dd>{d.author}</dd></div><div><dt>Published</dt><dd>{formatDate(d.published)}</dd></div>{d.event && eventTitles.get(d.event) && <div><dt>Related event</dt><dd><Link href={`/events/${d.event}`}>{eventTitles.get(d.event)} <ArrowRight size={15} /></Link></dd></div>}{d.committee && <div><dt>Originating committee</dt><dd><Link href="/committees">{committees.get(d.committee) ?? d.committee} <ArrowRight size={15} /></Link></dd></div>}</dl></Reveal></section>
        <section className="document-citation" aria-labelledby="citation-title"><Quote size={28} aria-hidden /><p className="eyebrow">Reference this work</p><h2 id="citation-title" className="font-display">Suggested citation</h2><p>{citation}</p></section>
      </div>
      <aside className="document-sidebar" aria-label="Publication access and information"><div className="document-access"><p className="eyebrow-light">The publication</p><div className="document-cover" aria-hidden><span>FFDGN / Knowledge Centre</span><p className="font-display">{d.type}</p><span>{d.year}</span></div><h2 className="font-display">{d.fileUrl ? "Read the full publication" : "Publication record"}</h2>{d.fileUrl ? <><p>Download the full PDF to read, save or reference this publication.</p><a href={d.fileUrl} download className="document-download"><Download size={17} /> Download PDF</a></> : <p>The publication details are available here. The full PDF has not yet been added to the library.</p>}<dl className="document-file-facts">{[["Collection",d.type],["Year",String(d.year)],["Pages",String(d.pages)],["File size",d.size],["Downloads",d.downloads.toLocaleString()]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div><Link href={`/knowledge?type=${encodeURIComponent(d.type)}#library`} className="document-collection-link">Explore this collection <ArrowRight size={16} /></Link></aside>
    </div>
    {related.length > 0 && <section className="document-related" aria-labelledby="related-title"><p className="eyebrow">Continue reading</p><h2 id="related-title" className="font-display">More from the Knowledge Centre</h2><div>{related.map(r => <article key={r.slug}><p className="eyebrow">{r.type} / {r.year}</p><h3 className="font-display"><Link href={`/knowledge/${r.slug}`}>{r.title}</Link></h3><p>{r.summary}</p><Link href={`/knowledge/${r.slug}`} className="portrait-link">Explore publication <ArrowRight size={16} /></Link></article>)}</div></section>}
    <Link href="/knowledge" className="document-back"><ArrowLeft size={17} /> Back to the Knowledge Centre</Link>
  </div>;
}
export const revalidate = 300;
