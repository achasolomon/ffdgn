import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, EmptyState, Reveal } from "@/components/ui";
import { AssetImage } from "@/components/media";
import { listEvents } from "@/lib/repo";
import { formatDate } from "@/lib/search";

export default async function EventsPage() {
  const events = await listEvents();
  const upcoming = events.filter((e) => e.status !== "Past");
  const past = events.filter((e) => e.status === "Past");
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "Events & Conferences" }]} />
      <SectionHeading eyebrow="Events & conferences" title="Convenings of the Forum" lede="Conferences, dialogues and roundtables — each preserved with its programme, people, photographs and outcomes." />

      {upcoming.map((e) => (
        <Reveal key={e.slug}>
          <article className="mt-8 grid overflow-hidden bg-forest-950 text-white lg:grid-cols-2">
            {e.coverUrl && (
              <Link href={`/events/${e.slug}`} className="relative block min-h-[280px] lg:min-h-[360px]" aria-label={`View ${e.title}`}>
                <AssetImage src={e.coverUrl} alt={e.title} width={900} height={700} className="absolute inset-0 h-full w-full object-cover object-top" sizes="(max-width: 1024px) 100vw, 50vw" priority />
              </Link>
            )}
            <div className="p-7 md:p-10">
              <p className="eyebrow-light">{e.kind} · {e.status}</p>
              <p className="mt-3 flex items-center gap-2 font-display text-xl text-gold"><CalendarDays size={18} /> {formatDate(e.startDate)} – {formatDate(e.endDate)}</p>
              <h2 className="font-display mt-2 text-3xl leading-tight md:text-4xl">
                <Link href={`/events/${e.slug}`} className="hover:text-gold">{e.title}</Link>
              </h2>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/65"><MapPin size={14} /> {e.venue}, {e.city}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/events/${e.slug}`} className="inline-flex items-center gap-2 bg-gold px-6 py-3 text-sm font-bold text-forest-950 hover:bg-gold-soft">View flyer & register <ArrowRight size={15} /></Link>
              </div>
            </div>
          </article>
        </Reveal>
      ))}

      <div className="mt-14 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl text-forest-950 md:text-3xl">Conference archive</h2>
        <p className="text-sm text-ink/55">{past.length} past convening{past.length === 1 ? "" : "s"}</p>
      </div>
      {past.length === 0 ? (
        <div className="mt-4"><EmptyState title="No archived conferences yet" body="Past events will appear here with their communiqués and reports." /></div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {past.map((e) => (
            <Reveal key={e.slug}>
              <Link href={`/events/${e.slug}`} className="group block h-full border hairline bg-white hover:shadow-card">
                <span className="relative block aspect-[16/10] overflow-hidden bg-forest-900" aria-hidden>
                  {e.coverUrl ? (
                    <AssetImage src={e.coverUrl} alt="" width={640} height={400} className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
                  ) : (
                    <span className="grid h-full place-items-center font-display text-5xl text-gold/60">{new Date(e.startDate).getFullYear()}</span>
                  )}
                  <span className="absolute left-3 top-3 bg-forest-950/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold">{new Date(e.startDate).getFullYear()}</span>
                </span>
                <span className="block p-5">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45">{e.kind} · {e.city}</span>
                  <span className="mt-1 block font-display text-xl leading-snug text-forest-950 group-hover:text-primary">{e.title}</span>
                  <span className="mt-2 inline-block text-[13px] font-semibold text-primary">Open record →</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

export const revalidate = 300; // CMS-driven: refresh from MySQL every 5 minutes
