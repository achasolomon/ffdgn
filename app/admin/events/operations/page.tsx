import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db, dbReady } from "@/lib/db";
import { getAuth } from "@/lib/server-auth";
import { STAFF_ROLES } from "@/lib/auth";
import { conferenceAllowed } from "@/lib/conference/input";
import { conferenceEnabled } from "@/lib/conference/server";
import { ConferenceGuestTools } from "@/components/conference-guest-tools";
import { ConferenceInvitationDirectory } from "@/components/conference-invitation-directory";
import { ConferenceWalkinRegistration } from "@/components/conference-walkin-registration";
import { ArrowRight, UserPlus, UsersRound, Upload, ScanLine, Settings, BarChart3 } from "lucide-react";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ConferenceStaffInvitationStatus } from "@/components/conference-staff-invitation-status";

export default async function ConferenceOperationsPage({ searchParams }: { searchParams: Promise<{ event?: string; q?: string; page?: string; view?: string }> }) {
  const auth = await getAuth();
  if (!auth || !STAFF_ROLES.includes(auth.user.role)) return <div className="p-8"><h1 className="text-xl font-semibold">Conference operations unavailable</h1><p className="mt-3 text-sm">Sign in with an institutional staff account.</p></div>;
  if (!conferenceEnabled()) return <div className="space-y-4 p-8"><h1 className="text-2xl font-semibold">Conference guest desk</h1><p>The guest desk is not ready yet. Ask your administrator to complete the conference setup.</p><Link href="/admin/events" className="inline-block rounded-lg border px-4 py-3 text-sm">View events</Link></div>;
  if (!(await dbReady())) return <div role="alert" className="p-8">We cannot load the guest list right now. Check your connection and try again. If this continues, contact your administrator.</div>;
  const query = await searchParams;
  const view = ["register", "guests", "upload", "settings", "account"].includes(query.view ?? "") ? query.view! : query.q ? "guests" : "home";
  const globalAccess = ["super_admin", "secretariat_admin"].includes(auth.user.role);
  let migrationMissing = false;
  try { await db.conferenceConfig.count(); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code)) migrationMissing = true;
    else throw error;
  }
  if (migrationMissing) return <div role="alert" className="p-8">Conference setup is incomplete. Ask your administrator to finish setup before registering guests.</div>;
    const events = await db.forumEvent.findMany({ where: globalAccess ? {} : { conferenceAssignments: { some: { userId: auth.user.id } } }, select: { id: true, title: true, startDate: true, conferenceConfig: true, conferenceAssignments: { where: { userId: auth.user.id }, select: { role: true } } }, orderBy: { startDate: "desc" }, take: 200 });
    const selected = query.event ? events.find(event => event.id === query.event) : events[0];
    if (query.event && !selected) return <div className="p-8">This event is unavailable to your account.</div>;
    const canManage = selected ? conferenceAllowed(auth.user.role, selected.conferenceAssignments[0]?.role ?? null, "settings") : false;
    const canGuests = selected ? conferenceAllowed(auth.user.role, selected.conferenceAssignments[0]?.role ?? null, "guests") : false;
    const canGate = selected ? conferenceAllowed(auth.user.role, selected.conferenceAssignments[0]?.role ?? null, "gate") : false;
    const canView = selected ? conferenceAllowed(auth.user.role, selected.conferenceAssignments[0]?.role ?? null, "view") : false;
    const q = (query.q ?? "").trim().slice(0, 100);
    const page = Math.max(1, Math.min(10000, Number.parseInt(query.page ?? "1") || 1));
    const where: Prisma.EventRegistrationWhereInput = { eventId: selected?.id ?? "", ...(q ? { OR: [{ attendee: { fullName: { contains: q } } }, { attendee: { email: { contains: q } } }, { user: { name: { contains: q } } }, { user: { email: { contains: q } } }] } : {}) };
    const [guests, total, staff] = selected && canView ? await Promise.all([
      db.eventRegistration.findMany({ where, include: { attendee: true, user: { select: { name: true, email: true } }, invitation: { select: { generation: true, revokedAt: true, expiresAt: true, emailJobs: { orderBy: { createdAt: "desc" }, take: 1, select: { state: true } } } } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 25, skip: (page - 1) * 25 }),
      db.eventRegistration.count({ where }),
      canManage ? db.conferenceStaffAssignment.findMany({ where: { eventId: selected.id }, include: { user: { select: { name: true, email: true, staffSetupInvitation: { select: { state: true, consumedAt: true, expiresAt: true } } } } } }) : Promise.resolve([]),
    ]) : [[], 0, []];
    const pages = Math.max(1, Math.ceil(total / 25));
    const href = (task: string) => ({ pathname: "/admin/events/operations", query: { event: selected?.id ?? "", ...(task !== "home" ? { view: task } : {}) } });
    const tasks = [
      ...(canGuests ? [
        { view: "register", label: "Register a new guest", description: "For a guest who arrives without registration. Add their details and print a tag.", icon: UserPlus },
        { view: "guests", label: "Find a guest & print a tag", description: "For an invited or registered guest. Find their name, print a tag or send their invitation.", icon: UsersRound },
        { view: "upload", label: "Upload an invited guest list", description: "Add VIPs, dignitaries and other invited guests from your prepared list.", icon: Upload },
      ] : canView ? [{ view: "guests", label: "View guest list", description: "Find guests and view their registration and invitation replies.", icon: UsersRound }] : []),
      ...(canManage ? [{ view: "settings", label: "Event settings", description: "Set up registration, entry rules and the event team.", icon: Settings }] : []),
    ];
    const ready = !!selected?.conferenceConfig?.enabled;
    const focused = view === "guests" || view === "upload";
    return <div className={`mx-auto max-w-6xl ${focused ? "space-y-4" : "space-y-6"} px-4 py-6 sm:px-8 sm:py-8`}>
      <header><p className="text-sm font-semibold text-forest-700">Conference</p><h1 className="mt-1 text-2xl font-semibold text-forest-950">{view === "guests" ? "Find guest & print tag" : view === "upload" ? "Upload invited guests" : "Guest desk"}</h1>{!focused && <p className="mt-2 text-base text-gray-600">Choose your event, then select what you want to do.</p>}</header>
      {!!events.length && <form method="GET" className={focused ? "flex flex-wrap items-end gap-2" : "flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4"}>{focused && <input type="hidden" name="view" value={view} />}<label className="min-w-0 flex-1 text-sm font-semibold"><span className={focused ? "sr-only" : ""}>Event</span><select name="event" defaultValue={selected?.id} className="mt-2 w-full rounded-lg border p-3 text-base">{events.map(event => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label><button className="rounded-lg bg-forest-900 px-5 py-3 font-semibold text-white">Open event</button></form>}
      {view === "account" ? <section className="space-y-5 rounded-xl border bg-white p-5"><Link className="inline-block rounded-lg border px-4 py-3 font-semibold" href="/admin/events/operations">← Back to guest desk</Link><h2 className="text-xl font-semibold">My account</h2><p>{auth.user.name} · {auth.user.email}</p><p className="text-sm text-gray-600">Keep your password private. After changing it, sign in again with your new password.</p><ChangePasswordForm /></section> : !selected ? <p className="rounded-xl border bg-white p-5">No events are available to your account yet. Ask your administrator to add you to the event team.</p> : <>
        {!focused && <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{selected.title}</h2><p className="mt-1 text-sm text-gray-600">{new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeZone: "UTC" }).format(selected.startDate)}</p></div><span className={`rounded-full px-3 py-2 text-sm font-semibold ${ready ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>{ready ? "Guest registration is open" : "Guest registration is not open"}</span></div>}
        {!ready && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-5"><p className="font-semibold">Open guest registration to get started</p><p className="mt-2 text-sm">{canManage ? "Go to Event settings, turn on guest registration and save. You can then register guests and print their tags." : "Ask your event manager to open guest registration."}</p>{canManage && view !== "settings" && <Link href={href("settings")} className="mt-3 inline-block rounded-lg border border-amber-900 px-4 py-3 font-semibold">Open event settings</Link>}</div>}
        {view === "home" ? <section aria-label="Conference tasks" className="grid gap-4 sm:grid-cols-2">
          {tasks.map(task => <Link key={task.view} href={href(task.view)} className="group flex items-start gap-4 rounded-xl border bg-white p-5 transition hover:border-forest-700 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest-700"><task.icon aria-hidden="true" className="mt-1 h-7 w-7 shrink-0 text-forest-700" /><div className="min-w-0 flex-1"><h3 className="text-lg font-semibold">{task.label}</h3><p className="mt-2 text-sm leading-6 text-gray-600">{task.description}</p></div><ArrowRight aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-forest-700" /></Link>)}
          {canGate && ready && <Link href={{ pathname: "/admin/events/gate", query: { event: selected.id } }} className="flex items-start gap-4 rounded-xl bg-forest-900 p-5 text-white"><ScanLine aria-hidden="true" className="mt-1 h-7 w-7 shrink-0" /><div><h3 className="text-lg font-semibold">Check guests in at the gate</h3><p className="mt-2 text-sm leading-6">Scan a phone QR or printed tag, check the guest’s details and confirm entry.</p></div></Link>}
          {canView && <Link href={{ pathname: "/admin/events/reports", query: { event: selected.id } }} className="flex items-start gap-4 rounded-xl border bg-white p-5"><BarChart3 aria-hidden="true" className="mt-1 h-7 w-7 shrink-0 text-forest-700" /><div><h3 className="text-lg font-semibold">View attendance</h3><p className="mt-2 text-sm leading-6 text-gray-600">See who has entered the event and download the attendance list.</p></div></Link>}
        </section> : <>
        <form method="GET" className="flex gap-2 sm:hidden"><input type="hidden" name="event" value={selected.id} /><select name="view" aria-label="Guest desk task" defaultValue={view} className="min-w-0 flex-1 rounded-lg border bg-white p-2.5 text-sm"><option value="home">All tasks</option>{tasks.map(task => <option key={task.view} value={task.view}>{task.label}</option>)}</select><button className="rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold">Open</button></form><nav aria-label="Guest desk tasks" className="hidden flex-wrap gap-2 sm:flex"><Link href={href("home")} className="rounded-lg border bg-white px-4 py-3 text-sm font-semibold">All tasks</Link>{tasks.map(task => <Link key={task.view} href={href(task.view)} aria-current={view === task.view ? "page" : undefined} className={`rounded-lg border px-4 py-3 text-sm font-semibold ${view === task.view ? "border-forest-900 bg-forest-900 text-white" : "bg-white"}`}>{task.label}</Link>)}</nav>
        {view === "register" && canGuests && ready && <ConferenceWalkinRegistration eventId={selected.id} />}
        {view === "guests" && canView && <section className="min-w-0 space-y-4 rounded-xl border bg-white p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Guest directory</h3><span className="text-sm text-gray-600">{total} {q ? "matching guests" : "guests"}</span></div>
            <p className="text-sm text-gray-600">{canGuests ? "Find a guest and open their tag. Select guests to send invitations." : "Search by name or email to view a guest’s registration and attendance reply."}</p>
            <form className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" method="GET"><input type="hidden" name="event" value={selected.id} /><input type="hidden" name="view" value="guests" /><label className="col-span-2 min-w-0 sm:flex-1"><span className="sr-only">Guest name or email</span><input name="q" defaultValue={q} placeholder="Search guest name or email" maxLength={100} className="w-full rounded-lg border p-3 text-base" /></label><button className="self-end rounded-lg bg-forest-900 px-5 py-3 font-semibold text-white">Find guest</button>{q && <Link href={href("guests")} className="self-end rounded-lg border px-4 py-3">Clear search</Link>}</form>
            <ConferenceInvitationDirectory key={`${selected.id}:${page}:${q}`} eventId={selected.id} enabled={selected.conferenceConfig?.enabled ?? false} canSend={canGuests} rows={guests.map(guest => ({ id: guest.id, fullName: guest.attendee?.fullName ?? guest.user?.name ?? "Invited guest", email: guest.attendee?.email ?? guest.user?.email ?? "", organization: guest.attendee?.organization ?? "", category: guest.guestCategory, status: guest.status, memberRegistration: !guest.attendeeId, rsvp: guest.conferenceRsvp, invitation: guest.invitation ? { generation: guest.invitation.generation, revoked: !!guest.invitation.revokedAt, expiresAt: guest.invitation.expiresAt.toISOString(), latestState: guest.invitation.emailJobs[0]?.state ?? null } : null }))} />
            {!guests.length && <p className="rounded-lg bg-paper p-5 text-sm text-gray-600">{q ? "No guests found. Try another name or email." : "Your guest list is empty. Register a new guest or upload your invited guest list to begin."}</p>}
            <div className="flex flex-wrap items-center gap-4 text-sm"><span>Page {page} of {pages}</span>{page > 1 && <Link className="rounded-lg border px-4 py-3" href={{ pathname: "/admin/events/operations", query: { event: selected.id, view: "guests", q, page: page - 1 } }}>Previous page</Link>}{page < pages && <Link className="rounded-lg border px-4 py-3" href={{ pathname: "/admin/events/operations", query: { event: selected.id, view: "guests", q, page: page + 1 } }}>Next page</Link>}</div>
          </section>}
          {(view === "upload" || view === "settings") && <ConferenceGuestTools key={`${selected.id}:${view}:${selected.conferenceConfig?.updatedAt.toISOString() ?? "new"}`} mode={view} eventId={selected.id} config={selected.conferenceConfig ? { enabled: selected.conferenceConfig.enabled, capacity: selected.conferenceConfig.capacity, requireAcceptedRsvp: selected.conferenceConfig.requireAcceptedRsvp } : null} canManage={canManage} canGuests={canGuests} canAssign={globalAccess} />}
          {view === "settings" && canManage && <section className="rounded-xl border bg-white p-5"><h3 className="text-lg font-semibold">Event team</h3>{staff.length ? staff.map(item => <div key={item.id} className="mt-4 border-t pt-4"><p className="break-words text-sm">{item.user.name} · {item.user.email} · {({ Manager: "Event manager", RegistrationOfficer: "Guest registration and gate officer", ReportingOfficer: "Attendance viewer", GateOfficer: "Gate check-in and tags" })[item.role]}</p>{globalAccess && item.user.staffSetupInvitation && <ConferenceStaffInvitationStatus eventId={selected.id} userId={item.userId} state={item.user.staffSetupInvitation.state} consumed={!!item.user.staffSetupInvitation.consumedAt} expired={item.user.staffSetupInvitation.expiresAt <= new Date()} />}</div>) : <p className="mt-2 text-sm text-gray-600">No extra team members have been added. Administrators can already manage this event.</p>}</section>}
        </>}
        {!focused && <p className="rounded-xl bg-forest-50 px-4 py-2 text-xs leading-5 text-forest-900"><strong>Remember:</strong> Register the guest → print their tag → scan the tag at the gate. An invited guest can also show the QR on their phone.</p>}
      </>}
    </div>;
}
export const dynamic = "force-dynamic";
