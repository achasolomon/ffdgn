import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, requireAuth, audit } from "@/lib/server-auth";
import { allowedTransition, prettyStatus, type DocStatusKey } from "@/lib/workflow";
import { hasPermission } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";

/**
 * GET /api/v1/documents/:slug — single record.
 * Published + PUBLIC is open; anything else requires `documents.view`.
 */
export async function GET(_: Request, { params }: { params: { slug: string } }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Document detail requires the MySQL database.", 503);
    const d = await db.knowledgeDoc.findUnique({ where: { slug: params.slug } });
    if (!d) return fail("NOT_FOUND", "Document not found.", 404);
    const open = d.status === "Published" && d.visibility === "PUBLIC";
    if (!open) {
      const auth = await requireAuth().catch(() => null);
      if (!auth || !hasPermission(auth.user.role, "documents.view")) {
        return fail("FORBIDDEN", "This record is restricted.", 403);
      }
    }
    return ok({
      slug: d.slug, title: d.title, type: prettyStatus(d.type), status: prettyStatus(d.status),
      published: d.publishedOn ? new Date(d.publishedOn).toISOString().slice(0, 10) : null,
      author: d.author, topic: d.topic, year: d.year, committee: d.committee,
      pages: d.pages, size: d.sizeLabel, summary: d.summary,
      visibility: d.visibility, version: d.version, downloads: d.downloads,
    }, { source: "mysql" });
  } catch (e) {
    return failFrom(e);
  }
}

/**
 * PATCH /api/v1/documents/:slug — advance the approval workflow.
 * Body: { "to": "Published" }. Only legal edges; capability per edge; audited.
 */
export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Workflow requires the MySQL database.", 503);
    const body = (await req.json().catch(() => null)) as { to?: string } | null;
    const to = (body?.to ?? "").replace(/ /g, "_") as DocStatusKey;
    if (!to) return fail("VALIDATION", "Target status `to` is required.", 422);

    const d = await db.knowledgeDoc.findUnique({ where: { slug: params.slug } });
    if (!d) return fail("NOT_FOUND", "Document not found.", 404);

    const from = d.status as unknown as DocStatusKey;
    const edge = allowedTransition(from, to);
    if (!edge) {
      return fail("VALIDATION", `Illegal transition: ${prettyStatus(from)} → ${prettyStatus(to)}.`, 422);
    }
    const auth = await requirePermission(edge.permission);

    const updated = await db.knowledgeDoc.update({
      where: { id: d.id },
      data: { status: to as never, version: { increment: 1 } },
      select: { slug: true, title: true, status: true, version: true },
    });
    await audit("documents.transition", `document:${d.slug}`, {
      previousValue: prettyStatus(from), newValue: prettyStatus(to), ip: clientIp(req.headers),
      actorOverride: auth,
    });
    return ok({ ...updated, status: prettyStatus(String(updated.status)) });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
