import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { activeInvitation, encryptSecret, hashCredential, newCredentials } from "./credentials";
import { problem } from "./server";

// Caller holds the event config and registration locks. Printing never regenerates
// an existing credential: emailed and printed QR codes must remain identical.
export async function tagCredential(tx: Prisma.TransactionClient, eventId: string, registrationId: string) {
  const record = await tx.eventRegistration.findFirst({ where: { id: registrationId, eventId }, include: { invitation: true, event: { select: { endDate: true, status: true } } } });
  if (!record || record.status !== "Registered") problem(409, "PRINT_UNAVAILABLE", "A current registration is required for a QR tag.");
  if (record.invitation) {
    if (!activeInvitation(record.invitation, record.status, true)) problem(409, "INACTIVE", "Regenerate the expired or revoked QR before printing a tag.");
    return record.invitation;
  }
  const expiresAt = new Date(record.event.endDate.getTime() + 2 * 86400_000);
  if (record.event.status === "Past" || expiresAt <= new Date()) problem(409, "EVENT_CLOSED", "QR tags cannot be issued for a past event.");
  const id = randomUUID(), credentials = newCredentials();
  return tx.conferenceInvitation.create({ data: { id, registrationId, generation: 1, qrHash: hashCredential(credentials.qrToken), rsvpHash: hashCredential(credentials.rsvpToken), credentialEnvelope: encryptSecret(credentials, `invitation:${id}:1`), expiresAt } });
}
