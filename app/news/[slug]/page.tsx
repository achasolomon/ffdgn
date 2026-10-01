import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/chrome";
import { AssetImage, MediaCredit } from "@/components/media";
import { getDocTitles, getEventTitles, getNewsRepo } from "@/lib/repo";
import { formatDate } from "@/lib/search";

export default async function NewsDetail({ params }: { params: { slug: string } }) {
  const n = await getNewsRepo(params.slug);
  if (!n) notFound();
  const [eventTitles, docTitles] = await Promise.all([
    getEventTitles(n.relatedEvent ? [n.relatedEvent] : []),
    getDocTitles(n.relatedDocs ?? []),
  ]);
  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      <Breadcrumbs items={[{ label: "News & Media", href: "/news" }, { label: n.title }]} />
      <p className="eyebrow mt-6">{n.category} · {formatDate(n.date)} · {n.location}</p>
      <h1 className="font-display mt-2 text-4xl leading-tight text-forest-950">{n.title}</h1>
      <p className="mt-3 border-l-2 border-gold pl-4 text-[15px] italic text-ink/65">{n.excerpt}</p>
      {n.image && (
        <figure className="mt-6 border hairline bg-white p-2">
          <AssetImage src={n.image} alt={n.title} width={1024} height={576} className="aspect-video w-full object-cover" sizes="(max-width: 768px) 100vw, 768px" priority />
          <figcaption className="px-2 py-1"><MediaCredit item={{ photographer: "FFDGN Media Unit", copyright: "© 2026 FFDGN" }} /></figcaption>
        </figure>
      )}
      <div className="mt-6 space-y-4 text-[15.5px] leading-relaxed text-ink/80">{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>
      <footer className="mt-8 border hairline bg-paper p-5 text-[13px] text-ink/65">
        <p><strong className="text-forest-950">Official {n.category.toLowerCase()}</strong> — Issued by the Secretariat, {formatDate(n.date)}.</p>
        {n.relatedEvent && eventTitles.get(n.relatedEvent) && <p className="mt-1">Related: <Link href={`/events/${n.relatedEvent}`} className="font-semibold text-primary">{eventTitles.get(n.relatedEvent)} →</Link></p>}
        {n.relatedDocs?.map((d) => docTitles.get(d) ? <p key={d} className="mt-1">Document: <Link href={`/knowledge/${d}`} className="font-semibold text-primary">{docTitles.get(d)} →</Link></p> : null)}
      </footer>
    </article>
  );
}

export const revalidate = 300; // CMS-driven: refresh from MySQL every 5 minutes
