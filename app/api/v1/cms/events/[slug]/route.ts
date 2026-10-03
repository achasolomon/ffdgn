import { db, dbReady, fail, failFrom, ok } from "../../../_lib";
import { parseEventInput } from "@/lib/cms-event-input";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";

async function validateRelations(speakers: string[], documents: string[], eventId: string) {
  if (speakers.length && (await db.member.count({ where: { slug: { in: speakers } } })) !== speakers.length) return "One or more speakers are not members in the directory.";
  if (documents.length && (await db.knowledgeDoc.count({ where: { slug: { in: documents } } })) !== documents.length) return "One or more related documents were not found.";
  if (documents.length && (await db.knowledgeDoc.count({ where: { slug: { in: documents }, eventId: { not: null, notIn: [eventId] } } })) > 0) return "A related document is already assigned to another event.";
  return null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Event management requires MySQL.", 503);
    const auth = await requirePermission("events.edit");
    const gate = await rateLimit(`cms.events:${auth.user.id}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many event edits. Try again shortly.", 429);
    const { slug } = await params;
    const existing = await db.forumEvent.findUnique({ where: { slug } });
    if (!existing) return fail("NOT_FOUND", "Event not found.", 404);
    const parsed = parseEventInput(await req.json().catch(() => null));
    if (parsed.error || !parsed.value) return fail("VALIDATION", parsed.error ?? "Invalid event.", 422);
    if (parsed.value.published !== existing.published) await requirePermission("events.publish");
    const relationError = await validateRelations(parsed.value.speakers, parsed.value.documents, existing.id);
    if (relationError) return fail("VALIDATION", relationError, 422);

    const { programme, speakers, documents, guests, ...value } = parsed.value;
    const updated = await db.$transaction(async (tx) => {
      const event = await tx.forumEvent.update({
        where: { id: existing.id },
        data: {
          ...value,
          guestList: guests,
          programme: {
            deleteMany: {},
            create: programme.map((slot, position) => ({ slotTime: slot.time, session: slot.session, speaker: slot.speaker, position })),
          },
          speakers: {
            deleteMany: {},
            create: speakers.map((memberSlug, position) => ({ member: { connect: { slug: memberSlug } }, position })),
          },
        },
        select: { slug: true, title: true, published: true },
      });
      await tx.knowledgeDoc.updateMany({ where: { eventId: existing.id }, data: { eventId: null } });
      if (documents.length) await tx.knowledgeDoc.updateMany({ where: { slug: { in: documents } }, data: { eventId: existing.id } });
      return event;
    });
    await audit("events.update", `event:${slug}`, {
      previousValue: `${existing.published ? "Published" : "Draft"}: ${existing.title}`,
      newValue: `${updated.published ? "Published" : "Draft"}: ${updated.title}`,
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite(`event updated ${slug}`);
    return ok(updated, { revalidated: true });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";