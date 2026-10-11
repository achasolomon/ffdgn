import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWebsitePage } from "@/lib/website-repo";
import { WebsitePageView } from "@/components/website-page";
export async function generateMetadata({params}:{params:Promise<{slug:string[]}>}):Promise<Metadata> {
  const page=await getWebsitePage(`/${(await params).slug.join("/")}`);
  return {title:page?.seoTitle || page?.title,description:page?.description || page?.introduction};
}
export default async function CustomPage({params}:{params:Promise<{slug:string[]}>}) {
  const page=await getWebsitePage(`/${(await params).slug.join("/")}`);
  if(!page || page.layout === "extend")notFound();
  return <WebsitePageView page={page}/>;
}
export const dynamic="force-dynamic";
