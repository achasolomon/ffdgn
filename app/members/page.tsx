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
 const authored = await websiteMetadata("/members");
 return authored ?? { title: "Membership" };
}
export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const managed = await managedWebsitePage("/members");
  if (managed) return managed;

  const members = (await listMembers()).filter((member) => member.visibility === "PUBLIC");
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const category = params.category ?? "";
  const filtered = members.filter((member) => (!query || `${member.name} ${member.title} ${member.state}`.toLowerCase().includes(query)) && (!category || member.category === category));
  return <div className="membership-page mx-auto max-w-shell px-5 py-12">
    <Breadcrumbs items={[{ label: "Membership" }]} />
    <SectionHeading as="h1" eyebrow="Membership" title="Experience shared. A nation served." lede="A community of former and serving Deputy Governors, connected by public service and a commitment to Nigeria's development." />
    <div className="membership-intro"><div><p className="eyebrow">The Forum community</p><h2 className="font-display">Meet our members</h2></div><div><p>Discover the people, service histories and experience that make up the Forum. Membership information and Secretariat enquiries are available below.</p><a href="#join" className="inline-flex items-center gap-3 mt-4 text-sm font-semibold text-primary">Membership information <ArrowRight size={16} /></a></div></div>
    <form className="directory-search" role="search" aria-label="Member directory"><div><label htmlFor="mq">Find a member</label><input id="mq" name="q" defaultValue={params.q ?? ""} placeholder="Search by name, title or state" /></div><div><label htmlFor="member-category">Membership category</label><select id="member-category" name="category" defaultValue={category}><option value="">Everyone</option><option>Former</option><option>Serving</option><option>Secretariat</option></select></div><button type="submit"><Search size={16} /> Search directory</button></form>
    <div className="directory-status"><p role="status">Showing {filtered.length} of {members.length} public profiles</p>{(query || category) && <Link href="/members">Clear filters</Link>}</div>
    {filtered.length === 0 ? <EmptyState title="No members match these filters" description="Try another name, title, state or category." href="/members" actionLabel="View all members" /> : <div className="member-portraits">{filtered.map((member) => <article key={member.slug} className="member-card"><Link href={`/members/${member.slug}`} className="member-card-link"><div className="member-photo">{member.photo ? <AssetImage src={member.photo} alt={`Portrait of ${member.name}`} width={500} height={600} className="h-full w-full object-cover object-top" sizes="(max-width: 768px) 100vw, 25vw" /> : <span className="font-display" aria-hidden>{member.name.slice(0, 1)}</span>}<span className="member-category">{member.category}</span></div><div className="member-copy"><h2 className="font-display">{member.name}</h2><p>{member.title}</p>{member.state && <p className="member-state">{member.state}</p>}<p className="member-service">{member.service.map((service) => `${service.startYear} - ${service.endYear}`).join(", ")}</p><span className="member-status">{member.status}</span><span className="portrait-link">Explore profile <ArrowRight size={16} /></span></div></Link></article>)}</div>}
    <section id="join" className="membership-join" aria-labelledby="membership-join-title"><div><p className="eyebrow-light">Membership</p><h2 id="membership-join-title" className="font-display">A shared commitment<br />to public service.</h2></div><div><p>Membership comprises former Deputy Governors as full members and serving Deputy Governors as associates. The Secretariat handles applications and verification.</p><Link href="/contact?subject=Membership%20enquiry" className="portrait-link">Enquire about membership <ArrowRight size={18} /></Link></div></section>
  </div>;
}
export const revalidate = 300;
