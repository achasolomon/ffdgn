import { getTemplateCopy } from "@/lib/template-repo";
import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading } from "@/components/ui";
import { getInstitutionalPage } from "@/lib/repo";
import { asRoute } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getTemplateCopy("page-programs");

 const authored = await websiteMetadata("/programs");
 return authored ?? { title: copy("field-001"), description: copy("field-002") };
}

export default async function ProgramsPage() {
  const copy = await getTemplateCopy("page-programs");

  const managed = await managedWebsitePage("/programs");
  if (managed) return managed;

  const pages = await Promise.all([getInstitutionalPage("polish-nigeria"), getInstitutionalPage("renewed-hope")]);
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: copy("field-001") }]} />
      <SectionHeading as="h1" eyebrow={copy("field-003")} title={copy("field-004")} lede={copy("field-005")} />
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {pages.map((page, index) => page && <Link key={page.slug} href={asRoute(`/${page.slug}`)} className="group border hairline border-t-2 border-t-gold bg-white p-8 hover:shadow-card"><p className="eyebrow">{copy("field-006")}{String(index + 1).padStart(2, "0")}</p><h2 className="mt-3 font-display text-3xl text-forest-950 group-hover:text-primary">{page.title}</h2><p className="mt-4 text-sm leading-relaxed text-ink/65">{page.lede}</p><span className="mt-6 block text-sm font-semibold text-primary">{copy("field-007")}</span></Link>)}
      </div>
    </div>
  );
}

export const revalidate = 300;
