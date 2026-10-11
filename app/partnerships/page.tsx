import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
import Link from "next/link";
import { ArrowRight, Handshake } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, Reveal } from "@/components/ui";
import { AssetImage } from "@/components/media";
import { listPartnerships } from "@/lib/repo";

export default async function PartnershipsPage() {
  const copy = await getTemplateCopy("page-partnerships");

  const partnerships = await listPartnerships();
  const withLogos = partnerships.filter((p) => p.logo);
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: copy("field-001") }, { label: copy("field-002") }]} />
      <SectionHeading as="h1" eyebrow={copy("field-001")} title={copy("field-002")} lede={copy("field-003")} />

      {/* Logo band */}
      {withLogos.length > 0 && (
        <div className="mt-8 border hairline bg-white px-6 py-5" aria-label={copy("field-004")}>
          <div className="flex flex-wrap items-center justify-start gap-x-10 gap-y-4">
            {withLogos.map((p) => (
              <span key={p.slug} title={p.name} className="grid h-14 w-28 place-items-center opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0">
                <AssetImage src={p.logo!} alt={copy("field-013", {value1: p.name})} width={224} height={112} className="max-h-14 w-auto max-w-[112px] object-contain" sizes="112px" />
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {partnerships.map((p, i) => (
          <Reveal key={p.slug} delay={Math.min(i * 0.05, 0.2)}>
            {/* `id` is the anchor institutional search links to (`/partnerships#slug`),
                so a search hit lands on the specific partner. `scroll-mt` clears the
                sticky header, which would otherwise cover the row it scrolled to. */}
            <article id={p.slug} className="flex h-full scroll-mt-28 flex-col border hairline bg-white p-6 hover:shadow-card sm:flex-row sm:gap-6">
              {p.logo ? (
                <span className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden border hairline bg-white p-2" role="img" aria-label={copy("field-013", {value1: p.name})}>
                  <AssetImage src={p.logo} alt="" width={192} height={192} className="max-h-full max-w-full object-contain" sizes="96px" />
                </span>
              ) : (
                <span className="grid h-24 w-24 shrink-0 place-items-center bg-forest-950 font-display text-3xl text-gold" aria-hidden>{p.name[0]}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-deep">
                  {p.type} <span className="ml-2 border border-gold/60 bg-paper px-1.5 py-0.5 text-ink/60">{copy("field-005")}{p.since}</span>
                </p>
                <h2 className="font-display mt-1 text-2xl leading-tight text-forest-950">{p.name}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink/65">{p.purpose}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={copy("field-006")}>
                  {p.cooperation.slice(0, 4).map((c) => (
                    <li key={c} className="border hairline bg-paper px-2.5 py-1 text-[12px] font-medium text-ink/70">{c}</li>
                  ))}
                </ul>
                {p.events.length > 0 && (
                  <p className="mt-3 text-[13px]">{copy("field-007")}{p.events.map((e) => <Link key={e} href={`/events/${e}`} className="font-semibold text-primary">{copy("field-008")}</Link>)}</p>
                )}
              </div>
            </article>
          </Reveal>
        ))}

        {/* Partner CTA */}
        <Reveal delay={0.1}>
          <Link href={templateRoute(copy("field-009"))} className="group flex h-full min-h-[220px] flex-col justify-center border border-dashed border-primary/40 bg-paper p-6 hover:bg-white">
            <Handshake size={26} className="text-primary" />
            <span className="font-display mt-3 text-2xl text-forest-950">{copy("field-010")}</span>
            <span className="mt-2 max-w-sm text-sm text-ink/60">{copy("field-011")}</span>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">{copy("field-012")}<ArrowRight size={15} /></span>
          </Link>
        </Reveal>
      </div>
    </div>
  );
}

export const revalidate = 300; // CMS-driven: refresh from MySQL every 5 minutes
