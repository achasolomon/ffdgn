import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/server-auth";
import { db } from "@/lib/db";
import { websiteKey, parseWebsiteDraft } from "@/lib/website-repo";
import { WebsitePageView } from "@/components/website-page";
export const metadata:Metadata={title:"Draft preview",robots:{index:false,follow:false}};
export default async function Preview({params}:{params:Promise<{slug:string[]}>}) {
  await requirePermission("settings.manage");
  const segments=(await params).slug;
  const path=segments.length===1 && segments[0]==="__homepage"?"/":`/${segments.join("/")}`;
  const row=await db.siteSetting.findUnique({where:{key:websiteKey(path,"draft")}});
  const draft=parseWebsiteDraft(row?.value);if(!draft)notFound();
  return <><p className="cms-preview-banner">Draft preview · {draft.page.path} · Not visible to the public</p><WebsitePageView page={draft.page}/></>;
}
export const dynamic="force-dynamic";
