import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { validateTemplateValues, TEMPLATE_CONTENT } from "@/lib/template-content";
import { parseTemplateDocument, templateKey } from "@/lib/template-repo";
import { imagePathResolves } from "@/lib/media-path";
import { revalidatePublicSite } from "@/lib/revalidate";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    await requirePermission("settings.manage");
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!TEMPLATE_CONTENT.some(item => item.id === id)) return fail("VALIDATION", "Choose an existing design.", 422);
    const rows = await db.siteSetting.findMany({ where: { key: { startsWith: `website.copy.revision.${id}.` } }, orderBy: { updatedAt: "desc" }, take: 10 });
    return ok(rows.flatMap(row => { const document = parseTemplateDocument(id, row.value); return document ? [document] : []; }));
  } catch (error) { return failFrom(error); }
}
export async function POST(req: Request) {
  try {
    const auth = await requirePermission("settings.manage");
    if (!(await dbReady())) return fail("UNAVAILABLE", "The content database is unavailable.", 503);
    if (!(await rateLimit(`cms.designs:${auth.user.id}`, 60, 600000)).ok) return fail("RATE_LIMITED", "Too many saves. Try again shortly.", 429);
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 62000) return fail("VALIDATION", "Content document is too large.", 422);
    let body: { id: string; values: Record<string, string>; version: number; action: string };
    try { body = JSON.parse(raw); } catch { return fail("VALIDATION", "Provide valid content.", 422); }
    const invalid = validateTemplateValues(body?.id, body?.values);
    if (invalid) return fail("VALIDATION", invalid, 422);
    if (!["save", "publish"].includes(body.action) || !Number.isSafeInteger(body.version) || body.version < 0) return fail("VALIDATION", "Choose a valid save action.", 422);
    for (const field of TEMPLATE_CONTENT.find(item => item.id === body.id)!.fields.filter(field => field.kind === "image")) {
      const url = body.values[field.key];
      if (!(await imagePathResolves(url))) return fail("VALIDATION", `Choose an existing image for ${field.label}.`, 422);
      const asset = await db.mediaAsset.findFirst({ where: { url }, select: { visibility: true } });
      if (asset && asset.visibility !== "PUBLIC") return fail("VALIDATION", "Only public images can appear on the website.", 422);
    }
    const key = templateKey(body.id, "draft");
    const previousRow = await db.siteSetting.findUnique({ where: { key } });
    const previous = parseTemplateDocument(body.id, previousRow?.value);
    if ((previous?.version ?? 0) !== body.version) return fail("CONFLICT", "Another editor saved this design. Reload before saving.", 409);
    const document = { values: body.values, version: body.version + 1, savedAt: new Date().toISOString() };
    const value = JSON.stringify(document);
    try {
      await db.$transaction(async tx => {
        if (previousRow) {
          const updated = await tx.siteSetting.updateMany({ where: { key, value: previousRow.value }, data: { value } });
          if (!updated.count) throw new Error("DESIGN_CONFLICT");
          await tx.siteSetting.create({ data: { key: `website.copy.revision.${body.id}.${previous!.version}`, value: previousRow.value } });
        } else await tx.siteSetting.create({ data: { key, value } });
        if (body.action === "publish") await tx.siteSetting.upsert({ where: { key: templateKey(body.id, "published") }, create: { key: templateKey(body.id, "published"), value }, update: { value } });
      });
    } catch (error) {
      if (error instanceof Error && (error.message === "DESIGN_CONFLICT" || (error as { code?: string }).code === "P2002")) return fail("CONFLICT", "Another editor saved this design. Reload before saving.", 409);
      throw error;
    }
    await audit(`cms.designs.${body.action}`, `design:${body.id}`, { actorOverride: auth, ip: clientIp(req.headers), previousValue: `revision ${previous?.version ?? 0}`, newValue: `revision ${document.version}` });
    if (body.action === "publish") revalidatePublicSite(`current design ${body.id}`);
    return ok(document);
  } catch (error) { return failFrom(error); }
}
export const dynamic = "force-dynamic";
