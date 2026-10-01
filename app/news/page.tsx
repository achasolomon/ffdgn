import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading } from "@/components/ui";
import { AssetImage } from "@/components/media";
import { listNews } from "@/lib/repo";
import { formatDate } from "@/lib/search";

export default async function NewsIndex({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const news = await listNews();
  const cat = (await searchParams).cat ?? "";
  const filtered = news.filter((n) => !cat || n.category === cat);
  const [lead, ...rest] = filtered;
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "News & Media" }]} />
      <SectionHeading eyebrow="News & media" title="Official communications from the Forum" lede="News, press releases, statements and speeches — every item carries issuing body and date (institutional trust layer)." />
      <div className="mt-4 flex flex-wrap gap-2 text-[13px]">{["", "News", "Press Release", "Statement", "Speech", "Media Coverage"].map((c) => <Link key={c} href={c ? `/news?cat=${encodeURIComponent(c)}` : "/news"} className={`border px-3 py-1.5 ${cat === c || (!cat && !c) ? "bg-primary text-white border-primary" : "border-ink/20 hover:border-primary"}`}>{c || "All"}</Link>)}</div>
      {lead && (
        <Link href={`/news/${lead.slug}`} className="mt-8 grid border hairline bg-white hover:shadow-card md:grid-cols-[1fr_1.4fr]">
          {lead.image ? (
            <span className="relative block min-h-[220px]" aria-hidden>
              <AssetImage src={lead.image} alt="" width={640} height={440} className="absolute inset-0 h-full w-full object-cover" sizes="(max-width: 768px) 100vw, 400px" />
            </span>
          ) : (
            <div className="grid min-h-[220px] place-items-center bg-forest-950 text-gold"><p className="font-display text-xl px-8 text-center">Official {lead.category}</p></div>
          )}
          <div className="p-7"><p className="eyebrow">{lead.category} · {formatDate(lead.date)}</p><h2 className="font-display mt-2 text-3xl text-forest-950">{lead.title}</h2><p className="mt-3 text-sm text-ink/65">{lead.excerpt}</p></div>
        </Link>
      )}
      <ul className="mt-6 divide-y divide-ink/10 border-y hairline bg-white">
        {rest.map((n) => (
          <li key={n.slug}><Link href={`/news/${n.slug}`} className="flex gap-4 px-6 py-5 hover:bg-paper">
            {n.image && <span className="hidden h-16 w-24 shrink-0 overflow-hidden border hairline sm:block" aria-hidden><AssetImage src={n.image} alt="" width={192} height={128} className="h-full w-full object-cover" sizes="96px" /></span>}
            <span><span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45">{n.category} · {formatDate(n.date)} · {n.location}</span><span className="mt-1 block font-semibold text-forest-950">{n.title}</span><span className="block text-[13px] text-ink/55">{n.excerpt}</span></span>
          </Link></li>
        ))}
      </ul>
      {!lead && (
        <div className="mt-6 border hairline bg-white p-8 text-center" role="status">
          <p className="font-display text-xl text-forest-950">No items in this category yet</p>
          <p className="mt-2 text-sm text-ink/65">
            {cat ? <>Nothing has been filed under <strong>{cat}</strong> so far.</> : "No news items have been published yet."}
          </p>
          {cat && <Link href="/news" className="mt-4 inline-block border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white">Clear filter</Link>}
        </div>
      )}
    </div>
  );
}

export const metadata: Metadata = {
  title: "News & Media",
  description:
    "Official news, press releases, statements and speeches from the Forum of Former Deputy Governors of Nigeria, with issuing body and date on every item.",
  alternates: { canonical: "/news" },
};
