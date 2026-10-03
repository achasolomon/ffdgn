import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading } from "@/components/ui";
import { listCommittees, listPeerReviewMembers } from "@/lib/repo";
export async function generateMetadata(): Promise<Metadata> {
 const authored = await websiteMetadata("/peer-review");
 return authored ?? { title: "Peer Review" };
}
export default async function PeerReviewPage() {
  const managed = await managedWebsitePage("/peer-review");
  if (managed) return managed;

  const [committees, members] = await Promise.all([listCommittees(), listPeerReviewMembers()]);
  const committee = committees.find(c => c.slug === "peer-review");
  return <div className="engagement-page mx-auto max-w-shell px-5 py-12"><Breadcrumbs items={[{label:"Engagement",href:"/committees"},{label:"Peer Review"}]} /><SectionHeading as="h1" eyebrow="Peer review" title="Shared experience. Stronger accountability." lede={committee?.mandate ?? "Peer review brings leadership experience to the assessment of public programmes, supporting accountability and shared learning."} /><section className="engagement-feature"><p className="eyebrow-light">Learning through dialogue</p><h2 className="font-display">Experience as a resource for better governance.</h2><p>The Forum brings together experienced public leaders to exchange perspectives on governance and institutional performance. Explore its published research and recommendations in the Knowledge Centre.</p><Link href="/knowledge?type=Research" className="portrait-link">Explore research <ArrowRight size={18} /></Link></section>{members.length > 0 && <section className="engagement-roster"><p className="eyebrow">People and perspectives</p><h2 className="font-display">Peer review members</h2><div>{members.map(m => <article key={m.id}><p className="eyebrow">{m.zone}</p><h3 className="font-display">{m.name}</h3><p>{m.role}</p></article>)}</div></section>}<div className="editorial-note"><p className="eyebrow">Get involved</p><p>Contact the Secretariat for enquiries about peer review activities.</p><Link href="/contact?subject=Peer%20review%20enquiry" className="portrait-link">Contact the Secretariat <ArrowRight size={16} /></Link></div></div>;
}
export const revalidate = 300;
