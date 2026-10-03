import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { parseEventInput } from "@/lib/cms-event-input";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";

async function validateRelations(speakers: string[], documents: string[]) {
  if (speakers.length && (await db.member.count({ where: { slug: { in: speakers } } })) !== speakers.length) return "One or more speakers are not members in the directory.";
  if (documents.length && (await db.knowledgeDoc.count({ where: { slug: { in: documents } } })) !== documents.length) return "One or more related documents were not found.";
  if (documents.length && (await db.knowledgeDoc.count({ where: { slug: { in: documents }, eventId: { not: null } } })) > 0) return "A related document is already assigned to another event.";
  return null;
}

export async function POST(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Event management requires MySQL.", 503);
    const auth = await requirePermission("events.create");
    const gate = await rateLimit(`cms.events:${auth.user.id}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many event edits. Try again shortly.", 429);
    const parsed = parseEventInput(await req.json().catch(() => null));
    if (parsed.error || !parsed.value) return fail("VALIDATION", parsed.error ?? "Invalid event.", 422);
    if (parsed.value.published) await requirePermission("events.publish");
    const relationError = await validateRelations(parsed.value.speakers, parsed.value.documents);
    if (relationError) return fail("VALIDATION", relationError, 422);
    if (await db.forumEvent.findUnique({ where: { slug: parsed.value.slug }, select: { id: true } })) return fail("CONFLICT", "That event slug is already in use.", 409);

    const { programme, speakers, documents, guests, ...value } = parsed.value;
    const event = await db.$transaction(async (tx) => {
      const created = await tx.forumEvent.create({
        data: {
          ...value,
          guestList: guests,
          programme: { create: programme.map((slot, position) => ({ slotTime: slot.time, session: slot.session, speaker: slot.speaker, position })) },
          speakers: { create: speakers.map((slug, position) => ({ member: { connect: { slug } }, position })) },
        },
        select: { id: true, slug: true, title: true, published: true },
      });
      if (documents.length) await tx.knowledgeDoc.updateMany({ where: { slug: { in: documents } }, data: { eventId: created.id } });
      return created;
    });
    await audit("events.create", `event:${event.slug}`, { newValue: `${event.published ? "Published" : "Draft"}: ${event.title}`, ip: clientIp(req.headers), actorOverride: auth });
    revalidatePublicSite(`event created ${event.slug}`);
    return ok(event, { revalidated: true });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";