import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import Link from "next/link";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, Reveal } from "@/components/ui";
import { AssetImage } from "@/components/media";
import { listLeadership, listMembers } from "@/lib/repo";

export default async function TrusteesPage() {
  const managed = await managedWebsitePage("/about/governance/board-of-trustees");
  if (managed) return managed;

  const [leadership, members] = await Promise.all([listLeadership(), listMembers()]);
  const bySlug = new Map(members.map((m) => [m.slug, m]));
  const chairSeat = leadership.find((l) => l.role === "Chairman, Board of Trustees");
  const chair = chairSeat?.member ? bySlug.get(chairSeat.member.slug) : undefined;

  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "About", href: "/about" }, { label: "Governance", href: "/about/governance" }, { label: "Board of Trustees" }]} />
      <SectionHeading eyebrow="Governance" title="Board of Trustees" lede="Guardianship of the mandate, values and long-term direction of the Forum." />

      {chair && (
        <Reveal>
          <div className="mt-8 grid gap-6 border border-gold/60 bg-white p-6 md:grid-cols-[160px_1fr] md:p-8">
            {chair.photo ? (
              <AssetImage src={chair.photo} alt={`Portrait of ${chair.name}`} width={320} height={320} className="h-36 w-36 rounded-full object-cover ring-2 ring-gold/60" sizes="144px" />
            ) : (
              <span className="grid h-36 w-36 place-items-center rounded-full bg-forest-950 font-display text-4xl text-gold" aria-hidden>
                {chair.name.replace("H.E. ", "")[0]}
              </span>
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Chairman, Board of Trustees</p>
              <h2 className="font-display mt-1 text-3xl text-forest-950">{chair.name}</h2>
              <p className="mt-1 text-sm text-ink/60">{chair.title}</p>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/75">{chair.bio}</p>
              <Link href={`/members/${chair.slug}`} className="mt-4 inline-block text-sm font-semibold text-primary link-underline">Full profile →</Link>
            </div>
          </div>
        </Reveal>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {[
          ["Mandate", "Custody of the Forum's constitution, values and strategic direction across administrations."],
          ["Oversight", "The Board reviews major institutional decisions and safeguards the Forum's non-partisan character."],
          ["Continuity", "Trustees ensure institutional memory and leadership succession beyond any single tenure."],
        ].map(([t, d]) => (
          <div key={t} className="border hairline bg-white p-6">
            <h3 className="font-display text-xl text-forest-950">{t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">{d}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink/60">
        Full trustee composition is maintained by the Secretariat. <Link href="/contact" className="font-semibold text-primary">Contact the Secretariat</Link> for the current roll.
      </p>
    </div>
  );
}

export async function generateMetadata() {return await websiteMetadata("/about/governance/board-of-trustees") ?? {}; }
