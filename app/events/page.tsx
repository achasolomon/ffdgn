import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, EmptyState, Reveal } from "@/components/ui";
import { AssetImage } from "@/components/media";
import { listEvents } from "@/lib/repo";
import { formatDate } from "@/lib/search";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getTemplateCopy("page-events");

 const authored = await websiteMetadata("/events");
 return authored ?? { title: copy("field-001") };
}
export default async function EventsPage({ searchParams }: { searchParams: Promise<{ q?: string; year?: string; kind?: string }> }) {
  const copy = await getTemplateCopy("page-events");

  const managed = await managedWebsitePage("/events");
  if (managed) return managed;

  const [events, params] = await Promise.all([listEvents(), searchParams]);
  const upcoming = events.filter(e => e.status !== "Past").sort((a,b) => a.startDate.localeCompare(b.startDate));
  const past = events.filter(e => e.status === "Past").sort((a,b) => b.startDate.localeCompare(a.startDate));
  const years = [...new Set(past.map(e => e.startDate.slice(0,4)))].sort().reverse();
  const kinds = [...new Set(past.map(e => e.kind))].sort();
  const q = (params.q ?? "").trim().toLowerCase();
  const archive = past.filter(e => (!q || `${e.title} ${e.theme} ${e.city}`.toLowerCase().includes(q)) && (!params.year || e.startDate.startsWith(params.year)) && (!params.kind || e.kind === params.kind));
  return <div className="events-page mx-auto max-w-shell px-5 py-12">
    <Breadcrumbs items={[{ label: copy("field-001") }]} />
    <div className="events-intro"><SectionHeading as="h1" eyebrow={copy("field-002")} title={copy("field-003")} lede={copy("field-004")} /><div className="events-section-links"><a href={templateRoute(copy("field-005"))}>{copy("field-006")}<ArrowRight size={16} /></a><a href={templateRoute(copy("field-007"))}>{copy("field-008")}<ArrowRight size={16} /></a></div></div>
    <section id="upcoming" className="events-upcoming" aria-labelledby="upcoming-title"><div className="events-section-heading"><div><p className="eyebrow">{copy("field-009")}</p><h2 id="upcoming-title" className="font-display">{copy("field-010")}</h2></div><p>{upcoming.length} {copy("field-011")}{upcoming.length === 1 ? "" : copy("field-012")}</p></div>
      {upcoming.length ? upcoming.map((e,index) => <Reveal key={e.slug}><article className="event-feature"><Link href={`/events/${e.slug}`} className="event-flyer" aria-label={copy("field-045", {value1: e.title})}>{e.coverUrl ? <AssetImage src={e.coverUrl} alt={copy("field-046", {value1: e.title})} width={1100} height={800} className="h-full w-full object-contain" sizes="(max-width: 767px) 100vw, 50vw" priority={index === 0} /> : <span className="font-display">{e.startDate.slice(0,4)}</span>}</Link><div className="event-feature-copy"><p className="eyebrow-light">{e.kind} {copy("field-013")}{e.status}</p><p className="event-date"><CalendarDays size={18} />{formatDate(e.startDate)}{e.startDate !== e.endDate && copy("field-047", {value1: formatDate(e.endDate)})}</p><h3 className="font-display"><Link href={`/events/${e.slug}`}>{e.title}</Link></h3>{e.theme && <p className="event-theme">{e.theme}</p>}<p className="event-location"><MapPin size={17} /><span>{e.venue}{copy("field-014")}{e.city}</span></p><p className="event-summary">{e.summary}</p><Link href={`/events/${e.slug}`} className="event-action">{copy("field-015")}<ArrowRight size={18} /></Link></div></article></Reveal>) : <EmptyState title={copy("field-016")} description={copy("field-017")} />}
    </section>
    <section id="archive" className="events-archive" aria-labelledby="archive-title"><div className="events-section-heading"><div><p className="eyebrow">{copy("field-018")}</p><h2 id="archive-title" className="font-display">{copy("field-019")}</h2></div><p>{past.length} {copy("field-020")}{past.length === 1 ? "" : copy("field-012")}</p></div>
      {past.length > 0 && <><form className="events-filter" role="search" aria-label={copy("field-021")} action="/events#archive"><div><label htmlFor="eq">{copy("field-022")}</label><input id="eq" name="q" defaultValue={params.q ?? ""} placeholder={copy("field-023")} /></div><div><label htmlFor="ey">{copy("field-024")}</label><select id="ey" name="year" defaultValue={params.year ?? ""}><option value="">{copy("field-025")}</option>{years.map(year => <option key={year}>{year}</option>)}</select></div><div><label htmlFor="ek">{copy("field-026")}</label><select id="ek" name="kind" defaultValue={params.kind ?? ""}><option value="">{copy("field-027")}</option>{kinds.map(kind => <option key={kind}>{kind}</option>)}</select></div><button type="submit">{copy("field-028")}</button></form><div className="directory-status"><p role="status">{copy("field-029")}{archive.length} {copy("field-030")}{past.length} {copy("field-031")}</p>{(q || params.year || params.kind) && <Link href={templateRoute(copy("field-032"))}>{copy("field-033")}</Link>}</div></>}
      {archive.length ? <div className="event-archive-grid">{archive.map(e => <Reveal key={e.slug}><article className="event-archive-card"><Link href={`/events/${e.slug}`} className="event-archive-image" aria-label={copy("field-048", {value1: e.title})}>{e.coverUrl ? <AssetImage src={e.coverUrl} alt="" width={750} height={500} className="h-full w-full object-contain" sizes="(max-width: 767px) 100vw, 33vw" /> : <span className="font-display">{e.startDate.slice(0,4)}</span>}<span className="event-year">{e.startDate.slice(0,4)}</span></Link><div className="event-archive-copy"><p className="eyebrow">{e.kind}</p><h3 className="font-display"><Link href={`/events/${e.slug}`}>{e.title}</Link></h3><p className="event-archive-date">{formatDate(e.startDate)} {copy("field-034")}{e.city}</p><p>{e.summary}</p><Link href={`/events/${e.slug}`} className="portrait-link">{copy("field-035")}<ArrowRight size={16} /></Link></div></article></Reveal>)}</div> : <EmptyState title={past.length ? copy("field-036") : copy("field-037")} description={past.length ? copy("field-038") : copy("field-039")} />}
    </section>
    <div className="events-enquiry"><div><p className="eyebrow-light">{copy("field-040")}</p><h2 className="font-display">{copy("field-041")}</h2><p>{copy("field-042")}</p></div><Link href={templateRoute(copy("field-043"))} className="portrait-link">{copy("field-044")}<ArrowRight size={18} /></Link></div>
  </div>;
}
export const revalidate = 300;
