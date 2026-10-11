import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, Reveal } from "@/components/ui";
import { ForumMoments } from "@/components/forum-moments";
import { EditorialImage } from "@/components/editorial-image";
import { listTimeline } from "@/lib/repo";
import { asRoute } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getTemplateCopy("page-about-history");

 const authored = await websiteMetadata("/about/history");
 return authored ?? { title: copy("field-001"), description: copy("field-002") };
}

export default async function HistoryPage() {
  const copy = await getTemplateCopy("page-about-history");

  const managed = await managedWebsitePage("/about/history");
  if (managed) return managed;

  const timeline = (await listTimeline()).sort((a, b) => a.year - b.year);
  const seen = new Set<string>();
  const photographs = timeline.filter((entry) => {
    if (!entry.image || seen.has(entry.image) || /\/brand\//i.test(entry.image)) return false;
    seen.add(entry.image); return true;
  }).map((entry) => ({ src: entry.image!, alt: entry.title, caption: `${entry.year} / ${entry.title}` }));
  const first = timeline[0];
  const slides = photographs.length ? photographs : [
    { src: copy("field-003"), alt: copy("field-004"), caption: copy("field-005") },
    { src: copy("field-006"), alt: copy("field-007"), caption: copy("field-008") },
  ];
  return <div className="history-page mx-auto max-w-shell px-5 py-12">
    <Breadcrumbs items={[{ label: copy("field-009"), href: templateRoute(copy("field-010")) }, { label: copy("field-011") }]} />
    <SectionHeading as="h1" eyebrow={copy("field-012")} title={copy("field-013")} lede={copy("field-014")} />
    <ForumMoments slides={slides} />
    <Reveal><section className="history-intro" aria-labelledby="history-intro">
      <div><p className="eyebrow">{copy("field-015")}</p><h2 id="history-intro" className="font-display">{copy("field-016")}<br />{copy("field-017")}</h2></div>
      <div><p>{copy("field-018")}</p><Link href={templateRoute(copy("field-010"))} className="mt-5 inline-flex items-center gap-3 text-sm font-semibold text-primary">{copy("field-019")}<ArrowRight size={16} /></Link></div>
    </section></Reveal>
    {first ? <div className="history-journey">
      <nav className="history-years" aria-label={copy("field-020")}><p className="eyebrow">{copy("field-021")}</p>{timeline.map((entry, index) => <a key={`${entry.year}-${index}`} href={`#milestone-${index}`}><span className="font-display">{entry.year}</span><span>{entry.title}</span></a>)}</nav>
      <ol className="history-timeline">{timeline.map((entry, index) => <li key={`${entry.year}-${index}`}>
        <Reveal><article id={`milestone-${index}`} className={`history-milestone ${index === 0 ? "history-origin" : ""}`} aria-labelledby={`milestone-title-${index}`}>
          <div className="history-year"><span className="font-display">{entry.year}</span><p className="eyebrow">{index === 0 ? copy("field-022") : copy("field-023")}</p></div>
          <h2 id={`milestone-title-${index}`} className="font-display">{entry.title}</h2>
          {entry.image && <EditorialImage src={entry.image} alt={entry.title} className="milestone-photo" sizes="(max-width: 768px) 100vw, 850px" />}
          <div className="history-copy">{entry.summary.split(/\n\s*\n/).filter(Boolean).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</div>
          {entry.links.length > 0 && <div className="mt-6 flex flex-wrap gap-4">{entry.links.map((link) => <Link key={`${link.label}-${link.href}`} href={asRoute(link.href)} className="milestone-link">{link.label}<ArrowRight size={15} /></Link>)}</div>}
        </article></Reveal>
      </li>)}</ol>
    </div> : <div className="history-empty" role="status"><h2 className="font-display text-3xl">{copy("field-024")}</h2><p className="mt-4">{copy("field-025")}</p></div>}
    <Reveal><section className="about-discover" aria-labelledby="history-continue"><div><p className="eyebrow-light">{copy("field-026")}</p><h2 id="history-continue" className="font-display">{copy("field-027")}</h2><p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">{copy("field-028")}</p></div><div className="grid gap-3">{[
      { href: templateRoute(copy("field-029")), label: copy("field-030") }, { href: templateRoute(copy("field-031")), label: copy("field-032") }, { href: templateRoute(copy("field-033")), label: copy("field-034") }, { href: templateRoute(copy("field-035")), label: copy("field-036") },
    ].map((link) => <Link key={link.href} href={asRoute(link.href)}><span>{link.label}</span><ArrowRight size={18} /></Link>)}</div></section></Reveal>
  </div>;
}
export const revalidate = 300;
