import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import { getInstitutionalPage } from "@/lib/repo";
import { InstitutionalSections } from "@/components/institutional-sections";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
 const authored = await websiteMetadata("/accessibility");
 if (authored) return authored;

  const content = await getInstitutionalPage("accessibility");
  return { title: content?.title ?? "Accessibility", description: content?.lede };
}

export default async function AccessibilityPage() {
  const managed = await managedWebsitePage("/accessibility");
  if (managed) return managed;

  const content = await getInstitutionalPage("accessibility");
  if (!content) notFound();
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">{content.eyebrow}</p>
      <h1 className="font-display mt-2 text-4xl text-forest-950">{content.title}</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink/75">
        <p className="font-medium">{content.lede}</p>
        {content.body.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>
      <InstitutionalSections sections={content.sections} />
    </div>
  );
}
