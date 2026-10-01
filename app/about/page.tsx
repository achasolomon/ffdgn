import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading } from "@/components/ui";
import { AssetImage } from "@/components/media";
export const metadata: Metadata = { title: "About the Forum" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "About the Forum" }]} />
      <SectionHeading eyebrow="The Forum" title="A national forum for experience, dialogue and institutional continuity" lede="The Forum of Former Deputy Governors of Nigeria (FFDGN) is a non-partisan organisation of former and serving deputy governors committed to national development through knowledge sharing, policy advocacy, mentorship and strategic partnerships." />
      <div className="mt-8 grid gap-6 border hairline bg-white p-6 sm:grid-cols-2" aria-label="Institutional identity">
        <figure>
          <AssetImage src="/assets/brand/logo_fdgn.jpeg" alt="Official seal of the Forum of Former Deputy Governors of Nigeria" width={800} height={500} className="aspect-[8/5] w-full object-contain bg-white" sizes="(max-width: 768px) 100vw, 600px" />
          <figcaption className="mt-2 text-[12px] text-ink/50">The official seal of the Forum</figcaption>
        </figure>
        <figure>
          <AssetImage src="/assets/brand/logo-whitebg.jpg" alt="FFDGN wordmark" width={800} height={500} className="aspect-[8/5] w-full object-contain bg-white" sizes="(max-width: 768px) 100vw, 600px" />
          <figcaption className="mt-2 text-[12px] text-ink/50">Forum wordmark</figcaption>
        </figure>
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="prose max-w-none text-[15px] leading-relaxed text-ink/75">
          <h2 className="font-display text-2xl text-forest-950">Mandate & objectives</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            <li>Provide a structured platform for experience-sharing among former and serving Deputy Governors.</li>
            <li>Convert executive experience into evidence-based policy recommendations.</li>
            <li>Strengthen democratic governance through peer review, dialogue and mentorship.</li>
            <li>Preserve institutional memory — conferences, communiqués, reports and decisions — as permanent public knowledge.</li>
            <li>Build strategic partnerships that advance good governance and sustainable development.</li>
          </ul>
          <h2 className="font-display mt-8 text-2xl text-forest-950">Non-partisan character</h2>
          <p className="mt-3">Membership cuts across party, region and generation. The Forum speaks as an institution — through approved communiqués, reports and statements — never as individuals.</p>
          <h2 className="font-display mt-8 text-2xl text-forest-950">Patrons</h2>
          <p className="mt-3">The Forum enjoys the guidance of its Grand Patron, former President Dr Goodluck Ebele Jonathan, GCFR, and National Patrons H.E. Sen. Aliyu M. Wamakko, CON and H.E. Dr Abdullahi Umar Ganduje, CON. Meet them and the full hierarchy on the <Link href="/leadership" className="font-semibold text-primary">leadership page</Link>.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/about/history" className="bg-primary px-5 py-2.5 text-sm font-semibold text-white">Our history →</Link>
            <Link href="/about/governance" className="border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary">Governance →</Link>
            <Link href="/leadership" className="border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary">Leadership →</Link>
          </div>
        </div>
        <aside className="h-fit border border-gold/60 bg-white p-6" aria-label="At a glance">
          <p className="eyebrow-gold">At a glance</p>
          <dl className="mt-4 space-y-4 text-sm">
            {[["Founded", "2008"], ["Seat", "Abuja, Nigeria"], ["Membership", "Former & serving Deputy Governors"], ["Character", "Non-partisan"], ["Outputs", "Communiqués · Reports · Policy briefs"]].map(([k, v]) => (
              <div key={k} className="border-b hairline pb-3"><dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/45">{k}</dt><dd className="mt-0.5 font-semibold text-forest-950">{v}</dd></div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  );
}
