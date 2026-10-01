import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, requireAuth, audit } from "@/lib/server-auth";
import { allowedTransition, prettyStatus, type DocStatusKey } from "@/lib/workflow";
import { hasPermission } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";

const VISIBILITIES = ["PUBLIC", "MEMBERS_ONLY", "COMMITTEE_ONLY", "SECRETARIAT_ONLY", "PRIVATE"] as const;

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
        // Do not confirm the existence of a restricted record to an
        // unauthorized caller — indistinguishable from "no such document".
        return fail("NOT_FOUND", "Document not found.", 404);
      }
    }
    return ok({
      slug: d.slug, title: d.title, type: prettyStatus(d.type), status: prettyStatus(d.status),
      published: d.publishedOn ? new Date(d.publishedOn).toISOString().slice(0, 10) : null,
      author: d.author, topic: d.topic, year: d.year, committee: d.committee,
      pages: d.pages, size: d.sizeLabel, summary: d.summary,
      fileUrl: d.fileUrl ?? null,
      visibility: d.visibility, version: d.version, downloads: d.downloads,
    }, { source: "mysql" });
  } catch (e) {
    return failFrom(e);
  }
}

/**
 * PATCH /api/v1/documents/:slug — advance the approval workflow.
 * Body: { "to": "Published", "visibility"?: Visibility }. Only legal edges;
 * capability per edge; audited.
 *
 * Publishing is the only transition that makes a record publicly reachable, so
 * it must leave the document in a state the public site can actually serve:
 *   - `publishedOn` is stamped on first publish (the Knowledge Centre renders
 *     this as the citation/publication date; a null value renders "—" and makes
 *     the record look unfurnished).
 *   - `visibility` is forced to PUBLIC, because `Published + not-PUBLIC` is a
 *     contradictory state that no public page will ever render.
 * Both are also applied when a record leaves Published (Archived, or re-opened
 * as Draft) so a withdrawn document cannot keep serving as public.
 */
export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Workflow requires the MySQL database.", 503);

    // Authenticate before touching the record. Looking the document up first
    // lets an anonymous caller distinguish a real slug (workflow error) from a
    // fake one (404), which enumerates unpublished and restricted documents.
    await requireAuth();

    const body = (await req.json().catch(() => null)) as { to?: string; visibility?: string } | null;
    const to = (body?.to ?? "").replace(/ /g, "_") as DocStatusKey;
    if (!to) return fail("VALIDATION", "Target status `to` is required.", 422);

    if (body?.visibility !== undefined && !(VISIBILITIES as readonly string[]).includes(body.visibility)) {
      return fail("VALIDATION", `Unknown visibility. Allowed: ${VISIBILITIES.join(", ")}.`, 422);
    }

    const d = await db.knowledgeDoc.findUnique({ where: { slug: params.slug } });
    if (!d) return fail("NOT_FOUND", "Document not found.", 404);

    const from = d.status as unknown as DocStatusKey;
    const edge = allowedTransition(from, to);
    if (!edge) {
      return fail("VALIDATION", `Illegal transition: ${prettyStatus(from)} → ${prettyStatus(to)}.`, 422);
    }
    // Capability is checked after the target edge is known, so the requirement
    // reflects the specific transition being attempted.
    const auth = await requirePermission(edge.permission);

    const isPublishing = to === "Published";
    const isLeavingPublished = from === "Published" && to !== "Published";

    // An editor may pin visibility explicitly on publish; otherwise publishing
    // implies PUBLIC. Leaving Published clears it unless the caller pins a value.
    const nextVisibility =
      body?.visibility ??
      (isPublishing ? "PUBLIC" : isLeavingPublished ? "MEMBERS_ONLY" : undefined);

    const updated = await db.knowledgeDoc.update({
      where: { id: d.id },
      data: {
        status: to as never,
        version: { increment: 1 },
        ...(isPublishing ? { publishedOn: d.publishedOn ?? new Date() } : {}),
        ...(nextVisibility ? { visibility: nextVisibility as never } : {}),
      },
      select: { slug: true, title: true, status: true, version: true, visibility: true, publishedOn: true },
    });

    const changes = [`status ${prettyStatus(from)} → ${prettyStatus(to)}`];
    if (updated.publishedOn && !d.publishedOn) changes.push("publication date stamped");
    if (nextVisibility && nextVisibility !== d.visibility) {
      changes.push(`visibility ${d.visibility} → ${nextVisibility}`);
      await audit("documents.visibility.change", `document:${d.slug}`, {
        previousValue: d.visibility, newValue: nextVisibility, ip: clientIp(req.headers),
        actorOverride: auth,
      });
    }

    await audit("documents.transition", `document:${d.slug}`, {
      previousValue: prettyStatus(from), newValue: prettyStatus(to), ip: clientIp(req.headers),
      actorOverride: auth,
    });

    // Publish/withdraw changes what the public site serves, so drop the ISR cache.
    revalidatePublicSite(`document ${d.slug} → ${prettyStatus(to)}`);

    return ok({
      ...updated,
      status: prettyStatus(String(updated.status)),
      publishedOn: updated.publishedOn ? updated.publishedOn.toISOString().slice(0, 10) : null,
      changes,
    });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
