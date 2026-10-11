import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { audit, requirePermission } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { validateWebsitePage, validPagePath, PAGE_CATALOG, type WebsitePage } from "@/lib/website-content";
import { parseWebsiteDraft, websiteKey } from "@/lib/website-repo";
import { imagePathResolves } from "@/lib/media-path";
import { revalidatePublicSite } from "@/lib/revalidate";

export async function GET(req: Request) {
  try {
    await requirePermission("settings.manage");
    if (!(await dbReady())) return fail("UNAVAILABLE","Page management requires the database.",503);
    const path = new URL(req.url).searchParams.get("path");
    if (!validPagePath(path)) return fail("VALIDATION","Choose a valid page URL.",422);
    const history = await db.siteSetting.findMany({where:{key:{startsWith:`website.revision.${websiteKey(path,"draft").slice(-64)}.`}},orderBy:{updatedAt:"desc"},take:10});
    return ok(history.flatMap(row => {const draft=parseWebsiteDraft(row.value);return draft ? [draft] : [];}));
  } catch(error) { return failFrom(error); }
}
export async function POST(req: Request) {
  try {
    const auth=await requirePermission("settings.manage");
    if (!(await dbReady())) return fail("UNAVAILABLE","Page management requires the database.",503);
    const gate=await rateLimit(`cms.website:${auth.user.id}`,60,600000);
    if(!gate.ok) return fail("RATE_LIMITED","Too many page saves. Try again shortly.",429);
    const raw=await req.text();
    if(new TextEncoder().encode(raw).length > 62000) return fail("VALIDATION","Page document is too large.",422);
    let body: {page: WebsitePage; version: number; action: string};
    try {body=JSON.parse(raw);} catch {return fail("VALIDATION","Provide a valid page document.",422);}
    const error=validateWebsitePage(body?.page);
    if(error) return fail("VALIDATION",error,422);
    if(!["save","publish","unpublish"].includes(body.action) || !Number.isInteger(body.version) || body.version < 0) return fail("VALIDATION","Choose a valid save action and version.",422);
    const page=body.page;
    if (page.layout === "extend" && !PAGE_CATALOG.some(([path]) => path === page.path)) {
      const match = /^\/(events|news|members|knowledge|speakers)\/([a-z0-9-]+)$/.exec(page.path);
      const slug = match?.[2];
      const found = !match ? null : match[1] === "events" ? await db.forumEvent.findUnique({where:{slug}}) : match[1] === "news" ? await db.newsArticle.findUnique({where:{slug}}) : match[1] === "members" ? await db.member.findUnique({where:{slug}}) : match[1] === "knowledge" ? await db.knowledgeDoc.findUnique({where:{slug}}) : await db.speaker.findUnique({where:{slug}});
      if (!found) return fail("VALIDATION", "Adding sections applies to an existing page or record. Choose Replace for a new page.", 422);
    }
    const images=[page.image,...page.sections.flatMap(section => [section.image,...section.items.map(item => item.image), section.type === "video" && section.href.startsWith("/") ? section.href : ""])].filter(Boolean);
    for(const image of [...new Set(images)]) {
      if(!(await imagePathResolves(image))) return fail("VALIDATION",`Media not found: ${image}. Choose an asset from the library.`,422);
      const asset=await db.mediaAsset.findFirst({where:{url:image},select:{visibility:true}});
      if(asset && asset.visibility !== "PUBLIC") return fail("VALIDATION","Only public media can appear on public pages.",422);
    }
    if(body.action === "publish" && page.sections.every(section => section.hidden)) return fail("VALIDATION","Add at least one visible section before publishing.",422);
    if(body.action === "publish") for(const section of page.sections.filter(section => !section.hidden)) {
      if(section.type === "video" && !section.href) return fail("VALIDATION","Choose a source for each video section.",422);
      if(section.type === "image" && !section.image) return fail("VALIDATION","Choose a photograph for each image section.",422);
      if(section.type === "cta" && (!section.href || !section.button.trim())) return fail("VALIDATION","Call-to-action sections need a button label and destination.",422);
      if(section.type === "text" && !section.title.trim() && !section.body.trim() && !section.image) return fail("VALIDATION","Add content to each text section or hide it.",422);
      if(["cards","gallery"].includes(section.type) && !section.items.length) return fail("VALIDATION","Add items to each card or gallery section.",422);
      if(section.type === "table" && (!section.columns.length || !section.rows.length)) return fail("VALIDATION","Add headings and rows to each table.",422);
    }
    const key=websiteKey(page.path,"draft");
    const existing=await db.siteSetting.findUnique({where:{key}});
    const previous=parseWebsiteDraft(existing?.value);
    if((previous?.version ?? 0) !== body.version) return fail("CONFLICT","Another editor saved this page. Reload before saving your changes.",409);
    const draft={page,version:body.version+1,savedAt:new Date().toISOString()};
    const value=JSON.stringify(draft);
    try {
      await db.$transaction(async tx => {
        if(existing) {
          const update=await tx.siteSetting.updateMany({where:{key,value:existing.value},data:{value}});
          if(!update.count) throw new Error("WEBSITE_CONFLICT");
          await tx.siteSetting.create({data:{key:`website.revision.${key.slice(-64)}.${previous!.version}`,value:existing.value}});
        } else await tx.siteSetting.create({data:{key,value}});
        const publishedKey=websiteKey(page.path,"published");
        if(body.action === "publish") await tx.siteSetting.upsert({where:{key:publishedKey},create:{key:publishedKey,value},update:{value}});
        if(body.action === "unpublish") await tx.siteSetting.deleteMany({where:{key:publishedKey}});
      });
    } catch(error) {
      if(error instanceof Error && (error.message === "WEBSITE_CONFLICT" || (error as {code?:string}).code === "P2002")) return fail("CONFLICT","Another editor saved this page. Reload before saving.",409);
      throw error;
    }
    await audit(`cms.website.${body.action}`,`page:${page.path}`,{actorOverride:auth,ip:clientIp(req.headers),previousValue:previous ? `revision ${previous.version}` : "original website layout",newValue:`revision ${draft.version}: ${page.title}`});
    if(body.action !== "save") revalidatePublicSite(`page ${page.path} ${body.action}`);
    return ok(draft);
  } catch(error) {return failFrom(error);}
}
export const dynamic="force-dynamic";
