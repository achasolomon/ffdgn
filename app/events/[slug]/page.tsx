import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, CalendarDays, Download, MapPin } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { Reveal } from "@/components/ui";
import { getDocsBySlug, getEventGallery, getEventRepo, listMembers, listSpeakers } from "@/lib/repo";
import { Gallery, AssetImage } from "@/components/media";
import { asRoute } from "@/lib/routes";
import { formatDate } from "@/lib/search";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
 const authored = await websiteMetadata(`/events/${(await params).slug}`);
 if (authored) return authored;

  const event = await getEventRepo((await params).slug);
  return { title: event?.title ?? "Event" };
}
export default async function EventDetail({ params }: { params: Promise<{ slug: string }> }) {
  const managed = await managedWebsitePage(`/events/${(await params).slug}`);
  if (managed) return managed;

  const { slug } = await params;
  const e = await getEventRepo(slug);
  if (!e) notFound();
  const [docs, members, gallery, speakers] = await Promise.all([
    getDocsBySlug(e.documents), listMembers(), getEventGallery(e.slug), listSpeakers(e.slug),
  ]);
  const publicDocs = docs.filter(d => d.status === "Published" && d.visibility === "PUBLIC");
  const speakerName = (s: string) => members.find((m) => m.slug === s)?.name ?? s;
  const keynote = speakers.find((s) => s.keynote);
  const rest = speakers.filter((s) => !s.keynote);
  const initials = (name: string) =>
    name.replace(/^(Prof\.|Dr|H\.E\.)\s+/, "").split(" ").map((w) => w[0]).slice(0, 2).join("");
  const past = e.status === "Past";

  // A past conference is read for what happened, so photographs come before the
  // planned programme; an upcoming one is read for what will happen, so the
  // programme leads and photographs (sparse, if present at all) follow.
  const programme = (
    e.programme.length > 0 && (
      <section id="programme" aria-label="Programme" className="event-detail-programme">
        <h2 className="border-b hairline bg-paper px-6 py-4 font-display text-xl text-forest-950">{past ? "Programme from the gathering" : "Programme"}</h2>
        <ol className="divide-y divide-ink/10">
          {e.programme.map((p, i) => (
            <li key={i} className="grid gap-1 px-6 py-4 sm:grid-cols-[130px_1fr]">
              <span className="font-mono text-[13px] text-primary">{p.time}</span>
              <span>
                <span className="block text-sm font-semibold">{p.session}</span>
                {p.speaker && <span className="text-[13px] text-ink/55">{p.speaker}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>
    )
  );

  const photographs = (
    <section id="photographs" aria-label="Photographs" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{past ? "What happened" : "From the day"}</p>
          <h2 className="font-display mt-1 text-3xl text-forest-950">Photographs</h2>
        </div>
        <Link href="/media/photos" className="text-sm font-semibold text-primary link-underline">Full gallery →</Link>
      </div>
      <div className="mt-4"><Gallery items={gallery} /></div>
    </section>
  );

  /**
   * The download panel, and it goes at the top of a past event's page: a reader
   * arriving a year later usually wants the communiqué, not the prose.
   *
   * A button is only offered when the file exists and the endpoint will serve
   * it to an anonymous visitor. Everything else links to the document record,
   * which never 404s — offering a Download that resolves to "Not found" reads
   * as a broken site rather than as a permission check.
   */
  const downloads = publicDocs.length > 0 ? (
    <section className="event-detail-downloads mt-10" id="downloads" aria-label="Documents and communiqué" >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b hairline bg-paper px-6 py-4">
        <div>
          <p className="eyebrow">For download</p>
          <h2 className="font-display mt-1 text-2xl text-forest-950">Documents &amp; communiqué</h2>
        </div>
        <p className="text-[12.5px] text-ink/55">{publicDocs.length} document{publicDocs.length === 1 ? "" : "s"}</p>
      </div>
      <ul className="divide-y divide-ink/10">
        {publicDocs.map((d) => {
          const file = d.fileUrl;
          const downloadable = !!file && d.status === "Published" && d.visibility === "PUBLIC";
          const meta =
            `${d.type}${d.year ? ` · ${d.year}` : ""}${d.pages ? ` · ${d.pages} pages` : ""}${d.size ? ` · ${d.size}` : ""}` +
            (d.visibility !== "PUBLIC" ? ` · ${d.visibility.replace(/_/g, " ").toLowerCase()} access` : "");
          return (
            <li key={d.slug} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-forest-950">{d.title}</span>
                <span className="mt-0.5 block text-[12.5px] text-ink/55">{meta}</span>
              </span>
              {file && downloadable ? (
                <a href={file} className="inline-flex shrink-0 items-center gap-2 bg-primary px-4 py-2.5 text-[13px] font-bold text-white hover:bg-forest-700">
                  Download PDF <Download size={14} />
                </a>
              ) : (
                <Link href={`/knowledge/${d.slug}`} className="inline-flex shrink-0 items-center gap-2 border border-forest-900/30 px-4 py-2.5 text-[13px] font-semibold text-forest-950 hover:bg-paper">
                  {file ? "Sign in to download" : "View record"} <ArrowUpRight size={14} />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  ) : null;

  const highlights = past && e.highlights ? (
    <section id="highlights" aria-label="Highlights" className="event-detail-highlights">
      <h2 className="border-b hairline bg-paper px-6 py-4 font-display text-xl text-forest-950">Highlights &amp; reflections</h2>
      <div className="px-6 py-6">
        <p className="max-w-3xl whitespace-pre-line text-[14.5px] leading-relaxed text-ink/75">{e.highlights}</p>
      </div>
    </section>
  ) : null;

  // Three footer cards, but only as many columns as there are cards: with the
  // patron list missing, a fixed three-column row would leave a visible hole.
  const infoCards: ReactNode[] = [];
  if (e.speakers.length > 0) {
    infoCards.push(
      <section key="members" aria-label="Members attending" className="border hairline bg-white p-6">
        <h2 className="eyebrow">Forum members</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {e.speakers.map((s) => (
            <li key={s}><Link href={`/members/${s}`} className="font-semibold text-primary">{speakerName(s)}</Link></li>
          ))}
        </ul>
      </section>,
    );
  }
  if (e.guests && e.guests.length > 0) {
    infoCards.push(
      <section key="guests" aria-label="Patrons and chairmen" className="border hairline bg-white p-6">
        <h2 className="eyebrow">Patrons &amp; chairmen</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {e.guests.slice(0, 5).map((g) => <li key={g} className="border-l-2 border-gold pl-3 text-ink/75">{g}</li>)}
        </ul>
        {e.guests.length > 5 && (
          <p className="mt-2 text-[12.5px] text-ink/50">+ {e.guests.length - 5} more on the faculty above</p>
        )}
      </section>,
    );
  }
  // Past events carry the full download panel immediately under the headline,
  // so repeating every document here would show each one twice. The compact
  // card survives for upcoming events, and for a past event with nothing
  // attached — there the placeholder is still the honest answer.
  if (publicDocs.length === 0) {
    infoCards.push(
      <section key="docs" aria-label="Documents" className="border hairline bg-white p-6">
        <h2 className="eyebrow">Documents &amp; communiqué</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {publicDocs.length
            ? publicDocs.map((d) => (
                <li key={d.slug}><Link href={`/knowledge/${d.slug}`} className="font-semibold text-primary">{d.title}</Link></li>
              ))
            : <li className="text-ink/50">Documents will be published after institutional review.</li>}
        </ul>
      </section>,
    );
  }
  const infoColumns = infoCards.length >= 3 ? "lg:grid-cols-3" : infoCards.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-1";

  return (
    <div className={`event-detail-page ${past ? "event-past-page" : ""} mx-auto max-w-shell px-5 py-12`}>
      <Breadcrumbs items={[{ label: "Events", href: "/events" }, { label: e.title }]} />

      <header className="event-detail-header">
        <div className="event-header-photo" aria-hidden><AssetImage src={e.coverUrl ?? "/assets/hero/national.jpg"} alt="" width={1600} height={900} className="h-full w-full object-cover" sizes="100vw" priority /></div>
        <p className="eyebrow-light">{past ? "From the archive" : e.kind} / {past ? e.startDate.slice(0,4) : e.status}</p>
        <h1 className="font-display">{e.title}</h1>
        {e.theme && <p className="event-detail-theme">{e.theme}</p>}
        <div className="event-detail-facts"><p><CalendarDays size={18} /><span>{formatDate(e.startDate)}{e.startDate !== e.endDate && ` – ${formatDate(e.endDate)}`}</span></p><p><MapPin size={18} /><span>{e.venue}, {e.city}</span></p></div>
        {e.status === "Upcoming" && <Link href="/contact?subject=Conference%20registration" className="event-action">Register for this conference <ArrowRight size={17} /></Link>}
      </header>
      {past && <div className="event-archive-note"><p>This gathering has concluded. Explore its record, moments and published outcomes.</p><Link href="/events#upcoming">See upcoming events <ArrowRight size={16} /></Link></div>}
      <nav className="event-detail-nav" aria-label="Event sections">
        <a href="#event-overview">Overview</a>
        {past && e.highlights && <a href="#highlights">Highlights</a>}
        {e.programme.length > 0 && <a href="#programme">Programme</a>}
        {rest.length > 0 && <a href="#speakers">Speakers</a>}
        {gallery.length > 0 && <a href="#photographs">Photographs</a>}
        {publicDocs.length > 0 && <a href="#downloads">Documents</a>}
      </nav>
      <section id="event-overview" className={`event-detail-overview ${!e.coverUrl ? "event-detail-overview-text" : ""}`} aria-labelledby="overview-title">
        <div><p className="eyebrow">{past ? "The gathering" : "About the event"}</p><h2 id="overview-title" className="font-display">{past ? "Ideas shared. Experience exchanged." : "A forum for meaningful dialogue."}</h2><p>{e.summary}</p>{past && gallery.length > 0 && <a href="#photographs" className="portrait-link">See moments from the day <ArrowRight size={17} /></a>}</div>
        {e.coverUrl && <figure className="event-detail-flyer"><a href={e.coverUrl} target="_blank" rel="noreferrer" aria-label={`Open full-size flyer for ${e.title}`}><AssetImage src={e.coverUrl} alt={`Official flyer for ${e.title}`} width={1600} height={1000} sizes="(max-width: 767px) 100vw, 50vw" className="w-full object-contain" priority /></a><figcaption>Event flyer · Select to view full size</figcaption></figure>}
      </section>
      {/* Top of a past event: what can be downloaded, then what happened. */}
      {past && downloads}
      {past && highlights}
      {past && gallery.length > 0 && <div className="past-event-moments">{photographs}</div>}

      {/* Keynote spotlight */}
      {keynote && (
        <Reveal>
          <section aria-label="Keynote speaker" className="event-detail-keynote mt-12 grid gap-6 bg-forest-950 p-6 text-white md:grid-cols-[160px_1fr_auto] md:items-center md:p-8">
            {keynote.photo ? (
              <AssetImage src={keynote.photo} alt={`Portrait of ${keynote.name}`} width={320} height={320} className="h-32 w-32 rounded-full object-cover ring-2 ring-gold/60" sizes="128px" />
            ) : (
              <span className="grid h-32 w-32 place-items-center rounded-full bg-forest-900 font-display text-4xl text-gold ring-2 ring-gold/60" aria-hidden>{initials(keynote.name)}</span>
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Keynote speaker</p>
              <h2 className="font-display mt-1 text-3xl">{keynote.name}</h2>
              {keynote.bio && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">{keynote.bio}</p>}
            </div>
            <Link href={asRoute(`/speakers/${keynote.slug}`)} className="inline-flex shrink-0 items-center gap-2 border border-gold/70 px-5 py-2.5 text-sm font-semibold text-gold hover:bg-gold hover:text-forest-950">
              Speaker profile <ArrowRight size={15} />
            </Link>
          </section>
        </Reveal>
      )}

      {/* Speaker faculty grid */}
      {rest.length > 0 && (
        <section id="speakers" aria-label="Conference speakers" className="mt-12 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Faculty</p>
              <h2 className="font-display mt-1 text-3xl text-forest-950">Conference speakers</h2>
            </div>
            <p className="text-sm text-ink/55">{speakers.length} speaker{speakers.length === 1 ? "" : "s"} · tap a card for the full profile</p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((s) => (
              <Link key={s.slug} href={asRoute(`/speakers/${s.slug}`)} className="event-detail-speaker group flex items-center gap-4 p-5">
                {s.photo ? (
                  <AssetImage src={s.photo} alt={`Portrait of ${s.name}`} width={128} height={128} className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-gold/60" sizes="64px" />
                ) : (
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-forest-950 font-display text-xl text-gold" aria-hidden>{initials(s.name)}</span>
                )}
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{s.role}</span>
                  <span className="mt-0.5 block font-display text-xl text-forest-950 group-hover:text-primary">{s.name}</span>
                  <span className="mt-0.5 block text-[12.5px] text-ink/55">{s.bio ? `${s.bio.slice(0, 80)}…` : "Profile →"}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Programme and photographs, ordered by what the reader needs first */}
      <div className="mt-12 grid gap-10">
        {!past && programme}
        {past ? programme : gallery.length > 0 && photographs}
      </div>

      {!past && downloads}
      {/* Members / patrons / documents: a card row rather than a cramped sidebar */}
      <section aria-label="Attendees and documents" className={`event-detail-info mt-12 grid gap-6 ${infoColumns}`}>
        {infoCards}
      </section>
      {past && <div className="past-event-footer"><div><p className="eyebrow-light">Institutional memory</p><h2 className="font-display">Continue exploring the work of the Forum.</h2></div><Link href="/events#archive" className="portrait-link">Return to the event archive <ArrowRight size={18} /></Link></div>}
    </div>
  );
}

export const revalidate = 300; // CMS-driven: refresh from MySQL every 5 minutes
