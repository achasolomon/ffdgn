import { db, dbReady, fail, failFrom, ok } from "../../../_lib";
import { Visibility } from "@prisma/client";
import { parseDocumentInput } from "@/lib/cms-document-input";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Knowledge management requires MySQL.", 503);
    const auth = await requirePermission("documents.edit");
    const gate = await rateLimit(`cms.documents:${auth.user.id}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many document edits. Try again shortly.", 429);
    const { slug } = await params;
    const existing = await db.knowledgeDoc.findUnique({ where: { slug } });
    if (!existing) return fail("NOT_FOUND", "Document not found.", 404);
    const parsed = parseDocumentInput(await req.json().catch(() => null), false);
    if (!parsed.value) return fail("VALIDATION", parsed.error ?? "Invalid document.", 422);
    const event = parsed.value.eventSlug ? await db.forumEvent.findUnique({ where: { slug: parsed.value.eventSlug }, select: { id: true } }) : null;
    if (parsed.value.eventSlug && !event) return fail("VALIDATION", "Related event was not found.", 422);
    const values = parsed.value;
    const updated = await db.knowledgeDoc.update({
      where: { id: existing.id },
      data: {
        title: values.title,
        type: values.type,
        author: values.author,
        topic: values.topic,
        year: values.year,
        committee: values.committee,
        pages: values.pages,
        sizeLabel: values.sizeLabel,
        summary: values.summary,
        fileUrl: existing.storageKey ? `/api/v1/documents/${encodeURIComponent(slug)}/download` : values.fileUrl,
        visibility: values.visibility as Visibility,
        event: event ? { connect: { id: event.id } } : { disconnect: true },
        version: { increment: 1 },
      },
      select: { slug: true, title: true, status: true, visibility: true, version: true },
    });
    await audit("documents.edit", `document:${slug}`, {
      previousValue: `${existing.title} · ${existing.version}`,
      newValue: `${updated.title} · ${updated.version}`,
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite(`document edited ${slug}`);
    return ok(updated, { revalidated: true });
  } catch (e) { return failFrom(e); }
}

export const dynamic = "force-dynamic";