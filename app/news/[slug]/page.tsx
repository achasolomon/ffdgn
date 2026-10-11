import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/chrome";
import { AssetImage } from "@/components/media";
import { getDocTitles, getEventTitles, getNewsRepo, listNews } from "@/lib/repo";
import { formatDate } from "@/lib/search";

export default async function NewsDetail({ params }: { params: Promise<{ slug: string }> }) {
  const copy = await getTemplateCopy("page-news-slug");

  const managed = await managedWebsitePage(`/news/${(await params).slug}`);
  if (managed) return managed;

  const { slug } = await params;
  const n = await getNewsRepo(slug);
  if (!n) notFound();
  const all = await listNews();
  const related = all.filter((x) => x.slug !== n.slug && x.category === n.category).slice(0, 3);
  const fallback = related.length === 0 ? all.filter((x) => x.slug !== n.slug).slice(0, 3) : related;
  const [eventTitles, docTitles] = await Promise.all([
    getEventTitles(n.relatedEvent ? [n.relatedEvent] : []),
    getDocTitles(n.relatedDocs ?? []),
  ]);

  return (
    <article className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: copy("field-001"), href: templateRoute(copy("field-002")) }, { label: n.title }]} />

      {n.image && (
        <figure className="mt-6 overflow-hidden border hairline bg-white">
          <AssetImage src={n.image} alt={n.title} width={1360} height={620} className="aspect-[21/10] w-full object-cover" sizes="(max-width: 1360px) 100vw, 1360px" priority />
        </figure>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <p className="eyebrow">{n.category}</p>
          <h1 className="font-display mt-2 text-4xl leading-tight text-forest-950 md:text-[2.75rem]">{n.title}</h1>
          <p className="mt-4 border-l-2 border-gold pl-4 font-display text-xl italic leading-relaxed text-ink/70">{n.excerpt}</p>
          <div className="mt-6 space-y-4 text-[16px] leading-[1.8] text-ink/80">{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>
          <footer className="mt-8 border hairline bg-paper p-5 text-[13px] text-ink/65">
            <p><strong className="text-forest-950">{copy("field-003")}{n.category.toLowerCase()}</strong> {copy("field-004")}{formatDate(n.date)}{copy("field-005")}</p>
          </footer>
          <Link href={templateRoute(copy("field-002"))} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={15} /> {copy("field-006")}</Link>
        </div>

        <aside className="space-y-6">
          <div className="h-fit border hairline bg-forest-950 p-6 text-white">
            <p className="eyebrow-light">{copy("field-007")}</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center gap-2.5"><CalendarDays size={15} className="shrink-0 text-gold" /><span>{formatDate(n.date)}</span></div>
              <div className="flex items-center gap-2.5"><MapPin size={15} className="shrink-0 text-gold" /><span>{n.location}</span></div>
            </dl>
            {(eventTitles.size > 0 || docTitles.size > 0) && (
              <div className="mt-4 border-t border-white/15 pt-4 text-sm">
                {[...eventTitles].map(([slug, title]) => (
                  <p key={slug} className="mt-1.5">{copy("field-008")}<Link href={`/events/${slug}`} className="font-semibold text-gold link-underline">{title}</Link></p>
                ))}
                {[...docTitles].map(([slug, title]) => (
                  <p key={slug} className="mt-1.5">{copy("field-009")}<Link href={`/knowledge/${slug}`} className="font-semibold text-gold link-underline">{title}</Link></p>
                ))}
              </div>
            )}
          </div>
          <div className="border hairline bg-white p-6" aria-label={copy("field-010")}>
            <p className="eyebrow">{copy("field-010")}</p>
            <ul className="mt-3 space-y-4">
              {fallback.map((r) => (
                <li key={r.slug}>
                  <Link href={`/news/${r.slug}`} className="group flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45">{r.category} {copy("field-011")}{formatDate(r.date)}</span>
                      <span className="block text-sm font-semibold leading-snug text-forest-950 group-hover:text-primary">{r.title}</span>
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-ink/30 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </article>
  );
}

export async function generateMetadata({params}: {params:Promise<{slug:string}>}) { return await websiteMetadata(`/news/${(await params).slug}`) ?? {}; }
