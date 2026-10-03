import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { Visibility } from "@prisma/client";
import { parseDocumentInput } from "@/lib/cms-document-input";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Knowledge management requires MySQL.", 503);
    const auth = await requirePermission("documents.create");
    const gate = await rateLimit(`cms.documents:${auth.user.id}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many document edits. Try again shortly.", 429);
    const parsed = parseDocumentInput(await req.json().catch(() => null), true);
    if (!parsed.value) return fail("VALIDATION", parsed.error ?? "Invalid document.", 422);
    const event = parsed.value.eventSlug ? await db.forumEvent.findUnique({ where: { slug: parsed.value.eventSlug }, select: { id: true } }) : null;
    if (parsed.value.eventSlug && !event) return fail("VALIDATION", "Related event was not found.", 422);
    if (await db.knowledgeDoc.findUnique({ where: { slug: parsed.value.slug }, select: { id: true } })) return fail("CONFLICT", "That document slug is already in use.", 409);
    const values = parsed.value;
    const document = await db.knowledgeDoc.create({
      data: {
        slug: values.slug,
        title: values.title,
        type: values.type,
        author: values.author,
        topic: values.topic,
        year: values.year,
        committee: values.committee,
        pages: values.pages,
        sizeLabel: values.sizeLabel,
        summary: values.summary,
        fileUrl: values.fileUrl,
        visibility: values.visibility as Visibility,
        status: "Draft",
        ...(event ? { event: { connect: { id: event.id } } } : {}),
      },
      select: { slug: true, title: true, status: true, visibility: true, version: true },
    });
    await audit("documents.create", `document:${document.slug}`, { newValue: `${document.status}: ${document.title}`, ip: clientIp(req.headers), actorOverride: auth });
    return ok(document);
  } catch (e) { return failFrom(e); }
}

export const dynamic = "force-dynamic";