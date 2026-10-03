import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, Search } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, EmptyState, Reveal } from "@/components/ui";
import { listDocs } from "@/lib/repo";

export async function generateMetadata(): Promise<Metadata> {
 const authored = await websiteMetadata("/knowledge");
 return authored ?? { title: "Policy & Knowledge" };
}
export default async function KnowledgePage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string; year?: string; sort?: string }> }) {
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
    <Breadcrumbs items={[{ label: "Policy & Knowledge" }]} />
    <section className="knowledge-intro"><SectionHeading as="h1" eyebrow="Policy & knowledge" title="Experience informing better governance." lede="Explore the Forum’s policy briefs, conference outcomes and research. A growing library of ideas and evidence for Nigeria’s public institutions." /><a href="#library" className="portrait-link">Explore the library <ArrowRight size={18} /></a><dl className="knowledge-totals"><div><dt>Publications</dt><dd>{publications.length}</dd></div><div><dt>Collections</dt><dd>{types.length}</dd></div><div><dt>Topics</dt><dd>{topics.length}</dd></div></dl></section>
    {featured && <Reveal><article className="knowledge-feature"><div className="knowledge-feature-mark" aria-hidden><span>FFDGN</span><p>Policy<br />& Knowledge</p><span>{featured.year} / {featured.type}</span></div><div className="knowledge-feature-copy"><p className="eyebrow-light">Latest publication / {featured.type}</p><h2 className="font-display"><Link href={`/knowledge/${featured.slug}`}>{featured.title}</Link></h2><p>{featured.summary}</p><p className="knowledge-byline">{featured.author} · {featured.year}</p><Link href={`/knowledge/${featured.slug}`} className="portrait-link">Read publication details <ArrowRight size={17} /></Link>{featured.fileUrl && <a href={featured.fileUrl} download className="knowledge-download"><Download size={16} /> Download PDF</a>}</div></article></Reveal>}
    <section className="knowledge-collections" aria-labelledby="collection-title"><p className="eyebrow">Explore the collection</p><h2 id="collection-title" className="font-display">Ideas, outcomes and evidence.</h2><div>{types.map((collection,index) => <Link key={collection} href={`/knowledge?type=${encodeURIComponent(collection)}#library`} aria-current={type === collection ? "page" : undefined}><span className="collection-number">{String(index+1).padStart(2,"0")}</span><span><strong>{collection}</strong><small>{publications.filter(d => d.type === collection).length} publication{publications.filter(d => d.type === collection).length === 1 ? "" : "s"}</small></span><ArrowRight size={18} /></Link>)}</div></section>
    <section id="library" className="knowledge-library" aria-labelledby="library-title"><div className="knowledge-library-heading"><p className="eyebrow">The Knowledge Centre</p><h2 id="library-title" className="font-display">Find a publication</h2></div>
      <form className="knowledge-search" role="search" aria-label="Search publications" action="/knowledge#library"><div><label htmlFor="kq">Title, topic or author</label><input id="kq" name="q" defaultValue={params.q ?? ""} placeholder="What are you looking for?" /></div><div><label htmlFor="kt">Collection</label><select id="kt" name="type" defaultValue={type}><option value="">All collections</option>{types.map(t => <option key={t}>{t}</option>)}</select></div><div><label htmlFor="ky">Year</label><select id="ky" name="year" defaultValue={year}><option value="">All years</option>{years.map(y => <option key={y}>{y}</option>)}</select></div><div><label htmlFor="ks">Sort by</label><select id="ks" name="sort" defaultValue={sort}><option value="newest">Newest first</option><option value="downloads">Most downloaded</option></select></div><button type="submit"><Search size={16} /> Search</button></form>
      <div className="knowledge-topics" aria-label="Browse by topic">{topics.map(topic => <Link key={topic} href={`/knowledge?q=${encodeURIComponent(topic)}#library`}>{topic}</Link>)}</div>
      <div className="directory-status"><p role="status">Showing {filtered.length} of {publications.length} public publications</p>{(type || year || q || sort !== "newest") && <Link href="/knowledge#library">Clear filters</Link>}</div>
      {filtered.length ? <ul className="publication-grid">{filtered.map(d => <li key={d.slug}><article className="publication-card"><p className="eyebrow">{d.type} / {d.year}</p><h3 className="font-display"><Link href={`/knowledge/${d.slug}`}>{d.title}</Link></h3><p className="publication-summary">{d.summary}</p><p className="publication-author">{d.author}</p><div className="publication-footer"><span>{d.topic}</span><Link href={`/knowledge/${d.slug}`}>View publication <ArrowRight size={15} /></Link></div><p className="publication-file">{d.fileUrl ? `PDF available · ${d.pages} pages · ${d.size}` : "Publication details available; PDF coming soon"}</p></article></li>)}</ul> : <EmptyState title="No publications found" description="Try another title, topic, collection or year." href="/knowledge" actionLabel="View all publications" />}
    </section>
    <div className="knowledge-member-access"><div><p className="eyebrow-light">For members</p><h2 className="font-display">Continue the conversation.</h2><p>Access member resources and contribute to the Forum’s work through the member portal.</p></div><Link href="/login" className="portrait-link">Member portal <ArrowRight size={18} /></Link></div>
  </div>;
}
export const revalidate = 300;
