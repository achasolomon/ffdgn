import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { cache } from "react";
import { db, dbReady } from "@/lib/db";
import { PAGE_CATALOG, blankPage, blankSection, validateWebsitePage, type WebsiteDraft, type WebsitePage, type WebsiteRecord } from "./website-content";
import { getInstitutionalPage, getSettings, listPeerReviewMembers } from "./repo";

export function websiteKey(path: string, state: "draft" | "published") { return `website.${state}.${createHash("sha256").update(path).digest("hex")}`; }
export function parseWebsiteDraft(value?: string | null): WebsiteDraft | null {
  if (!value) return null;
  try { const draft = JSON.parse(value) as WebsiteDraft; return validateWebsitePage(draft.page) || !Number.isInteger(draft.version) || typeof draft.savedAt !== "string" ? null : draft; } catch { return null; }
}
export const getWebsitePage = cache(async (path: string): Promise<WebsitePage | null> => {
  if (!(await dbReady())) return null;
  const row = await db.siteSetting.findUnique({where:{key:websiteKey(path,"published")}});
  return parseWebsiteDraft(row?.value)?.page ?? null;
});
export async function websiteMetadata(path:string):Promise<Metadata|null> {
  const page=await getWebsitePage(path);
  return page && page.layout !== "extend" ? {title:page.seoTitle || page.title,description:page.description || page.introduction,openGraph:{title:page.seoTitle || page.title,description:page.description || page.introduction}} : null;
}
export async function listWebsiteRecords(): Promise<WebsiteRecord[]> {
  if (!(await dbReady())) return [];
  const rows = await db.siteSetting.findMany({where:{OR:[{key:{startsWith:"website.draft."}},{key:{startsWith:"website.published."}}]}});
  const published = new Map(rows.filter(row => row.key.startsWith("website.published.")).flatMap(row => {const draft=parseWebsiteDraft(row.value);return draft ? [[draft.page.path,draft] as const] : [];}));
  return rows.filter(row => row.key.startsWith("website.draft.")).flatMap(row => { const draft=parseWebsiteDraft(row.value);return draft ? [{draft,published:published.get(draft.page.path)}] : []; });
}
export async function listPublishedWebsitePages():Promise<WebsiteDraft[]> {
  if(!(await dbReady()))return [];
  const rows=await db.siteSetting.findMany({where:{key:{startsWith:"website.published."}}});
  return rows.flatMap(row=>{const page=parseWebsiteDraft(row.value);return page?[page]:[];});
}
export async function pageStarter(path: string, title?: string): Promise<WebsitePage> {
  const page = blankPage(path,title ?? PAGE_CATALOG.find(entry => entry[0] === path)?.[1] ?? "New page");
  const slug = path.slice(1);
  if (["about","privacy","accessibility","renewed-hope","polish-nigeria"].includes(slug)) {
    const original = await getInstitutionalPage(slug);
    if (original) {
      page.title=original.title;page.label=original.eyebrow;page.introduction=original.lede;
      page.sections=original.sections.map((section,index) => ({...blankSection("text",`section-${index}`),title:section.title,body:section.body,image:section.imageUrl ?? "",alt:section.imageAlt || section.title}));
      if(original.body.trim()) page.sections.push({...blankSection("text","introduction"),body:original.body});
    }
  }
  const collection = ({"/events":"events","/news":"news","/members":"members","/knowledge":"publications","/committees":"committees"} as const)[path as "/events"];
  if(collection) page.sections.push({...blankSection("collection","records"),collection,title:page.title,limit:12});
  if(path === "/contact") page.sections.push(blankSection("contact","contact-form"));
  if(path === "/polish-nigeria") page.sections.push({...blankSection("cta","strategic-plan"),title:"PNBC 2026 Strategic Plan",button:"Read the strategic plan",href:"/assets/programs/pnbc-2026-strategic-plan.pdf",tone:"dark"});
  if(path === "/renewed-hope") {
    const roster=await listPeerReviewMembers();
    if(roster.length) page.sections.push({...blankSection("table","group-members"),title:"Members of the Group",columns:["Name","Zone","Position"],rows:roster.map(member=>[member.name,member.zone,member.role])});
  }
  if(path === "/") {
    const settings=await getSettings();
    page.title=settings["hero.title"] || page.title;page.label=settings["hero.eyebrow"] || page.label;page.introduction=settings["hero.lede"] || "";
    page.image=settings["hero.image_1"] || "";page.alt=settings["hero.image_1_alt"] || "Forum gathering";
    page.sections.push({...blankSection("text","about-forum"),title:settings["home.about_title"] || "About the Forum",body:settings["home.about_body"] || "",image:settings["home.about_image"] || "",alt:settings["home.about_image_alt"] || "Forum members",href:"/about",button:settings["home.about_cta"] || "About the Forum"});
    page.sections.push({...blankSection("collection","news"),title:"Institutional activity",collection:"news",limit:3});
    page.sections.push({...blankSection("collection","events"),title:"Our gatherings",collection:"events",limit:3,tone:"dark"});
  }
  return page;
}
