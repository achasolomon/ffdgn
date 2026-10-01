import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Download, Quote } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { AssetImage } from "@/components/media";
import { getDocRepo, getEventTitles, listDocs } from "@/lib/repo";
import { formatDate } from "@/lib/search";

const COVERS: Record<string, string> = {
  "Communiqué": "/assets/news/2024-communique-publication.jpg",
  "Policy Brief": "/assets/news/state-federal-collaboration-call.jpg",
  "Report": "/assets/events/3rd-annual-conference.jpg",
  "Research": "/assets/news/strategic-meeting-2025.jpg",
  "Position Paper": "/assets/news/polish-nigeria-partnership.jpg",
  "Speech": "/assets/gallery/gallery8.jpg",
};

export default async function DocPage({ params }: { params: { slug: string } }) {
  const d = await getDocRepo(params.slug);
  // Public route serves Published + PUBLIC only — restricted records 404 here
  // and remain available to authorised roles via the portal + /api/v1.
  if (!d || d.visibility !== "PUBLIC" || d.status !== "Published") notFound();
  const [eventTitles, all] = await Promise.all([getEventTitles(d.event ? [d.event] : []), listDocs()]);
  const related = all
    .filter((x) => x.slug !== d.slug && x.status === "Published" && x.visibility === "PUBLIC" &&
      (x.topic === d.topic || x.type === d.type))
    .slice(0, 3);
  const citation = `${d.author} (${d.year}). ${d.title}. Forum of Former Deputy Governors of Nigeria, Knowledge Centre.`;
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "Knowledge Centre", href: "/knowledge" }, { label: d.title }]} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="eyebrow">{d.type} · {d.year}</p>
          <h1 className="font-display mt-2 text-4xl leading-tight text-forest-950">{d.title}</h1>
          <figure className="mt-6 border hairline bg-white p-2">
            <AssetImage src={COVERS[d.type] ?? "/assets/hero/national.jpg"} alt="" width={1024} height={420} className="aspect-[21/9] w-full object-cover" sizes="(max-width: 1024px) 100vw, 800px" />
          </figure>
          <p className="mt-5 text-[15px] leading-relaxed text-ink/75">{d.summary}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {d.fileUrl ? (
              <a href={d.fileUrl} download aria-label={`Download PDF, ${d.size}`}
                className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-semibold text-white">
                <Download size={15} /> Download PDF ({d.size})
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 border border-ink/15 px-5 py-2.5 text-sm text-ink/50">
                <Download size={15} /> PDF not yet uploaded ({d.size})
              </span>
            )}
            <Link href="/knowledge" className="border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary">← Back to Knowledge Centre</Link>
          </div>
          <div className="mt-8 border hairline bg-white p-6 text-[13px] text-ink/60">
            <p className="eyebrow">Trust & provenance</p>
            <p className="mt-2">Issued by {d.author} · {formatDate(d.published)} · {d.status}</p>
            {d.event && eventTitles.get(d.event) && <p className="mt-1">Related event: <Link href={`/events/${d.event}`} className="font-semibold text-primary">{eventTitles.get(d.event)}</Link></p>}
            {d.committee && <p className="mt-1">Originating committee: <Link href="/committees" className="font-semibold text-primary">{d.committee}</Link></p>}
          </div>
          <div className="mt-6 border border-gold/60 bg-paper p-5" aria-label="Suggested citation">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gold-deep"><Quote size={13} /> Cite this record</p>
            <p className="mt-2 font-display text-[15px] italic leading-relaxed text-forest-950">{citation}</p>
          </div>
        </div>
        <aside className="space-y-6">
          <div className="h-fit border hairline bg-white p-6">
            <p className="eyebrow">Metadata</p>
            <dl className="mt-3 space-y-3 text-sm">
              {[["Document type", d.type], ["Topic", d.topic], ["Author", d.author], ["Published", formatDate(d.published)], ["Pages", String(d.pages)], ["File size", d.size], ["Downloads", d.downloads.toLocaleString()], ["Visibility", d.visibility]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b hairline pb-2"><dt className="text-ink/55">{k}</dt><dd className="text-right font-semibold text-forest-950">{v}</dd></div>
              ))}
            </dl>
          </div>
          {related.length > 0 && (
            <div className="border hairline bg-white p-6" aria-label="Related publications">
              <p className="eyebrow">Related publications</p>
              <ul className="mt-3 space-y-4">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/knowledge/${r.slug}`} className="group flex items-center justify-between gap-3">
                      <span>
                        <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45">{r.type} · {r.year}</span>
                        <span className="block text-sm font-semibold leading-snug text-forest-950 group-hover:text-primary">{r.title}</span>
                      </span>
                      <ArrowRight size={15} className="shrink-0 text-ink/30 group-hover:text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export const revalidate = 300; // CMS-driven: refresh from MySQL every 5 minutes
