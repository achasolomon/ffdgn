import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading } from "@/components/ui";
import { listCommittees } from "@/lib/repo";
export async function generateMetadata(): Promise<Metadata> {
 const authored = await websiteMetadata("/mentorship");
 return authored ?? { title: "Mentorship" };
}
export default async function MentorshipPage() {
  const managed = await managedWebsitePage("/mentorship");
  if (managed) return managed;

  const committees = await listCommittees();
  const committee = committees.find(c => c.slug === "mentorship");
  return <div className="engagement-page mx-auto max-w-shell px-5 py-12"><Breadcrumbs items={[{label:"Engagement",href:"/committees"},{label:"Mentorship"}]} /><SectionHeading as="h1" eyebrow="Mentorship" title="Passing experience forward." lede={committee?.mandate ?? "Connecting the experience of public service with a commitment to the development of future leaders."} /><section className="engagement-feature"><p className="eyebrow-light">Leadership and continuity</p><h2 className="font-display">Knowledge grows when it is shared.</h2><p>Mentorship is part of the Forum’s commitment to putting public service experience to work. It creates space for dialogue on leadership, institutional responsibility and the lessons of governance.</p><Link href="/members" className="portrait-link">Meet the Forum community <ArrowRight size={18} /></Link></section><section className="mentorship-perspectives"><article><p className="eyebrow">01 / Experience</p><h2 className="font-display">Learning from public service</h2><p>Explore the service histories and perspectives of Forum members.</p><Link href="/members" className="portrait-link">Member directory <ArrowRight size={16} /></Link></article><article><p className="eyebrow">02 / Dialogue</p><h2 className="font-display">A continuing conversation</h2><p>Discover conferences and gatherings where leadership ideas are exchanged.</p><Link href="/events" className="portrait-link">Explore gatherings <ArrowRight size={16} /></Link></article></section><div className="editorial-note"><p className="eyebrow">Mentorship enquiries</p><p>Ask the Secretariat about mentorship activities and opportunities to participate.</p><Link href="/contact?subject=Mentorship%20enquiry" className="portrait-link">Contact the Secretariat <ArrowRight size={16} /></Link></div></div>;
}
export const revalidate = 300;
