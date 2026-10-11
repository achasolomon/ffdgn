import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import Link from "next/link";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, Reveal } from "@/components/ui";
import { AssetImage } from "@/components/media";
import { listLeadership, listMembers } from "@/lib/repo";

export default async function TrusteesPage() {
  const copy = await getTemplateCopy("page-about-governance-board-of-trustees");

  const managed = await managedWebsitePage("/about/governance/board-of-trustees");
  if (managed) return managed;

  const [leadership, members] = await Promise.all([listLeadership(), listMembers()]);
  const bySlug = new Map(members.map((m) => [m.slug, m]));
  const chairSeat = leadership.find((l) => l.role === "Chairman, Board of Trustees");
  const chair = chairSeat?.member ? bySlug.get(chairSeat.member.slug) : undefined;

  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: copy("field-001"), href: templateRoute(copy("field-002")) }, { label: copy("field-003"), href: templateRoute(copy("field-004")) }, { label: copy("field-005") }]} />
      <SectionHeading eyebrow={copy("field-003")} title={copy("field-005")} lede={copy("field-006")} />

      {chair && (
        <Reveal>
          <div className="mt-8 grid gap-6 border border-gold/60 bg-white p-6 md:grid-cols-[160px_1fr] md:p-8">
            {chair.photo ? (
              <AssetImage src={chair.photo} alt={copy("field-019", {value1: chair.name})} width={320} height={320} className="h-36 w-36 rounded-full object-cover ring-2 ring-gold/60" sizes="144px" />
            ) : (
              <span className="grid h-36 w-36 place-items-center rounded-full bg-forest-950 font-display text-4xl text-gold" aria-hidden>
                {chair.name.replace("H.E. ", "")[0]}
              </span>
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{copy("field-007")}</p>
              <h2 className="font-display mt-1 text-3xl text-forest-950">{chair.name}</h2>
              <p className="mt-1 text-sm text-ink/60">{chair.title}</p>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/75">{chair.bio}</p>
              <Link href={`/members/${chair.slug}`} className="mt-4 inline-block text-sm font-semibold text-primary link-underline">{copy("field-008")}</Link>
            </div>
          </div>
        </Reveal>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {[
          [copy("field-009"), copy("field-010")],
          [copy("field-011"), copy("field-012")],
          [copy("field-013"), copy("field-014")],
        ].map(([t, d]) => (
          <div key={t} className="border hairline bg-white p-6">
            <h3 className="font-display text-xl text-forest-950">{t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">{d}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink/60">
        {copy("field-015")}<Link href={templateRoute(copy("field-016"))} className="font-semibold text-primary">{copy("field-017")}</Link> {copy("field-018")}</p>
    </div>
  );
}

export async function generateMetadata() {return await websiteMetadata("/about/governance/board-of-trustees") ?? {}; }
