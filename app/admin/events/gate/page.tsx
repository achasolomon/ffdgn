import Link from "next/link";
import { conferenceAuth, conferenceEnabled } from "@/lib/conference/server";
import { ConferenceGate } from "@/components/conference-gate";
import { AuthError } from "@/lib/server-auth";

export default async function GatePage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  if (!event || !conferenceEnabled()) return <div className="p-8"><h1 className="text-2xl font-semibold">Conference gate</h1><p className="mt-3">Select an enabled conference from <Link className="underline" href="/admin/events/operations">conference operations</Link>.</p></div>;
  let selected: Awaited<ReturnType<typeof conferenceAuth>>["event"] | undefined, message = "";
  try { selected = (await conferenceAuth(event, "gate")).event; }
  catch (error) { if (error instanceof AuthError) message = error.message; else throw error; }
  if (!selected) return <div role="alert" className="p-8">{message}</div>;
  if (!selected.conferenceConfig?.enabled) return <div className="p-8">Enable conference operations for this event before opening the gate.</div>;
  return <div className="mx-auto max-w-4xl space-y-3 px-4 py-4 sm:px-6"><div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Gate check-in</h1><Link className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold" href={{ pathname: "/admin/events/operations", query: { event } }}>← Guest desk</Link></div><p className="text-sm text-gray-600">{selected.title}{selected.conferenceConfig.requireAcceptedRsvp && " · Confirmed RSVP required"}</p><ConferenceGate eventId={event} /></div>;
}
export const dynamic = "force-dynamic";
