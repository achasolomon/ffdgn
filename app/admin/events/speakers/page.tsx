import { getAuth } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";
import { db, dbReady } from "@/lib/db";
import { AdminSpeakers } from "@/components/admin-speakers";

export default async function Page({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const auth = await getAuth();
  if (!auth || !hasPermission(auth.user.role, "events.edit")) return <div className="p-8"><h1 className="text-2xl font-semibold">Access unavailable</h1><p className="mt-2">Your role does not allow editing this content.</p></div>;
  const live = await dbReady();
  const [speakers, events] = live ? await Promise.all([
    db.speaker.findMany({ include: { event: { select: { slug: true } } }, orderBy: [{ position: "asc" }, { name: "asc" }] }),
    db.forumEvent.findMany({ select: { slug: true, title: true }, orderBy: { startDate: "desc" } }),
  ]) : [[], []];
  const requested = (await searchParams).event ?? "";
  return <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8"><h1 className="text-3xl font-semibold">Conference speakers</h1><p className="mb-6 mt-2 text-sm text-[#69776d]">Create speaker profiles, choose their event, and manage biographies and photographs. Public profiles appear in the selected event’s speaker section.</p>{!live ? <p role="alert">Connect the database to manage speakers.</p> : <AdminSpeakers events={events} initialEvent={events.some(event => event.slug === requested) ? requested : ""} speakers={speakers.map(s => ({ slug: s.slug, name: s.name, role: s.role, honorific: s.honorific ?? "", org: s.org ?? "", bio: s.bio ?? "", photoUrl: s.photoUrl ?? "", keynote: s.keynote, position: s.position, visibility: s.visibility, eventSlug: s.event?.slug ?? "" }))} />}</div>;
}
export const dynamic = "force-dynamic";
