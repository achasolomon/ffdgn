import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, Reveal } from "@/components/ui";
import { AssetImage } from "@/components/media";
import { ForumMoments } from "@/components/forum-moments";
import { getInstitutionalPage, listMedia } from "@/lib/repo";
import { asRoute } from "@/lib/routes";
import type { InstitutionalSectionContent } from "@/lib/institutional-pages";

export async function generateMetadata(): Promise<Metadata> {
 const authored = await websiteMetadata("/about");
 return authored ?? { title: "About the Forum" };
}

function SectionCopy({ section }: { section: InstitutionalSectionContent }) {
  return <div className="about-copy">
    {section.imageUrl && <AssetImage src={section.imageUrl} alt={section.imageAlt ?? section.title} width={1000} height={600} className="mb-6 max-h-[400px] w-full object-cover" sizes="(max-width: 768px) 100vw, 800px" />}
    {section.body.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()).map((paragraph, index) => <p key={index}>{paragraph.trim()}</p>)}
  </div>;
}

export default async function AboutPage() {
  const managed = await managedWebsitePage("/about");
  if (managed) return managed;

  const [page, gallery] = await Promise.all([getInstitutionalPage("about"), listMedia({ kind: "IMAGE", galleryOnly: true })]);
  if (!page) notFound();
  const seen = new Set<string>();
  const slides = gallery.filter((item) => {
    if (item.category === "Portrait" || !/\.(jpe?g|png|webp)(?:\?|$)/i.test(item.url) || seen.has(item.url)) return false;
    seen.add(item.url); return true;
  }).slice(0, 8).map((item) => ({ src: item.url, alt: item.altText || item.title, caption: item.title }));
  const purpose = page.sections.filter((section) => /\b(vision|mission)\b/i.test(section.title));
  const chapters = page.sections.filter((section) => !purpose.includes(section));
  const intro = chapters[0];
  const remaining = chapters.slice(1);
  const moments = slides.length ? slides : [
    { src: "/assets/hero/fdg.jpg", alt: "Forum members gathered at a national engagement", caption: "Experience shared. A common purpose." },
    { src: "/assets/news/visit_ganduje2.jpeg", alt: "Forum representatives during an official visit", caption: "Dialogue that strengthens our institutions" },
    { src: "/assets/news/polish-nigeria-partnership.jpg", alt: "Forum representatives at a business engagement", caption: "Building connections for national development" },
  ];
  return <div className="about-page mx-auto max-w-shell px-5 py-12">
    <Breadcrumbs items={[{ label: "About the Forum" }]} />
    <SectionHeading as="h1" eyebrow={page.eyebrow} title={page.title} lede={page.lede} />
    <ForumMoments slides={moments} />
    {intro && <Reveal><section className="about-introduction" aria-labelledby="about-introduction">
      <div><p className="eyebrow">Our identity</p><h2 id="about-introduction" className="font-display">{intro.title}</h2></div><SectionCopy section={intro} />
    </section></Reveal>}
    {purpose.length > 0 && <div className="about-purpose">{purpose.map((section, index) => <Reveal key={section.id ?? section.title} delay={index * 0.1}><section>
      <p className="eyebrow-light">Our purpose / {String(index + 1).padStart(2, "0")}</p><h2 className="font-display">{section.title}</h2><SectionCopy section={section} />
    </section></Reveal>)}</div>}
    {remaining.length > 0 && <div className="about-story">
      <nav className="about-contents" aria-label="About page sections"><p className="eyebrow">Explore the Forum</p>{remaining.map((section, index) => <a key={section.id ?? section.title} href={`#about-chapter-${index}`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a>)}</nav>
      <div>{remaining.map((section, index) => <Reveal key={section.id ?? section.title}><section id={`about-chapter-${index}`} className="about-chapter" aria-labelledby={`about-heading-${index}`}>
        <p className="eyebrow">The Forum / {String(index + 1).padStart(2, "0")}</p><h2 id={`about-heading-${index}`} className="font-display">{section.title}</h2><SectionCopy section={section} />
      </section></Reveal>)}</div>
    </div>}
    {page.body.trim() && <section className="about-closing" aria-label="More about the Forum"><div className="about-copy">{page.body.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></section>}
    <section className="about-discover" aria-labelledby="about-discover"><div><p className="eyebrow-light">Continue exploring</p><h2 id="about-discover" className="font-display">Meet the people.<br />Discover the journey.</h2></div><div className="grid gap-3">{[
      { href: "/about/history", label: "Our history" }, { href: "/about/governance", label: "Governance" }, { href: "/leadership", label: "Leadership" }, { href: "/members#join", label: "Membership" },
    ].map((link) => <Link key={link.href} href={asRoute(link.href)}><span>{link.label}</span><ArrowRight size={18} /></Link>)}</div></section>
  </div>;
}
export const revalidate = 300;
