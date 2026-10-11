import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
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
  const copy = await getTemplateCopy("page-media-photos");

 const authored = await websiteMetadata("/media/photos");
 return authored ?? { title: copy("field-001") };
}
export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ year?: string; event?: string }> }) {
  const copy = await getTemplateCopy("page-media-photos");

  const managed = await managedWebsitePage("/media/photos");
  if (managed) return managed;

  const [params, media, events] = await Promise.all([searchParams, listMedia({kind:"IMAGE",galleryOnly:true}), listEvents()]);
  const eventMap = new Map(events.map(event => [event.slug,event]));
  const covers = new Set(events.map(event => event.coverUrl).filter(Boolean));
  const photographs = media.filter(item => isGalleryPhotograph(item) && item.eventSlug && eventMap.has(item.eventSlug) && !covers.has(item.url));
  const albums = events.filter(event => photographs.some(item => item.eventSlug === event.slug)).sort((a,b) => b.startDate.localeCompare(a.startDate));
  const years = [...new Set(photographs.map(item => item.year))].sort((a,b) => b-a);
  const visible = photographs.filter(item => (!params.event || item.eventSlug === params.event) && (!params.year || String(item.year) === params.year));
  return <div className="photo-albums-page mx-auto max-w-shell px-5 py-12"><Breadcrumbs items={[{label:copy("field-002"),href: templateRoute(copy("field-003"))},{label:copy("field-001")}]} /><SectionHeading as="h1" eyebrow={copy("field-004")} title={copy("field-005")} lede={copy("field-006")} /><form className="album-filter" action="/media/photos"><div><label htmlFor="album-event">{copy("field-007")}</label><select id="album-event" name="event" defaultValue={params.event ?? ""}><option value="">{copy("field-008")}</option>{albums.map(event => <option key={event.slug} value={event.slug}>{event.title}</option>)}</select></div><div><label htmlFor="album-year">{copy("field-009")}</label><select id="album-year" name="year" defaultValue={params.year ?? ""}><option value="">{copy("field-010")}</option>{years.map(year => <option key={year}>{year}</option>)}</select></div><button type="submit">{copy("field-011")}</button></form><div className="directory-status"><p role="status">{visible.length} {copy("field-012")}{visible.length === 1 ? "" : copy("field-013")}</p>{(params.event || params.year) && <Link href={templateRoute(copy("field-014"))}>{copy("field-015")}</Link>}</div>{visible.length ? albums.map(event => {const items=visible.filter(item => item.eventSlug === event.slug);return items.length ? <section key={event.slug} className="photo-event-album" aria-labelledby={`album-${event.slug}`}><div className="album-heading"><div><p className="eyebrow">{event.startDate.slice(0,4)} {copy("field-016")}{event.city}</p><h2 id={`album-${event.slug}`} className="font-display">{event.title}</h2><p>{items.length} {copy("field-012")}{items.length === 1 ? "" : copy("field-013")}</p></div><Link href={`/events/${event.slug}`} className="portrait-link">{copy("field-017")}<ArrowRight size={16} /></Link></div><Gallery items={items} columns={3} /></section> : null;}) : <EmptyState title={copy("field-018")} description={copy("field-019")} />}<Link href={templateRoute(copy("field-020"))} className="portrait-link">{copy("field-021")}<ArrowRight size={16} /></Link></div>;
}
export const revalidate = 300;
