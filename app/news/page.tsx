import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading } from "@/components/ui";
import { AssetImage } from "@/components/media";
import { listNews } from "@/lib/repo";
import { formatDate } from "@/lib/search";

export default async function NewsIndex({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const copy = await getTemplateCopy("page-news");

  const managed = await managedWebsitePage("/news");
  if (managed) return managed;

  const news = await listNews();
  const cat = (await searchParams).cat ?? "";
  const filtered = news.filter((n) => !cat || n.category === cat);
  const [lead, ...rest] = filtered;
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: copy("field-001") }]} />
      <SectionHeading as="h1" eyebrow={copy("field-002")} title={copy("field-003")} lede={copy("field-004")} />
      <div className="mt-4 flex flex-wrap gap-2 text-[13px]">{[{value:"",label:"All"},{value:"News",label:copy("field-005")},{value:"Press Release",label:copy("field-006")},{value:"Statement",label:copy("field-007")},{value:"Speech",label:copy("field-008")},{value:"Media Coverage",label:copy("field-009")}].map(({value:c,label}) => <Link key={c} href={templateRoute(c ? `/news?cat=${encodeURIComponent(c)}` : copy("field-010"))} className={`border px-3 py-1.5 ${cat === c || (!cat && !c) ? "bg-primary text-white border-primary" : "border-ink/20 hover:border-primary"}`}>{label}</Link>)}</div>
      {lead && (
        <Link href={`/news/${lead.slug}`} className="mt-8 grid border hairline bg-white hover:shadow-card md:grid-cols-[1fr_1.4fr]">
          {lead.image ? (
            <span className="relative block min-h-[220px]" aria-hidden>
              <AssetImage src={lead.image} alt="" width={640} height={440} className="absolute inset-0 h-full w-full object-cover" sizes="(max-width: 768px) 100vw, 400px" />
            </span>
          ) : (
            <div className="grid min-h-[220px] place-items-center bg-forest-950 text-gold"><p className="font-display text-xl px-8 text-center">{copy("field-011")}{lead.category}</p></div>
          )}
          <div className="p-7"><p className="eyebrow">{lead.category} {copy("field-012")}{formatDate(lead.date)}</p><h2 className="font-display mt-2 text-3xl text-forest-950">{lead.title}</h2><p className="mt-3 text-sm text-ink/65">{lead.excerpt}</p></div>
        </Link>
      )}
      <ul className="mt-6 divide-y divide-ink/10 border-y hairline bg-white">
        {rest.map((n) => (
          <li key={n.slug}><Link href={`/news/${n.slug}`} className="flex gap-4 px-6 py-5 hover:bg-paper">
            {n.image && <span className="hidden h-16 w-24 shrink-0 overflow-hidden border hairline sm:block" aria-hidden><AssetImage src={n.image} alt="" width={192} height={128} className="h-full w-full object-cover" sizes="96px" /></span>}
            <span><span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45">{n.category} {copy("field-012")}{formatDate(n.date)} {copy("field-012")}{n.location}</span><span className="mt-1 block font-semibold text-forest-950">{n.title}</span><span className="block text-[13px] text-ink/55">{n.excerpt}</span></span>
          </Link></li>
        ))}
      </ul>
      {!lead && (
        <div className="mt-6 border hairline bg-white p-8 text-center" role="status">
          <p className="font-display text-xl text-forest-950">{copy("field-013")}</p>
          <p className="mt-2 text-sm text-ink/65">
            {cat ? <>{copy("field-014")}<strong>{cat}</strong> {copy("field-015")}</> : copy("field-016")}
          </p>
          {cat && <Link href={templateRoute(copy("field-017"))} className="mt-4 inline-block border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white">{copy("field-018")}</Link>}
        </div>
      )}
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getTemplateCopy("page-news");

 const authored = await websiteMetadata("/news");
 return authored ?? {
  title: copy("field-001"),
  description:
    copy("field-019"),
  alternates: { canonical: "/news" },
};
}
