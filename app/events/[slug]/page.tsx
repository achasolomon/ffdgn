import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { getDocTitles, getEventGallery, getEventRepo, listMembers } from "@/lib/repo";
import { Gallery, AssetImage } from "@/components/media";
import { formatDate } from "@/lib/search";

export default async function EventDetail({ params }: { params: Promise<{ slug: string }> }) {
  const e = await getEventRepo((await params).slug);
  if (!e) notFound();
  const [docTitles, members, gallery] = await Promise.all([getDocTitles(e.documents), listMembers(), getEventGallery(e.slug)]);
  const speakerName = (slug: string) => members.find((m) => m.slug === slug)?.name ?? slug;
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "Events", href: "/events" }, { label: e.title }]} />

      {e.coverUrl && (
        <figure className="mt-6 overflow-hidden border hairline bg-white">
          <AssetImage src={e.coverUrl} alt={`${e.title} — official flyer`} width={1360} height={640} className="aspect-[21/10] w-full object-cover object-top" sizes="(max-width: 1360px) 100vw, 1360px" priority />
        </figure>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="eyebrow">{e.kind} · {e.status}</p>
          <h1 className="font-display mt-2 text-4xl leading-tight text-forest-950 md:text-5xl">{e.title}</h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-ink/65">
            <span className="inline-flex items-center gap-1.5 font-semibold text-primary"><CalendarDays size={15} /> {formatDate(e.startDate)} – {formatDate(e.endDate)}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin size={15} /> {e.venue}, {e.city}</span>
          </p>
          <p className="mt-4 max-w-2xl font-display text-xl leading-relaxed text-ink/75">“{e.theme}”</p>

          <section aria-label="Photographs" className="mt-10">
            <div className="flex items-end justify-between">
              <h2 className="font-display text-2xl text-forest-950">Photographs</h2>
              <Link href="/media/photos" className="text-sm font-semibold text-primary link-underline">Full gallery →</Link>
            </div>
            <div className="mt-4"><Gallery items={gallery} /></div>
          </section>

          <section aria-label="Programme" className="mt-10 border hairline bg-white">
            <h2 className="border-b hairline bg-paper px-6 py-4 font-display text-xl text-forest-950">Programme</h2>
            <ol className="divide-y divide-ink/10">{e.programme.map((p, i) => <li key={i} className="grid gap-1 px-6 py-4 sm:grid-cols-[130px_1fr]"><span className="font-mono text-[13px] text-primary">{p.time}</span><span><span className="block text-sm font-semibold">{p.session}</span>{p.speaker && <span className="text-[13px] text-ink/55">{p.speaker}</span>}</span></li>)}</ol>
          </section>
        </div>

        <div className="space-y-6">
          {e.status === "Upcoming" && (
            <Link href="/contact?subject=Conference registration" className="flex items-center justify-center gap-2 bg-gold px-6 py-3.5 text-sm font-bold text-forest-950 hover:bg-gold-soft">
              Register for this conference <ArrowRight size={15} />
            </Link>
          )}
          {(e.speakers.length > 0 || (e.guests && e.guests.length > 0)) && (
            <section aria-label="People" className="border hairline bg-white p-6">
              {e.speakers.length > 0 && (
                <>
                  <h2 className="eyebrow">Speakers</h2>
                  <ul className="mt-3 space-y-2 text-sm">{e.speakers.map((s) => <li key={s}><Link href={`/members/${s}`} className="font-semibold text-primary">{speakerName(s)}</Link></li>)}</ul>
                </>
              )}
              {e.guests && e.guests.length > 0 && (
                <>
                  <h2 className={`eyebrow ${e.speakers.length > 0 ? "mt-6" : ""}`}>Patrons, chairmen & keynote</h2>
                  <ul className="mt-3 space-y-2 text-sm">{e.guests.map((g) => <li key={g} className="border-l-2 border-gold pl-3 text-ink/75">{g}</li>)}</ul>
                </>
              )}
            </section>
          )}
          <section aria-label="Documents" className="border hairline bg-white p-6">
            <h2 className="eyebrow">Documents & communiqué</h2>
            <ul className="mt-3 space-y-2 text-sm">{e.documents.length ? e.documents.map((d) => <li key={d}><Link href={`/knowledge/${d}`} className="font-semibold text-primary">{docTitles.get(d) ?? d}</Link></li>) : <li className="text-ink/50">Documents will be published after institutional review.</li>}</ul>
          </section>
          <p className="border hairline bg-paper p-5 text-[13px] leading-relaxed text-ink/60">{e.summary}</p>
        </div>
      </div>
    </div>
  );
}

export const revalidate = 300; // CMS-driven: refresh from MySQL every 5 minutes
