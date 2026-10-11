import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading } from "@/components/ui";
import { listCommittees } from "@/lib/repo";
export async function generateMetadata(): Promise<Metadata> {
  const copy = await getTemplateCopy("page-mentorship");

 const authored = await websiteMetadata("/mentorship");
 return authored ?? { title: copy("field-001") };
}
export default async function MentorshipPage() {
  const copy = await getTemplateCopy("page-mentorship");

  const managed = await managedWebsitePage("/mentorship");
  if (managed) return managed;

  const committees = await listCommittees();
  const committee = committees.find(c => c.slug === "mentorship");
  return <div className="engagement-page mx-auto max-w-shell px-5 py-12"><Breadcrumbs items={[{label:copy("field-002"),href: templateRoute(copy("field-003"))},{label:copy("field-001")}]} /><SectionHeading as="h1" eyebrow={copy("field-001")} title={copy("field-004")} lede={committee?.mandate ?? copy("field-023")} /><section className="engagement-feature"><p className="eyebrow-light">{copy("field-005")}</p><h2 className="font-display">{copy("field-006")}</h2><p>{copy("field-007")}</p><Link href={templateRoute(copy("field-008"))} className="portrait-link">{copy("field-009")}<ArrowRight size={18} /></Link></section><section className="mentorship-perspectives"><article><p className="eyebrow">{copy("field-010")}</p><h2 className="font-display">{copy("field-011")}</h2><p>{copy("field-012")}</p><Link href={templateRoute(copy("field-008"))} className="portrait-link">{copy("field-013")}<ArrowRight size={16} /></Link></article><article><p className="eyebrow">{copy("field-014")}</p><h2 className="font-display">{copy("field-015")}</h2><p>{copy("field-016")}</p><Link href={templateRoute(copy("field-017"))} className="portrait-link">{copy("field-018")}<ArrowRight size={16} /></Link></article></section><div className="editorial-note"><p className="eyebrow">{copy("field-019")}</p><p>{copy("field-020")}</p><Link href={templateRoute(copy("field-021"))} className="portrait-link">{copy("field-022")}<ArrowRight size={16} /></Link></div></div>;
}
export const revalidate = 300;
