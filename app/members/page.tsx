import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, EmptyState } from "@/components/ui";
import { AssetImage } from "@/components/media";
import { listMembers } from "@/lib/repo";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getTemplateCopy("page-members");

 const authored = await websiteMetadata("/members");
 return authored ?? { title: copy("field-001") };
}
export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const copy = await getTemplateCopy("page-members");

  const managed = await managedWebsitePage("/members");
  if (managed) return managed;

  const members = (await listMembers()).filter((member) => member.visibility === "PUBLIC");
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const category = params.category ?? "";
  const filtered = members.filter((member) => (!query || `${member.name} ${member.title} ${member.state}`.toLowerCase().includes(query)) && (!category || member.category === category));
  return <div className="membership-page mx-auto max-w-shell px-5 py-12">
    <Breadcrumbs items={[{ label: copy("field-001") }]} />
    <SectionHeading as="h1" eyebrow={copy("field-001")} title={copy("field-002")} lede={copy("field-003")} />
    <div className="membership-intro"><div><p className="eyebrow">{copy("field-004")}</p><h2 className="font-display">{copy("field-005")}</h2></div><div><p>{copy("field-006")}</p><a href={templateRoute(copy("field-007"))} className="inline-flex items-center gap-3 mt-4 text-sm font-semibold text-primary">{copy("field-008")}<ArrowRight size={16} /></a></div></div>
    <form className="directory-search" role="search" aria-label={copy("field-009")}><div><label htmlFor="mq">{copy("field-010")}</label><input id="mq" name="q" defaultValue={params.q ?? ""} placeholder={copy("field-011")} /></div><div><label htmlFor="member-category">{copy("field-012")}</label><select id="member-category" name="category" defaultValue={category}><option value="">{copy("field-013")}</option><option>{copy("field-014")}</option><option>{copy("field-015")}</option><option>{copy("field-016")}</option></select></div><button type="submit"><Search size={16} /> {copy("field-017")}</button></form>
    <div className="directory-status"><p role="status">{copy("field-018")}{filtered.length} {copy("field-019")}{members.length} {copy("field-020")}</p>{(query || category) && <Link href={templateRoute(copy("field-021"))}>{copy("field-022")}</Link>}</div>
    {filtered.length === 0 ? <EmptyState title={copy("field-023")} description={copy("field-024")} href={templateRoute(copy("field-021"))} actionLabel="View all members" /> : <div className="member-portraits">{filtered.map((member) => <article key={member.slug} className="member-card"><Link href={`/members/${member.slug}`} className="member-card-link"><div className="member-photo">{member.photo ? <AssetImage src={member.photo} alt={copy("field-031", {value1: member.name})} width={500} height={600} className="h-full w-full object-cover object-top" sizes="(max-width: 768px) 100vw, 25vw" /> : <span className="font-display" aria-hidden>{member.name.slice(0, 1)}</span>}<span className="member-category">{member.category}</span></div><div className="member-copy"><h2 className="font-display">{member.name}</h2><p>{member.title}</p>{member.state && <p className="member-state">{member.state}</p>}<p className="member-service">{member.service.map((service) => copy("field-032", {value1: service.startYear, value2: service.endYear})).join(", ")}</p><span className="member-status">{member.status}</span><span className="portrait-link">{copy("field-025")}<ArrowRight size={16} /></span></div></Link></article>)}</div>}
    <section id="join" className="membership-join" aria-labelledby="membership-join-title"><div><p className="eyebrow-light">{copy("field-001")}</p><h2 id="membership-join-title" className="font-display">{copy("field-026")}<br />{copy("field-027")}</h2></div><div><p>{copy("field-028")}</p><Link href={templateRoute(copy("field-029"))} className="portrait-link">{copy("field-030")}<ArrowRight size={18} /></Link></div></section>
  </div>;
}
export const revalidate = 300;
