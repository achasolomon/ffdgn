import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgramDetail } from "@/components/program-detail";
import { getInstitutionalPage } from "@/lib/repo";
export async function generateMetadata(): Promise<Metadata> {
 const authored = await websiteMetadata("/polish-nigeria");
 if (authored) return authored;

  const content = await getInstitutionalPage("polish-nigeria");
  return { title: content?.title ?? "Polish Nigeria", description: content?.lede };
}
export default async function PolishNigeriaPage() {
  const managed = await managedWebsitePage("/polish-nigeria");
  if (managed) return managed;

  const content = await getInstitutionalPage("polish-nigeria");
  if (!content) notFound();
  return <ProgramDetail content={content} />;
}
export const revalidate = 300;
