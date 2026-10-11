import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
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
  const copy = await getTemplateCopy("page-members-slug");

  const managed = await managedWebsitePage(`/members/${(await params).slug}`);
  if (managed) return managed;

  const m = await getMemberRepo((await params).slug);
  if (!m || m.visibility !== "PUBLIC") notFound();
  const [committeeNames, eventTitles, docTitles] = await Promise.all([
    getCommitteesMap(), getEventTitles(m.events), getDocTitles(m.publications),
  ]);
  const engagement = [
    { title: copy("field-001"), items: m.committees.map((slug) => ({ slug, title: committeeNames.get(slug) ?? slug, href: templateRoute(copy("field-002")) })) },
    { title: copy("field-003"), items: m.events.map((slug) => ({ slug, title: eventTitles.get(slug) ?? slug, href: `/events/${slug}` })) },
    { title: copy("field-004"), items: m.publications.map((slug) => ({ slug, title: docTitles.get(slug) ?? slug, href: `/knowledge/${slug}` })) },
  ];
  return <div className="member-profile mx-auto max-w-shell px-5 py-12">
    <Breadcrumbs items={[{ label: copy("field-005"), href: templateRoute(copy("field-006")) }, { label: m.name }]} />
    <section className="profile-hero" aria-labelledby="member-name">
      <div className="profile-portrait">{m.photo ? <AssetImage src={m.photo} alt={copy("field-033", {value1: m.name})} width={800} height={1000} className="h-full w-full object-cover object-top" sizes="(max-width: 767px) 100vw, 40vw" /> : <span className="font-display" aria-hidden>{m.name.replace(/^(H\.E\.|Prof\.|Rt\. Hon\.|Dr)\s*/, "").slice(0, 1)}</span>}</div>
      <div className="profile-identity"><p className="eyebrow-light">{copy("field-007")}</p><h1 id="member-name" className="font-display">{m.name}</h1><p className="profile-title">{m.title}</p>{m.leadershipRole && m.leadershipRole !== m.title && <p className="profile-role">{m.leadershipRole}</p>}<dl className="profile-facts"><div><dt>{copy("field-008")}</dt><dd>{m.category}</dd></div><div><dt>{copy("field-009")}</dt><dd>{m.status}</dd></div>{m.state && <div><dt>{copy("field-010")}</dt><dd>{m.state}</dd></div>}{m.region && <div><dt>{copy("field-011")}</dt><dd>{m.region}</dd></div>}</dl><a href={templateRoute(copy("field-012"))} className="portrait-link">{copy("field-013")}<ArrowRight size={17} /></a></div>
    </section>
    <div className="profile-body">
      <nav className="profile-contents" aria-label={copy("field-014")}><p className="eyebrow">{copy("field-015")}</p><a href={templateRoute(copy("field-012"))}>{copy("field-016")}</a><a href={templateRoute(copy("field-017"))}>{copy("field-018")}</a><a href={templateRoute(copy("field-019"))}>{copy("field-020")}</a><Link href={templateRoute(copy("field-006"))} className="profile-directory"><ArrowLeft size={15} /> {copy("field-021")}</Link></nav>
      <div className="profile-chapters">
        <section id="biography" aria-labelledby="biography-title"><Reveal><p className="eyebrow">{copy("field-022")}</p><h2 id="biography-title" className="font-display">{copy("field-016")}</h2><div className="profile-biography">{m.bio.trim() ? m.bio.split(/\n\s*\n/).map((paragraph, i) => <p key={i}>{paragraph}</p>) : <p>{copy("field-023")}</p>}</div></Reveal></section>
        <section id="public-service" aria-labelledby="service-title"><Reveal><p className="eyebrow">{copy("field-024")}</p><h2 id="service-title" className="font-display">{copy("field-018")}</h2>{m.service.length ? <ol className="profile-service">{m.service.map((record, i) => <li key={i}><p className="profile-years">{record.startYear} <span aria-hidden>{copy("field-025")}</span> {record.endYear}</p><div><h3>{record.office}</h3>{record.state && <p>{record.state}</p>}</div></li>)}</ol> : <p className="profile-empty">{copy("field-026")}</p>}</Reveal></section>
        <section id="forum-engagement" aria-labelledby="engagement-title"><Reveal><p className="eyebrow">{copy("field-027")}</p><h2 id="engagement-title" className="font-display">{copy("field-020")}</h2><div className="profile-engagement">{engagement.map((group) => <div key={group.title}><h3>{group.title}</h3>{group.items.length ? <ul>{group.items.map((item) => <li key={item.slug}><Link href={item.href as Route}>{item.title}<ArrowRight size={15} /></Link></li>)}</ul> : <p>{copy("field-028")}{group.title.toLowerCase()} {copy("field-029")}</p>}</div>)}</div></Reveal></section>
      </div>
    </div>
    <div className="profile-footer"><div><p className="eyebrow">{copy("field-030")}</p><h2 className="font-display">{copy("field-031")}</h2></div><Link href={templateRoute(copy("field-006"))} className="portrait-link">{copy("field-032")}<ArrowRight size={18} /></Link></div>
  </div>;
}
export const revalidate = 300;
