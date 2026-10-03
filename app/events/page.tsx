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
 const authored = await websiteMetadata("/events");
 return authored ?? { title: "Events & Conferences" };
}
export default async function EventsPage({ searchParams }: { searchParams: Promise<{ q?: string; year?: string; kind?: string }> }) {
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
    <Breadcrumbs items={[{ label: "Events & Conferences" }]} />
    <div className="events-intro"><SectionHeading as="h1" eyebrow="Events & conferences" title="Where experience meets ideas." lede="Conferences, dialogues and roundtables bringing the Forum together to exchange ideas and shape the conversation on Nigeria’s development." /><div className="events-section-links"><a href="#upcoming">Upcoming & ongoing <ArrowRight size={16} /></a><a href="#archive">Explore past events <ArrowRight size={16} /></a></div></div>
    <section id="upcoming" className="events-upcoming" aria-labelledby="upcoming-title"><div className="events-section-heading"><div><p className="eyebrow">On the calendar</p><h2 id="upcoming-title" className="font-display">Upcoming & ongoing</h2></div><p>{upcoming.length} event{upcoming.length === 1 ? "" : "s"}</p></div>
      {upcoming.length ? upcoming.map((e,index) => <Reveal key={e.slug}><article className="event-feature"><Link href={`/events/${e.slug}`} className="event-flyer" aria-label={`View ${e.title}`}>{e.coverUrl ? <AssetImage src={e.coverUrl} alt={`Flyer for ${e.title}`} width={1100} height={800} className="h-full w-full object-contain" sizes="(max-width: 767px) 100vw, 50vw" priority={index === 0} /> : <span className="font-display">{e.startDate.slice(0,4)}</span>}</Link><div className="event-feature-copy"><p className="eyebrow-light">{e.kind} / {e.status}</p><p className="event-date"><CalendarDays size={18} />{formatDate(e.startDate)}{e.startDate !== e.endDate && ` – ${formatDate(e.endDate)}`}</p><h3 className="font-display"><Link href={`/events/${e.slug}`}>{e.title}</Link></h3>{e.theme && <p className="event-theme">{e.theme}</p>}<p className="event-location"><MapPin size={17} /><span>{e.venue}, {e.city}</span></p><p className="event-summary">{e.summary}</p><Link href={`/events/${e.slug}`} className="event-action">Explore event <ArrowRight size={18} /></Link></div></article></Reveal>) : <EmptyState title="Our next gathering is being planned" description="Upcoming events will appear here when announced. Explore previous gatherings below." />}
    </section>
    <section id="archive" className="events-archive" aria-labelledby="archive-title"><div className="events-section-heading"><div><p className="eyebrow">The Forum in conversation</p><h2 id="archive-title" className="font-display">Past gatherings, lasting ideas.</h2></div><p>{past.length} archived event{past.length === 1 ? "" : "s"}</p></div>
      {past.length > 0 && <><form className="events-filter" role="search" aria-label="Search past events" action="/events#archive"><div><label htmlFor="eq">Find an event</label><input id="eq" name="q" defaultValue={params.q ?? ""} placeholder="Title, theme or city" /></div><div><label htmlFor="ey">Year</label><select id="ey" name="year" defaultValue={params.year ?? ""}><option value="">All years</option>{years.map(year => <option key={year}>{year}</option>)}</select></div><div><label htmlFor="ek">Event type</label><select id="ek" name="kind" defaultValue={params.kind ?? ""}><option value="">All event types</option>{kinds.map(kind => <option key={kind}>{kind}</option>)}</select></div><button type="submit">Search archive</button></form><div className="directory-status"><p role="status">Showing {archive.length} of {past.length} past events</p>{(q || params.year || params.kind) && <Link href="/events#archive">Clear filters</Link>}</div></>}
      {archive.length ? <div className="event-archive-grid">{archive.map(e => <Reveal key={e.slug}><article className="event-archive-card"><Link href={`/events/${e.slug}`} className="event-archive-image" aria-label={`Explore ${e.title}`}>{e.coverUrl ? <AssetImage src={e.coverUrl} alt="" width={750} height={500} className="h-full w-full object-contain" sizes="(max-width: 767px) 100vw, 33vw" /> : <span className="font-display">{e.startDate.slice(0,4)}</span>}<span className="event-year">{e.startDate.slice(0,4)}</span></Link><div className="event-archive-copy"><p className="eyebrow">{e.kind}</p><h3 className="font-display"><Link href={`/events/${e.slug}`}>{e.title}</Link></h3><p className="event-archive-date">{formatDate(e.startDate)} · {e.city}</p><p>{e.summary}</p><Link href={`/events/${e.slug}`} className="portrait-link">Explore event record <ArrowRight size={16} /></Link></div></article></Reveal>)}</div> : <EmptyState title={past.length ? "No events match your search" : "The archive is being prepared"} description={past.length ? "Try another title, city, year or event type." : "Past gatherings will appear here with their programmes and outcomes."} />}
    </section>
    <div className="events-enquiry"><div><p className="eyebrow-light">Join the conversation</p><h2 className="font-display">Connect with the Secretariat.</h2><p>For questions about Forum events, participation or conference arrangements, get in touch with our team.</p></div><Link href="/contact?subject=Event%20enquiry" className="portrait-link">Event enquiries <ArrowRight size={18} /></Link></div>
  </div>;
}
export const revalidate = 300;
