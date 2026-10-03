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
 const authored = await websiteMetadata("/about/history");
 return authored ?? { title: "Our history", description: "Explore the milestones, gatherings and shared experience that shaped the Forum of Former Deputy Governors of Nigeria." };
}

export default async function HistoryPage() {
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
    { src: "/assets/hero/fdg.jpg", alt: "Forum members at a national engagement", caption: "Forum members, together in service" },
    { src: "/assets/news/visit_ganduje2.jpeg", alt: "Forum representatives during an official visit", caption: "Institutional dialogue and engagement" },
  ];
  return <div className="history-page mx-auto max-w-shell px-5 py-12">
    <Breadcrumbs items={[{ label: "About", href: "/about" }, { label: "History" }]} />
    <SectionHeading as="h1" eyebrow="Institutional memory" title="The Forum through the years" lede="A shared journey of leadership, dialogue and service. Discover the milestones and moments that shaped the Forum." />
    <ForumMoments slides={slides} />
    <Reveal><section className="history-intro" aria-labelledby="history-intro">
      <div><p className="eyebrow">Our journey</p><h2 id="history-intro" className="font-display">Experience becomes<br />a lasting legacy.</h2></div>
      <div><p>Across generations of leadership, the Forum brings executive experience into national dialogue. These records trace the gatherings, decisions and achievements that continue to shape its purpose.</p><Link href="/about" className="mt-5 inline-flex items-center gap-3 text-sm font-semibold text-primary">About the Forum <ArrowRight size={16} /></Link></div>
    </section></Reveal>
    {first ? <div className="history-journey">
      <nav className="history-years" aria-label="Timeline milestones"><p className="eyebrow">Explore the years</p>{timeline.map((entry, index) => <a key={`${entry.year}-${index}`} href={`#milestone-${index}`}><span className="font-display">{entry.year}</span><span>{entry.title}</span></a>)}</nav>
      <ol className="history-timeline">{timeline.map((entry, index) => <li key={`${entry.year}-${index}`}>
        <Reveal><article id={`milestone-${index}`} className={`history-milestone ${index === 0 ? "history-origin" : ""}`} aria-labelledby={`milestone-title-${index}`}>
          <div className="history-year"><span className="font-display">{entry.year}</span><p className="eyebrow">{index === 0 ? "Where it began" : "A milestone in our journey"}</p></div>
          <h2 id={`milestone-title-${index}`} className="font-display">{entry.title}</h2>
          {entry.image && <EditorialImage src={entry.image} alt={entry.title} className="milestone-photo" sizes="(max-width: 768px) 100vw, 850px" />}
          <div className="history-copy">{entry.summary.split(/\n\s*\n/).filter(Boolean).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</div>
          {entry.links.length > 0 && <div className="mt-6 flex flex-wrap gap-4">{entry.links.map((link) => <Link key={`${link.label}-${link.href}`} href={asRoute(link.href)} className="milestone-link">{link.label}<ArrowRight size={15} /></Link>)}</div>}
        </article></Reveal>
      </li>)}</ol>
    </div> : <div className="history-empty" role="status"><h2 className="font-display text-3xl">The archive is being assembled</h2><p className="mt-4">Historical milestones will appear here as the Secretariat publishes them.</p></div>}
    <Reveal><section className="about-discover" aria-labelledby="history-continue"><div><p className="eyebrow-light">A living archive</p><h2 id="history-continue" className="font-display">Our story continues.</h2><p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">Every gathering adds another chapter. Explore the Forum&rsquo;s events, people and published records.</p></div><div className="grid gap-3">{[
      { href: "/events", label: "Events and conferences" }, { href: "/media/photos", label: "Photo archive" }, { href: "/knowledge", label: "Publications and records" }, { href: "/leadership", label: "Meet the leadership" },
    ].map((link) => <Link key={link.href} href={asRoute(link.href)}><span>{link.label}</span><ArrowRight size={18} /></Link>)}</div></section></Reveal>
  </div>;
}
export const revalidate = 300;
