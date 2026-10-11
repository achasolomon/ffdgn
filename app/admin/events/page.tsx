import Link from "next/link";
import { AdminEventManager } from "@/components/admin-event-manager";
import { db, dbReady } from "@/lib/db";
import { getAuth } from "@/lib/server-auth";
import { hasPermission, type Permission } from "@/lib/auth";

export default async function AdminEventsPage() {
  const auth = await getAuth();
  const canAccess = !!auth && (["events.view", "events.create", "events.edit"] as Permission[]).some((permission) => hasPermission(auth.user.role, permission));
  if (!canAccess) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Events / Conferences</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#1c3526]">Access unavailable</h1>
        <p className="mt-2 text-sm text-[#69776d]">Event management requires an event capability.</p>
        <Link href="/admin" className="mt-5 inline-flex text-sm font-semibold text-[#23613f]">Back to overview</Link>
      </div>
    );
  }

  const live = await dbReady();
  const rows = live ? await db.forumEvent.findMany({
    include: {
      programme: { orderBy: { position: "asc" } },
      speakers: { include: { member: { select: { slug: true } } }, orderBy: { position: "asc" } },
      documents: { select: { slug: true } },
    },
    orderBy: { startDate: "desc" },
    take: 100,
  }) : [];

  // Titles for the slugs attached to each event, so the editor's downloads
  // panel can read "Communiqué 2025" instead of the raw URL slug.
  const documents = live ? await db.knowledgeDoc.findMany({ select: { slug: true, title: true } }) : [];
  const members = live ? await db.member.findMany({ select: { slug: true, fullName: true }, orderBy: { fullName: "asc" } }) : [];
  const docTitles = Object.fromEntries(documents.map((document) => [document.slug, document.title]));

  const events = rows.map((event) => ({
    slug: event.slug,
    title: event.title,
    theme: event.theme,
    kind: event.kind,
    startDate: event.startDate.toISOString().slice(0, 10),
    endDate: event.endDate.toISOString().slice(0, 10),
    venue: event.venue,
    city: event.city,
    status: event.status,
    summary: event.summary,
    highlights: event.highlights ?? "",
    coverUrl: event.coverUrl ?? "",
    published: event.published,
    guests: event.guestList ?? "",
    programme: event.programme.map((slot) => ({ time: slot.slotTime, session: slot.session, speaker: slot.speaker ?? "" })),
    speakers: event.speakers.map((speaker) => speaker.member.slug),
    documents: event.documents.map((document) => document.slug),
  }));

  return (
    <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Publishing / Events</p>
          <h1 className="mt-1.5 text-[26px] font-semibold tracking-normal text-[#1c3526]">Events &amp; conferences</h1>
          <p className="mt-1 text-[13px] text-[#738077]">Manage event records, programmes, speakers, and public visibility.</p>
        </div>
        <p className="border border-[#dce2dc] bg-white px-3 py-2 text-[11px] font-medium text-[#68756b]">{rows.filter((event) => event.published).length} live · {rows.filter((event) => !event.published).length} drafts</p>
      </div>
      {!live && <p role="alert" className="mb-5 border border-[#e4d3a8] bg-[#fffaf0] px-4 py-3 text-[13px] text-[#755b23]">MySQL is unavailable. Connect the database to manage events.</p>}
      <Link href="/admin/events/speakers" className="mb-5 inline-block border bg-white px-4 py-3 text-sm font-semibold">Manage conference speakers, biographies & photos</Link>
      <AdminEventManager
        events={events}
        docTitles={docTitles}
        members={members}
        canCreate={hasPermission(auth.user.role, "events.create")}
        canEdit={hasPermission(auth.user.role, "events.edit")}
      />
    </div>
  );
}