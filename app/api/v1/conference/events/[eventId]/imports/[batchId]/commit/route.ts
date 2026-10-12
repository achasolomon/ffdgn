import { Prisma } from "@prisma/client";
import { db, ok, failFrom } from "@/app/api/v1/_lib";
import { addGuest, checkCapacity, conferenceAuth, conferenceError, lockConfig, mutationGuard, problem, transactionalAudit } from "@/lib/conference/server";
import { validateGuest, type GuestInput } from "@/lib/conference/input";

export async function POST(req: Request, { params }: { params: Promise<{ eventId: string; batchId: string }> }) {
  try {
    const { eventId, batchId } = await params; const { auth } = await conferenceAuth(eventId, "guests"); await mutationGuard(req, auth);
    const result = await db.$transaction(async tx => {
      const config = await lockConfig(tx, eventId); await conferenceAuth(eventId, "guests", tx);
      await tx.$queryRaw`SELECT id FROM conference_imports WHERE id = ${batchId} AND event_id = ${eventId} FOR UPDATE`;
      const batch = await tx.conferenceImport.findFirst({ where: { id: batchId, eventId, actorId: auth.user.id } });
      if (!batch) problem(404, "NOT_FOUND", "Import preview not found.");
      if (batch.state === "Committed") return batch.result;
      if (batch.expiresAt < new Date()) problem(409, "EXPIRED", "Preview expired. Upload the CSV again.");
      const rows = batch.rows as unknown as Array<{ guest: GuestInput; errors: string[] }>;
      if (!Array.isArray(rows) || !rows.length || rows.some(row => row.errors.length || validateGuest(row.guest).errors.length)) problem(422, "VALIDATION", "Correct all preview errors and upload again before importing.");
      await checkCapacity(tx, eventId, config.capacity, rows.length);
      for (const row of rows) await addGuest(tx, eventId, row.guest);
      const summary = { imported: rows.length, emailsSent: 0 };
      await tx.conferenceImport.update({ where: { id: batchId }, data: { state: "Committed", rows: Prisma.DbNull, result: summary } });
      await transactionalAudit(tx, auth, eventId, "conference.import.commit", `batch=${batchId}; imported=${rows.length}`);
      return summary;
    }, { timeout: 30_000 });
    return ok(result);
  } catch (error) { return failFrom(conferenceError(error)); }
}
export const dynamic = "force-dynamic";
