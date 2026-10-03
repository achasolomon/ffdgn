import { unlink } from "node:fs/promises";
import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";
import { uploadedFilePath } from "@/lib/media-upload";

/**
 * PATCH /api/v1/media/[id] — correct a catalogued asset's metadata.
 * DELETE   — remove the record and, for uploaded files, the file on disk.
 *
 * Both require `media.manage` and are audit-logged. The endpoint existed only in
 * the POST direction, which meant a mistyped alt text or a wrongly categorised
 * photograph could not be fixed — the only recourse was to upload a corrected
 * duplicate and leave the wrong record live.
 *
 * Neither direction can swap the file itself; that is POST /api/v1/media/[id]/file.
 */

const MAX_TITLE = 200;
const MAX_ALT = 255;
const MAX_CREDIT = 200;
const MAX_CATEGORY = 64;
const MAX_DESCRIPTION = 2000;
const VISIBILITIES = ["PUBLIC", "SECRETARIAT_ONLY", "COMMITTEE_ONLY", "MEMBERS_ONLY", "PRIVATE"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Media library requires the MySQL database.", 503);
    const auth = await requirePermission("media.manage");
    const gate = await rateLimit(`media.edit:${auth.user.id}`, 120, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many media edits. Try again shortly.", 429);

    const { id } = await params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail("VALIDATION", "Request body is required.", 422);

    const existing = await db.mediaAsset.findUnique({ where: { id } });
    if (!existing) return fail("NOT_FOUND", "No such media asset.", 404);

    const data: Record<string, unknown> = {};
    const changes: string[] = [];

    /** Assign a trimmed string field if it was supplied. */
    const setText = (field: string, max: number, label: string) => {
      if (!(field in body)) return;
      const raw = body[field];
      if (typeof raw !== "string") return fail("VALIDATION", `${label} must be a string.`, 422);
      const value = raw.trim().slice(0, max);
      if (field === "altText" && value === existing.altText) return;
      data[field] = value || null;
      changes.push(field);
    };

    const invalid = setText("title", MAX_TITLE, "Title");
    if (invalid) return invalid;
    const invalidAlt = setText("altText", MAX_ALT, "Alt text");
    if (invalidAlt) return invalidAlt;
    const invalidCredit = setText("photographer", MAX_CREDIT, "Credit");
    if (invalidCredit) return invalidCredit;
    const invalidCat = setText("category", MAX_CATEGORY, "Category");
    if (invalidCat) return invalidCat;
    const invalidDesc = setText("description", MAX_DESCRIPTION, "Description");
    if (invalidDesc) return invalidDesc;

    if ("visibility" in body) {
      const v = body.visibility;
      if (typeof v !== "string" || !VISIBILITIES.includes(v as (typeof VISIBILITIES)[number])) {
        return fail("VALIDATION", `Visibility must be one of: ${VISIBILITIES.join(", ")}.`, 422);
      }
      data.visibility = v;
      changes.push("visibility");
    }

    // Gallery opt-out. Checked by default, so the flag only travels when an
    // editor unticks it — an absent key leaves the stored value alone rather
    // than silently resetting every asset on a partial edit.
    if ("inGallery" in body) {
      if (typeof body.inGallery !== "boolean") return fail("VALIDATION", "Gallery flag must be a boolean.", 422);
      data.inGallery = body.inGallery;
      changes.push("inGallery");
    }

    // Capture year: null clears it, which hands the year back to the
    // event-then-upload fallback in `mediaYear`.
    if ("year" in body) {
      const y = body.year;
      if (y !== null && typeof y !== "number") return fail("VALIDATION", "Year must be a number or null.", 422);
      if (y !== null && (!Number.isInteger(y) || y < 1900 || y > 2100)) {
        return fail("VALIDATION", "Year must be a four-digit year between 1900 and 2100.", 422);
      }
      data.year = y;
      changes.push("year");
    }

    if ("eventSlug" in body) {
      if(typeof body.eventSlug !== "string") return fail("VALIDATION","Choose a valid event album.",422);
      const event=body.eventSlug ? await db.forumEvent.findUnique({where:{slug:body.eventSlug},select:{id:true}}) : null;
      if(body.eventSlug && !event) return fail("VALIDATION","The selected event does not exist.",422);
      data.eventId=event?.id ?? null;
      changes.push("eventId");
    }
    if (changes.length === 0) return fail("VALIDATION", "No editable fields were supplied.", 422);

    const updated = await db.mediaAsset.update({ where: { id }, data });
    await audit("media.update", `media:${id}`, {
      previousValue: changes.map((c) => `${c}=${String((existing as Record<string, unknown>)[c] ?? "")}`).slice(0, 6).join(", ").slice(0, 200),
      newValue: changes.map((c) => `${c}=${String(data[c] ?? "")}`).slice(0, 6).join(", ").slice(0, 200),
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite(`media ${updated.title}`);
    return ok(updated, { revalidated: true });
  } catch (e) {
    return failFrom(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Media library requires the MySQL database.", 503);
    const auth = await requirePermission("media.manage");
    const gate = await rateLimit(`media.delete:${auth.user.id}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many deletions. Try again shortly.", 429);

    const { id } = await params;
    const existing = await db.mediaAsset.findUnique({ where: { id } });
    if (!existing) return fail("NOT_FOUND", "No such media asset.", 404);

    // Unlink first: if the DB delete then fails, an orphaned file is recoverable
    // but a row pointing at a deleted file is a broken image in production.
    let fileRemoved = false;
    const path = uploadedFilePath(existing.url);
    if (path) {
      try {
        await unlink(path);
        fileRemoved = true;
      } catch {
        // Already gone, or the volume is read-only. The record is still removed
        // and the audit entry records that the file survived.
        console.warn(`[media] could not unlink ${existing.url} for asset ${id}`);
      }
    }

    await db.mediaAsset.delete({ where: { id } });
    await audit("media.delete", `media:${id}`, {
      previousValue: `${existing.kind} ${existing.title} (${existing.url})`,
      newValue: fileRemoved ? "record and file deleted" : "record deleted, file retained",
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite(`media ${existing.title}`);
    return ok({ id, deleted: true, fileRemoved });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
