import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
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
  const copy = await getTemplateCopy("page-about-governance");

 const authored = await websiteMetadata("/about/governance");
 return authored ?? { title: copy("field-001") };
}

export default async function GovernancePage() {
  const copy = await getTemplateCopy("page-about-governance");

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
      href: templateRoute(copy("field-002")),
      title: copy("field-003"),
      text: copy("field-004"),
      person: botChair, role: bot?.role,
    },
    {
      href: templateRoute(copy("field-005")),
      title: copy("field-006"),
      text: copy("field-007"),
      person: dgMember, role: dg?.role,
    },
    {
      href: templateRoute(copy("field-008")),
      title: copy("field-009"),
      text: copy("field-010"),
      person: undefined, role: `${leadership.length} seats`,
    },
    {
      href: templateRoute(copy("field-011")),
      title: copy("field-012"),
      text: copy("field-013"),
      person: undefined, role: `${committees.length} active`,
    },
  ] as const;

  return (
    <div className="governance-page mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: copy("field-014"), href: templateRoute(copy("field-015")) }, { label: copy("field-001") }]} />
      <SectionHeading as="h1" eyebrow={copy("field-001")} title={copy("field-016")} lede={copy("field-017")} />
      <section className="governance-intro" aria-labelledby="governance-purpose">
        <EditorialImage src={copy("field-018")} alt={copy("field-019")} className="governance-photo" />
        <div><p className="eyebrow">{copy("field-020")}</p><h2 id="governance-purpose" className="font-display">{copy("field-021")}<br />{copy("field-022")}</h2><p>{copy("field-023")}</p></div>
      </section>
      <div className="governance-bodies grid gap-5 md:grid-cols-2">
        {cards.map((c, i) => (
          <Reveal key={c.href} delay={Math.min(i * 0.05, 0.2)}>
            <Link href={c.href} className="governance-body group flex h-full gap-5">
              {c.person?.photo ? (
                <AssetImage src={c.person.photo} alt={copy("field-029", {value1: c.person.name})} width={160} height={160} className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-gold/60" sizes="80px" />
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
                <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary">{copy("field-024")}<ArrowRight size={14} /></span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
      <section className="governance-accountability" aria-labelledby="governance-accountability"><p className="eyebrow-light">{copy("field-025")}</p><h2 id="governance-accountability" className="font-display">{copy("field-026")}</h2><p>{copy("field-027")}</p><Link href={templateRoute(copy("field-002"))} className="portrait-link">{copy("field-028")}<ArrowRight size={16} /></Link></section>
    </div>
  );
}

export const revalidate = 300;
