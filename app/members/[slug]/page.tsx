import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/chrome";
import { AssetImage } from "@/components/media";
import { getCommitteesMap, getDocTitles, getEventTitles, getMemberRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function MemberProfile({ params }: { params: Promise<{ slug: string }> }) {
  const m = await getMemberRepo((await params).slug);
  if (!m || m.visibility !== "PUBLIC") notFound();
  const [committeeNames, eventTitles, docTitles] = await Promise.all([
    getCommitteesMap(), getEventTitles(m.events), getDocTitles(m.publications),
  ]);
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "Members", href: "/members" }, { label: m.name }]} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit border hairline bg-white p-6 text-center">
          {m.photo ? (
            <AssetImage src={m.photo} alt={`Portrait of ${m.name}`} width={256} height={256} className="mx-auto h-32 w-32 rounded-full object-cover ring-2 ring-gold/60" sizes="128px" />
          ) : (
            <span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-forest-950 font-display text-4xl text-gold" aria-hidden>{m.name.replace("H.E. ", "").replace("Prof. ", "").replace("Rt. Hon. ", "")[0]}</span>
          )}
          <h1 className="font-display mt-4 text-2xl text-forest-950">{m.name}</h1>
          <p className="text-sm text-ink/60">{m.title}</p>
          {m.leadershipRole && <p className="mx-auto mt-3 w-fit border border-gold/70 bg-paper px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-gold-deep">{m.leadershipRole}</p>}
          <dl className="mt-5 border-t hairline pt-4 text-left text-[13px]">
            <div className="flex justify-between py-1"><dt className="text-ink/55">Category</dt><dd className="font-semibold">{m.category}</dd></div>
            <div className="flex justify-between py-1"><dt className="text-ink/55">Status</dt><dd className="font-semibold">{m.status}</dd></div>
          </dl>
          <p className="mt-4 text-[11.5px] text-ink/45">Private contact details are never shown publicly (§41).</p>
        </aside>
        <div>
          <section aria-label="Biography"><h2 className="eyebrow">Biography</h2><p className="mt-2 text-[15px] leading-relaxed text-ink/75">{m.bio}</p></section>
          <section aria-label="Public service" className="mt-8">
            <h2 className="eyebrow">Public service</h2>
            <table className="mt-3 w-full border hairline bg-white text-sm"><tbody>{m.service.map((s, i) => <tr key={i} className="border-b hairline last:border-0"><td className="px-5 py-3 font-semibold">{s.office}</td><td className="px-5 py-3 text-right text-ink/60">{s.startYear} – {s.endYear}</td></tr>)}</tbody></table>
          </section>
          <section aria-label="Forum engagement" className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="border hairline bg-white p-5"><h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">Committees</h3><ul className="mt-2 space-y-1.5 text-sm">{m.committees.length ? m.committees.map((c) => <li key={c}><Link href="/committees" className="font-medium text-primary">{committeeNames.get(c) ?? c}</Link></li>) : <li className="text-ink/50">—</li>}</ul></div>
            <div className="border hairline bg-white p-5"><h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">Events</h3><ul className="mt-2 space-y-1.5 text-sm">{m.events.length ? m.events.map((e) => <li key={e}><Link href={`/events/${e}`} className="font-medium text-primary">{eventTitles.get(e) ?? e}</Link></li>) : <li className="text-ink/50">—</li>}</ul></div>
            <div className="border hairline bg-white p-5"><h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">Publications</h3><ul className="mt-2 space-y-1.5 text-sm">{m.publications.length ? m.publications.map((d) => <li key={d}><Link href={`/knowledge/${d}`} className="font-medium text-primary">{docTitles.get(d) ?? d}</Link></li>) : <li className="text-ink/50">—</li>}</ul></div>
          </section>
        </div>
      </div>
    </div>
  );
}

export const revalidate = 300; // CMS-driven: refresh from MySQL every 5 minutes
