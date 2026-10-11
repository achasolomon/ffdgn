import { asRoute as templateRoute } from "@/lib/routes";
import { getTemplateCopy } from "@/lib/template-repo";
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
  const copy = await getTemplateCopy("page-about");

 const authored = await websiteMetadata("/about");
 return authored ?? { title: copy("field-001") };
}

function SectionCopy({ section }: { section: InstitutionalSectionContent }) {
  return <div className="about-copy">
    {section.imageUrl && <AssetImage src={section.imageUrl} alt={section.imageAlt ?? section.title} width={1000} height={600} className="mb-6 max-h-[400px] w-full object-cover" sizes="(max-width: 768px) 100vw, 800px" />}
    {section.body.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()).map((paragraph, index) => <p key={index}>{paragraph.trim()}</p>)}
  </div>;
}

export default async function AboutPage() {
  const copy = await getTemplateCopy("page-about");

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
    { src: copy("field-002"), alt: copy("field-003"), caption: copy("field-004") },
    { src: copy("field-005"), alt: copy("field-006"), caption: copy("field-007") },
    { src: copy("field-008"), alt: copy("field-009"), caption: copy("field-010") },
  ];
  return <div className="about-page mx-auto max-w-shell px-5 py-12">
    <Breadcrumbs items={[{ label: copy("field-001") }]} />
    <SectionHeading as="h1" eyebrow={page.eyebrow} title={page.title} lede={page.lede} />
    <ForumMoments slides={moments} />
    {intro && <Reveal><section className="about-introduction" aria-labelledby="about-introduction">
      <div><p className="eyebrow">{copy("field-011")}</p><h2 id="about-introduction" className="font-display">{intro.title}</h2></div><SectionCopy section={intro} />
    </section></Reveal>}
    {purpose.length > 0 && <div className="about-purpose">{purpose.map((section, index) => <Reveal key={section.id ?? section.title} delay={index * 0.1}><section>
      <p className="eyebrow-light">{copy("field-012")}{String(index + 1).padStart(2, "0")}</p><h2 className="font-display">{section.title}</h2><SectionCopy section={section} />
    </section></Reveal>)}</div>}
    {remaining.length > 0 && <div className="about-story">
      <nav className="about-contents" aria-label={copy("field-013")}><p className="eyebrow">{copy("field-014")}</p>{remaining.map((section, index) => <a key={section.id ?? section.title} href={`#about-chapter-${index}`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a>)}</nav>
      <div>{remaining.map((section, index) => <Reveal key={section.id ?? section.title}><section id={`about-chapter-${index}`} className="about-chapter" aria-labelledby={`about-heading-${index}`}>
        <p className="eyebrow">{copy("field-015")}{String(index + 1).padStart(2, "0")}</p><h2 id={`about-heading-${index}`} className="font-display">{section.title}</h2><SectionCopy section={section} />
      </section></Reveal>)}</div>
    </div>}
    {page.body.trim() && <section className="about-closing" aria-label={copy("field-016")}><div className="about-copy">{page.body.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></section>}
    <section className="about-discover" aria-labelledby="about-discover"><div><p className="eyebrow-light">{copy("field-017")}</p><h2 id="about-discover" className="font-display">{copy("field-018")}<br />{copy("field-019")}</h2></div><div className="grid gap-3">{[
      { href: templateRoute(copy("field-020")), label: copy("field-021") }, { href: templateRoute(copy("field-022")), label: copy("field-023") }, { href: templateRoute(copy("field-024")), label: copy("field-025") }, { href: templateRoute(copy("field-026")), label: copy("field-027") },
    ].map((link) => <Link key={link.href} href={asRoute(link.href)}><span>{link.label}</span><ArrowRight size={18} /></Link>)}</div></section>
  </div>;
}
export const revalidate = 300;
