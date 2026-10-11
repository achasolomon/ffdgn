import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading } from "@/components/ui";
import { listCommittees, listPeerReviewMembers } from "@/lib/repo";
export async function generateMetadata(): Promise<Metadata> {
  const copy = await getTemplateCopy("page-peer-review");

 const authored = await websiteMetadata("/peer-review");
 return authored ?? { title: copy("field-001") };
}
export default async function PeerReviewPage() {
  const copy = await getTemplateCopy("page-peer-review");

  const managed = await managedWebsitePage("/peer-review");
  if (managed) return managed;

  const [committees, members] = await Promise.all([listCommittees(), listPeerReviewMembers()]);
  const committee = committees.find(c => c.slug === "peer-review");
  return <div className="engagement-page mx-auto max-w-shell px-5 py-12"><Breadcrumbs items={[{label:copy("field-002"),href: templateRoute(copy("field-003"))},{label:copy("field-001")}]} /><SectionHeading as="h1" eyebrow={copy("field-004")} title={copy("field-005")} lede={committee?.mandate ?? copy("field-017")} /><section className="engagement-feature"><p className="eyebrow-light">{copy("field-006")}</p><h2 className="font-display">{copy("field-007")}</h2><p>{copy("field-008")}</p><Link href={templateRoute(copy("field-009"))} className="portrait-link">{copy("field-010")}<ArrowRight size={18} /></Link></section>{members.length > 0 && <section className="engagement-roster"><p className="eyebrow">{copy("field-011")}</p><h2 className="font-display">{copy("field-012")}</h2><div>{members.map(m => <article key={m.id}><p className="eyebrow">{m.zone}</p><h3 className="font-display">{m.name}</h3><p>{m.role}</p></article>)}</div></section>}<div className="editorial-note"><p className="eyebrow">{copy("field-013")}</p><p>{copy("field-014")}</p><Link href={templateRoute(copy("field-015"))} className="portrait-link">{copy("field-016")}<ArrowRight size={16} /></Link></div></div>;
}
export const revalidate = 300;
