import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, EmptyState } from "@/components/ui";
import { Gallery } from "@/components/media";
import { isGalleryPhotograph, listEvents, listMedia } from "@/lib/repo";
export async function generateMetadata(): Promise<Metadata> {
 const authored = await websiteMetadata("/media/photos");
 return authored ?? { title: "Photo Gallery" };
}
export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ year?: string; event?: string }> }) {
  const managed = await managedWebsitePage("/media/photos");
  if (managed) return managed;

  const [params, media, events] = await Promise.all([searchParams, listMedia({kind:"IMAGE",galleryOnly:true}), listEvents()]);
  const eventMap = new Map(events.map(event => [event.slug,event]));
  const covers = new Set(events.map(event => event.coverUrl).filter(Boolean));
  const photographs = media.filter(item => isGalleryPhotograph(item) && item.eventSlug && eventMap.has(item.eventSlug) && !covers.has(item.url));
  const albums = events.filter(event => photographs.some(item => item.eventSlug === event.slug)).sort((a,b) => b.startDate.localeCompare(a.startDate));
  const years = [...new Set(photographs.map(item => item.year))].sort((a,b) => b-a);
  const visible = photographs.filter(item => (!params.event || item.eventSlug === params.event) && (!params.year || String(item.year) === params.year));
  return <div className="photo-albums-page mx-auto max-w-shell px-5 py-12"><Breadcrumbs items={[{label:"News & Media",href:"/news"},{label:"Photo Gallery"}]} /><SectionHeading as="h1" eyebrow="Forum moments" title="Our gatherings, in photographs." lede="Explore photographs from Forum events, organised into albums with captions and event context." /><form className="album-filter" action="/media/photos"><div><label htmlFor="album-event">Event album</label><select id="album-event" name="event" defaultValue={params.event ?? ""}><option value="">All event albums</option>{albums.map(event => <option key={event.slug} value={event.slug}>{event.title}</option>)}</select></div><div><label htmlFor="album-year">Year</label><select id="album-year" name="year" defaultValue={params.year ?? ""}><option value="">All years</option>{years.map(year => <option key={year}>{year}</option>)}</select></div><button type="submit">View photographs</button></form><div className="directory-status"><p role="status">{visible.length} photograph{visible.length === 1 ? "" : "s"}</p>{(params.event || params.year) && <Link href="/media/photos">Clear filters</Link>}</div>{visible.length ? albums.map(event => {const items=visible.filter(item => item.eventSlug === event.slug);return items.length ? <section key={event.slug} className="photo-event-album" aria-labelledby={`album-${event.slug}`}><div className="album-heading"><div><p className="eyebrow">{event.startDate.slice(0,4)} / {event.city}</p><h2 id={`album-${event.slug}`} className="font-display">{event.title}</h2><p>{items.length} photograph{items.length === 1 ? "" : "s"}</p></div><Link href={`/events/${event.slug}`} className="portrait-link">Explore event <ArrowRight size={16} /></Link></div><Gallery items={items} columns={3} /></section> : null;}) : <EmptyState title="No event photographs available" description="Event albums appear here when gallery photographs are published and linked to their event." />}<Link href="/media/videos" className="portrait-link">Explore the video archive <ArrowRight size={16} /></Link></div>;
}
export const revalidate = 300;
