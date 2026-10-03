import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { AssetImage } from "@/components/media";
import { Reveal } from "@/components/ui";
import { getCommitteesMap, getDocTitles, getEventTitles, getMemberRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
 const authored = await websiteMetadata(`/members/${(await params).slug}`);
 if (authored) return authored;

  const member = await getMemberRepo((await params).slug);
  return { title: member?.visibility === "PUBLIC" ? member.name : "Member profile" };
}

export default async function MemberProfile({ params }: { params: Promise<{ slug: string }> }) {
  const managed = await managedWebsitePage(`/members/${(await params).slug}`);
  if (managed) return managed;

  const m = await getMemberRepo((await params).slug);
  if (!m || m.visibility !== "PUBLIC") notFound();
  const [committeeNames, eventTitles, docTitles] = await Promise.all([
    getCommitteesMap(), getEventTitles(m.events), getDocTitles(m.publications),
  ]);
  const engagement = [
    { title: "Committees", items: m.committees.map((slug) => ({ slug, title: committeeNames.get(slug) ?? slug, href: "/committees" })) },
    { title: "Events", items: m.events.map((slug) => ({ slug, title: eventTitles.get(slug) ?? slug, href: `/events/${slug}` })) },
    { title: "Publications", items: m.publications.map((slug) => ({ slug, title: docTitles.get(slug) ?? slug, href: `/knowledge/${slug}` })) },
  ];
  return <div className="member-profile mx-auto max-w-shell px-5 py-12">
    <Breadcrumbs items={[{ label: "Members", href: "/members" }, { label: m.name }]} />
    <section className="profile-hero" aria-labelledby="member-name">
      <div className="profile-portrait">{m.photo ? <AssetImage src={m.photo} alt={`Portrait of ${m.name}`} width={800} height={1000} className="h-full w-full object-cover object-top" sizes="(max-width: 767px) 100vw, 40vw" /> : <span className="font-display" aria-hidden>{m.name.replace(/^(H\.E\.|Prof\.|Rt\. Hon\.|Dr)\s*/, "").slice(0, 1)}</span>}</div>
      <div className="profile-identity"><p className="eyebrow-light">The Forum / Member profile</p><h1 id="member-name" className="font-display">{m.name}</h1><p className="profile-title">{m.title}</p>{m.leadershipRole && m.leadershipRole !== m.title && <p className="profile-role">{m.leadershipRole}</p>}<dl className="profile-facts"><div><dt>Membership</dt><dd>{m.category}</dd></div><div><dt>Status</dt><dd>{m.status}</dd></div>{m.state && <div><dt>State</dt><dd>{m.state}</dd></div>}{m.region && <div><dt>Region</dt><dd>{m.region}</dd></div>}</dl><a href="#biography" className="portrait-link">Discover the profile <ArrowRight size={17} /></a></div>
    </section>
    <div className="profile-body">
      <nav className="profile-contents" aria-label="Profile sections"><p className="eyebrow">In this profile</p><a href="#biography">Biography</a><a href="#public-service">Public service</a><a href="#forum-engagement">Forum engagement</a><Link href="/members" className="profile-directory"><ArrowLeft size={15} /> Member directory</Link></nav>
      <div className="profile-chapters">
        <section id="biography" aria-labelledby="biography-title"><Reveal><p className="eyebrow">01 / The person</p><h2 id="biography-title" className="font-display">Biography</h2><div className="profile-biography">{m.bio.trim() ? m.bio.split(/\n\s*\n/).map((paragraph, i) => <p key={i}>{paragraph}</p>) : <p>A biography has not yet been published for this member.</p>}</div></Reveal></section>
        <section id="public-service" aria-labelledby="service-title"><Reveal><p className="eyebrow">02 / Experience</p><h2 id="service-title" className="font-display">Public service</h2>{m.service.length ? <ol className="profile-service">{m.service.map((record, i) => <li key={i}><p className="profile-years">{record.startYear} <span aria-hidden>—</span> {record.endYear}</p><div><h3>{record.office}</h3>{record.state && <p>{record.state}</p>}</div></li>)}</ol> : <p className="profile-empty">Public service records have not yet been published.</p>}</Reveal></section>
        <section id="forum-engagement" aria-labelledby="engagement-title"><Reveal><p className="eyebrow">03 / Participation</p><h2 id="engagement-title" className="font-display">Forum engagement</h2><div className="profile-engagement">{engagement.map((group) => <div key={group.title}><h3>{group.title}</h3>{group.items.length ? <ul>{group.items.map((item) => <li key={item.slug}><Link href={item.href as Route}>{item.title}<ArrowRight size={15} /></Link></li>)}</ul> : <p>No {group.title.toLowerCase()} listed.</p>}</div>)}</div></Reveal></section>
      </div>
    </div>
    <div className="profile-footer"><div><p className="eyebrow">The Forum community</p><h2 className="font-display">Explore more of our members.</h2></div><Link href="/members" className="portrait-link">Return to the directory <ArrowRight size={18} /></Link></div>
  </div>;
}
export const revalidate = 300;
