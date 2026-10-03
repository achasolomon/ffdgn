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
 const authored = await websiteMetadata("/leadership");
 return authored ?? { title: "Leadership" };
}
export default async function LeadershipPage() {
  const managed = await managedWebsitePage("/leadership");
  if (managed) return managed;

  const leadership = await listLeadership();
  const tiers = [...new Set(leadership.map((seat) => seat.tier))].sort((a, b) => a - b);
  return <div className="leadership-page mx-auto max-w-shell px-5 py-12">
    <Breadcrumbs items={[{ label: "About", href: "/about" }, { label: "Leadership" }]} />
    <SectionHeading as="h1" eyebrow="Leadership" title="Guided by experience, united by purpose" lede="Meet the people entrusted with the Forum's direction, stewardship and service to Nigeria." />
    <div className="people-introduction"><p className="eyebrow">Our people</p><p>Leadership brings together the experience of public service with a shared commitment to the Forum&rsquo;s purpose. Explore each profile to discover the people behind its work.</p></div>
    {leadership.length === 0 && <EmptyState title="Leadership profiles are being prepared" description="The Secretariat will publish the current leadership here." />}
    {tiers.map((tier, index) => <section key={tier} className={`leadership-tier ${index === 0 ? "leadership-tier-featured" : ""}`} aria-labelledby={`tier-${tier}`}>
      <div className="tier-heading"><p className="eyebrow">Stewardship / {String(index + 1).padStart(2, "0")}</p><h2 id={`tier-${tier}`} className="font-display">{index === 0 ? "Leading the Forum" : "Leadership and service"}</h2></div>
      <Stagger className="leadership-portraits">{leadership.filter((seat) => seat.tier === tier).map((seat, seatIndex) => <StaggerItem key={`${seat.role}-${seat.member?.slug ?? seatIndex}`}>
        <article className="portrait-card">
          <div className="portrait-photo">{seat.member?.photo ? <AssetImage src={seat.member.photo} alt={`Portrait of ${seat.member.name}`} width={600} height={750} className="h-full w-full object-cover object-top" sizes="(max-width: 768px) 100vw, 33vw" /> : <span className="font-display" aria-hidden>{seat.member?.name.slice(0, 1) ?? "F"}</span>}</div>
          <div className="portrait-copy"><p className="eyebrow">{seat.role}</p><h3 className="font-display">{seat.member?.name ?? "Position vacant"}</h3>{seat.member?.title && <p className="portrait-title">{seat.member.title}</p>}<p className="portrait-remit">{seat.remit}</p>{seat.member && <Link href={`/members/${seat.member.slug}`} className="portrait-link">Explore profile <ArrowRight size={16} /></Link>}</div>
        </article>
      </StaggerItem>)}</Stagger>
    </section>)}
    <div className="editorial-note"><p className="eyebrow">Institutional continuity</p><p>Discover the people and milestones that shaped the Forum in <Link href="/about/history">our history</Link>.</p></div>
  </div>;
}
export const revalidate = 300;
