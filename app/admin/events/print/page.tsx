import { conferenceAuth, conferenceError } from "@/lib/conference/server";
import { readBadgePrint } from "@/lib/conference/printing";
import { AuthError } from "@/lib/server-auth";
import { ConferenceBadgePrinter } from "@/components/conference-badge-printer";
import { badgePreview } from "@/lib/conference/badge";

export default async function PrintPage({ searchParams }: { searchParams: Promise<{ event?: string; id?: string }> }) {
  const { event, id } = await searchParams;
  let request: Awaited<ReturnType<typeof readBadgePrint>> | undefined, message = "";
  try { if (!event || !id) throw new AuthError(422, "VALIDATION", "Open a prepared badge request from the gate screen."); const { auth } = await conferenceAuth(event, "gate"); request = await readBadgePrint(event, id, auth); }
  catch (error) { const mapped = conferenceError(error); if (mapped instanceof AuthError) message = mapped.message; else throw mapped; }
  if (!request || !event) return <div role="alert" className="p-8">{message}</div>;
  const artwork = await badgePreview({ ...request.snapshot, qrDataUrl: request.qrDataUrl });
  return <ConferenceBadgePrinter key={request.id} eventId={event} request={request} artwork={artwork} />;
}
export const dynamic = "force-dynamic";
