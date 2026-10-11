import { db } from "@/lib/db";
import { imagePathResolves } from "@/lib/media-path";

/** Validate the same editorial fields for create and update. */
export async function speakerInput(value: unknown, creating: boolean) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("A speaker form is required.");
  const body = value as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const [key, limit] of Object.entries({ name: 192, role: 128, honorific: 64, org: 192, bio: 4000, photoUrl: 512 })) {
    if (body[key] === undefined && !creating) continue;
    const text = body[key] ?? "";
    if (typeof text !== "string" || text.length > limit) throw new Error(`${key} must be text, up to ${limit} characters.`);
    if ((key === "name" || key === "role") && !text.trim()) throw new Error("Name and role are required.");
    data[key] = text.trim() || null;
  }
  if (body.keynote !== undefined) {
    if (typeof body.keynote !== "boolean") throw new Error("Keynote must be a checkbox value.");
    data.keynote = body.keynote;
  }
  if (body.position !== undefined) {
    if (!Number.isInteger(body.position) || Number(body.position) < 0 || Number(body.position) > 100000) throw new Error("Order must be a whole number from 0 to 100000.");
    data.position = body.position;
  }
  if (body.visibility !== undefined) {
    if (!["PUBLIC", "MEMBERS_ONLY", "COMMITTEE_ONLY", "SECRETARIAT_ONLY", "PRIVATE"].includes(String(body.visibility))) throw new Error("Unknown visibility.");
    data.visibility = body.visibility;
  }
  if (body.eventSlug !== undefined) {
    if (typeof body.eventSlug !== "string") throw new Error("Choose an event.");
    const event = body.eventSlug ? await db.forumEvent.findUnique({ where: { slug: body.eventSlug }, select: { id: true } }) : null;
    if (body.eventSlug && !event) throw new Error("The selected event no longer exists.");
    data.eventId = event?.id ?? null;
  }
  if (data.photoUrl) {
    const url = String(data.photoUrl);
    if (!(await imagePathResolves(url))) throw new Error("Choose an existing public image from the media library.");
    const media = await db.mediaAsset.findFirst({ where: { url }, select: { kind: true, visibility: true } });
    if (media && (media.kind !== "IMAGE" || media.visibility !== "PUBLIC")) throw new Error("Speaker photos must be public images.");
  }
  return { body, data };
}
