import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, EmptyState } from "@/components/ui";
import { Stagger, StaggerItem } from "@/components/motion";
import { AssetImage } from "@/components/media";
import { listLeadership } from "@/lib/repo";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getTemplateCopy("page-leadership");

 const authored = await websiteMetadata("/leadership");
 return authored ?? { title: copy("field-001") };
}
export default async function LeadershipPage() {
  const copy = await getTemplateCopy("page-leadership");

  const managed = await managedWebsitePage("/leadership");
  if (managed) return managed;

  const leadership = await listLeadership();
  const tiers = [...new Set(leadership.map((seat) => seat.tier))].sort((a, b) => a - b);
  return <div className="leadership-page mx-auto max-w-shell px-5 py-12">
    <Breadcrumbs items={[{ label: copy("field-002"), href: templateRoute(copy("field-003")) }, { label: copy("field-001") }]} />
    <SectionHeading as="h1" eyebrow={copy("field-001")} title={copy("field-004")} lede={copy("field-005")} />
    <div className="people-introduction"><p className="eyebrow">{copy("field-006")}</p><p>{copy("field-007")}</p></div>
    {leadership.length === 0 && <EmptyState title={copy("field-008")} description={copy("field-009")} />}
    {tiers.map((tier, index) => <section key={tier} className={`leadership-tier ${index === 0 ? "leadership-tier-featured" : ""}`} aria-labelledby={`tier-${tier}`}>
      <div className="tier-heading"><p className="eyebrow">{copy("field-010")}{String(index + 1).padStart(2, "0")}</p><h2 id={`tier-${tier}`} className="font-display">{index === 0 ? copy("field-011") : copy("field-012")}</h2></div>
      <Stagger className="leadership-portraits">{leadership.filter((seat) => seat.tier === tier).map((seat, seatIndex) => <StaggerItem key={`${seat.role}-${seat.member?.slug ?? seatIndex}`}>
        <article className="portrait-card">
          <div className="portrait-photo">{seat.member?.photo ? <AssetImage src={seat.member.photo} alt={copy("field-019", {value1: seat.member.name})} width={600} height={750} className="h-full w-full object-cover object-top" sizes="(max-width: 768px) 100vw, 33vw" /> : <span className="font-display" aria-hidden>{seat.member?.name.slice(0, 1) ?? copy("field-020")}</span>}</div>
          <div className="portrait-copy"><p className="eyebrow">{seat.role}</p><h3 className="font-display">{seat.member?.name ?? copy("field-021")}</h3>{seat.member?.title && <p className="portrait-title">{seat.member.title}</p>}<p className="portrait-remit">{seat.remit}</p>{seat.member && <Link href={`/members/${seat.member.slug}`} className="portrait-link">{copy("field-013")}<ArrowRight size={16} /></Link>}</div>
        </article>
      </StaggerItem>)}</Stagger>
    </section>)}
    <div className="editorial-note"><p className="eyebrow">{copy("field-014")}</p><p>{copy("field-015")}<Link href={templateRoute(copy("field-016"))}>{copy("field-017")}</Link>{copy("field-018")}</p></div>
  </div>;
}
export const revalidate = 300;
