import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, Reveal } from "@/components/ui";
import { EditorialImage } from "@/components/editorial-image";
import { AssetImage } from "@/components/media";
import { listCommittees, listLeadership, listMembers } from "@/lib/repo";

export async function generateMetadata(): Promise<Metadata> {
 const authored = await websiteMetadata("/about/governance");
 return authored ?? { title: "Governance" };
}

export default async function GovernancePage() {
  const managed = await managedWebsitePage("/about/governance");
  if (managed) return managed;

  const [committees, leadership, members] = await Promise.all([listCommittees(), listLeadership(), listMembers()]);
  const bySlug = new Map(members.map((m) => [m.slug, m]));
  const bot = leadership.find((l) => l.role === "Chairman, Board of Trustees");
  const dg = leadership.find((l) => l.role === "Director-General");
  const botChair = bot?.member ? bySlug.get(bot.member.slug) : undefined;
  const dgMember = dg?.member ? bySlug.get(dg.member.slug) : undefined;

  const cards = [
    {
      href: "/about/governance/board-of-trustees",
      title: "Board of Trustees",
      text: "Guardianship of the mandate, values and long-term direction of the Forum.",
      person: botChair, role: bot?.role,
    },
    {
      href: "/about/governance/secretariat",
      title: "The Secretariat",
      text: "Administrative, research and coordination support to the Forum and its activities.",
      person: dgMember, role: dg?.role,
    },
    {
      href: "/leadership",
      title: "National Executive",
      text: "The Chairman, deputies, treasurer and officers leading day-to-day work.",
      person: undefined, role: `${leadership.length} seats`,
    },
    {
      href: "/committees",
      title: "Committees",
      text: "Standing working arms: policy, peer review, mentorship, research, partnerships.",
      person: undefined, role: `${committees.length} active`,
    },
  ] as const;

  return (
    <div className="governance-page mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "About", href: "/about" }, { label: "Governance" }]} />
      <SectionHeading as="h1" eyebrow="Governance" title="How the Forum governs itself" lede="Clear layers, documented approvals, auditable decisions — the same discipline the Forum recommends to public institutions." />
      <section className="governance-intro" aria-labelledby="governance-purpose">
        <EditorialImage src="/assets/hero/fdg.jpg" alt="Forum leaders gathered at an institutional engagement" className="governance-photo" />
        <div><p className="eyebrow">Purpose and stewardship</p><h2 id="governance-purpose" className="font-display">Clear responsibilities.<br />A common purpose.</h2><p>The Forum&rsquo;s governance connects long-term stewardship with the practical work of leadership, committees and the Secretariat. Explore the bodies entrusted with its direction and delivery.</p></div>
      </section>
      <div className="governance-bodies grid gap-5 md:grid-cols-2">
        {cards.map((c, i) => (
          <Reveal key={c.href} delay={Math.min(i * 0.05, 0.2)}>
            <Link href={c.href} className="governance-body group flex h-full gap-5">
              {c.person?.photo ? (
                <AssetImage src={c.person.photo} alt={`Portrait of ${c.person.name}`} width={160} height={160} className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-gold/60" sizes="80px" />
              ) : (
                <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-forest-950 font-display text-xl text-gold" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
              )}
              <span className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-deep">{c.role}</span>
                <span className="mt-1 block font-display text-2xl text-forest-950 group-hover:text-primary">{c.title}</span>
                <span className="mt-1.5 block text-sm leading-relaxed text-ink/65">{c.text}</span>
                {c.person && <span className="mt-2 block text-[13px] font-semibold text-primary">{c.person.name}</span>}
                <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary">Open <ArrowRight size={14} /></span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
      <section className="governance-accountability" aria-labelledby="governance-accountability"><p className="eyebrow-light">Accountability</p><h2 id="governance-accountability" className="font-display">Responsibility at every level.</h2><p>Clear responsibilities and recorded decisions support continuity and accountability across the Forum&rsquo;s work.</p><Link href="/about/governance/board-of-trustees" className="portrait-link">Explore the Board of Trustees <ArrowRight size={16} /></Link></section>
    </div>
  );
}

export const revalidate = 300;
