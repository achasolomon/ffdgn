import { db, failFrom } from "@/app/api/v1/_lib";
import { conferenceAuth, conferenceError, lockConfig, mutationGuard, problem, readBody, transactionalAudit } from "@/lib/conference/server";
import { badgePdf } from "@/lib/conference/badge";
import { activeInvitation, invitationCredentials } from "@/lib/conference/credentials";

type Context = { params: Promise<{ eventId: string }> };
export async function POST(req: Request, { params }: Context) {
  try {
    const { eventId } = await params; const { auth } = await conferenceAuth(eventId, "gate"); await mutationGuard(req, auth, "gate");
    const body = await readBody(req);
    if (typeof body.registrationId !== "string" || !/^[a-f0-9-]{36}$/i.test(body.registrationId)) problem(422, "VALIDATION", "Supply a registration ID.");
    const registrationId = body.registrationId as string;
    const details = await db.eventRegistration.findFirst({ where: { eventId, id: registrationId }, include: { attendee: true, user: { select: { name: true } }, event: { select: { title: true } }, admission: true, invitation: true } });
    if (!details?.admission || details.status !== "Registered") problem(409, "NOT_ADMITTED", "A current registration with a recorded admission is required before issuing a badge.");
    if (!activeInvitation(details.invitation, details.status, true)) problem(409, "INACTIVE", "A valid entry QR is required for this tag.");
    const bytes = await badgePdf({ fullName: details.attendee?.fullName ?? details.user?.name ?? "Invited guest", organization: details.attendee?.organization ?? "", jobTitle: details.attendee?.jobTitle ?? "", category: details.guestCategory, eventTitle: details.event.title, admissionId: details.admission.id, registrationId, qrToken: invitationCredentials(details.invitation).qrToken });
    await db.$transaction(async tx => {
      await lockConfig(tx, eventId); await conferenceAuth(eventId, "gate", tx);
      await tx.$queryRaw`SELECT id FROM event_registrations WHERE id = ${registrationId} FOR UPDATE`;
      const current = await tx.eventRegistration.findUnique({ where: { id: registrationId }, include: { admission: true, invitation: true } });
      if (!current?.admission || current.status !== "Registered") problem(409, "NOT_ADMITTED", "Registration is no longer eligible for badge issuance.");
      if (!activeInvitation(current.invitation, current.status, true) || current.invitation.generation !== details.invitation!.generation) problem(409, "INACTIVE", "The entry QR changed. Download a new tag.");
      await transactionalAudit(tx, auth, eventId, "conference.badge.download", `registration=${registrationId}; admission=${current.admission.id}; physicalPrint=unconfirmed`);
    });
    return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="conference-badge.pdf"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { const response = failFrom(conferenceError(error)); response.headers.set("Cache-Control", "private, no-store"); return response; }
}
export const dynamic = "force-dynamic";
