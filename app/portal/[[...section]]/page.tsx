import Link from "next/link";
import { Bell, CalendarDays, MessagesSquare, Users, Settings, FolderLock } from "lucide-react";
import { getAuth } from "@/lib/server-auth";
import { PORTAL_LINKS, PORTAL_ROOT } from "@/lib/routes";
import { ChangePasswordForm } from "@/components/change-password-form";
import { PortalEventList } from "@/components/portal-event-list";
import { PortalDiscussions } from "@/components/portal-discussions";
import { PortalNotificationList } from "@/components/portal-notification-list";
import { PortalCommitteeWorkspace } from "@/components/portal-committee-workspace";

const ICONS: Record<string, typeof Users> = {
  "Member Directory": Users,
  Events: CalendarDays,
  Documents: FolderLock,
  Committees: Users,
  Discussions: MessagesSquare,
  Notifications: Bell,
};

/**
 * Portal sections with a working screen behind them.
 *
 * Every other tile renders as explicitly unavailable rather than as a link to a
 * stub. A member clicking "Documents" and landing on a paragraph describing a
 * workspace that does not exist is worse than being told it is not ready.
 */
const LIVE_SECTIONS = new Set(["profile", "events", "discussions", "notifications", "committees"]);

/** Status tiles: derived from the session, never hardcoded as if measured. */
function statusTiles(role: string | undefined): [string, string][] {
  return [
    ["Role", role ?? "unknown"],
    ["Session", "MySQL-backed · 8h idle timeout"],
    ["Visibility", "Content access per your role"],
    ["Audit", "Your actions are recorded"],
  ];
}

export default async function Portal({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section: segments } = await params;
  const auth = await getAuth();

  if (segments?.length) {
    const section = segments.join(" / ");
    const slug = segments[0];

    if (slug === "profile") {
      return (
        <div className="mx-auto max-w-2xl px-5 py-12">
          <p className="eyebrow">Member portal</p>
          <h1 className="font-display mt-2 text-4xl text-forest-950">Profile &amp; settings</h1>
          <div className="mt-6 border hairline bg-white p-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                ["Name", auth?.user.name ?? "—"],
                ["Email", auth?.user.email ?? "—"],
                ["Role", auth?.user.role ?? "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">{k}</dt>
                  <dd className="mt-1 text-sm font-semibold text-forest-950">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[12.5px] text-ink/60">
              Name, email and role are institutional records. Ask the Secretariat to correct any of
              them; self-service identity edits are not enabled.
            </p>
          </div>
          <ChangePasswordForm />
          <p className="mt-6">
            <Link href={PORTAL_ROOT} className="text-sm font-semibold text-primary">
              ← Back to dashboard
            </Link>
          </p>
        </div>
      );
    }

    if (slug === "events" || slug === "discussions" || slug === "notifications" || slug === "committees") {
      const title = slug === "events" ? "Events" : slug === "discussions" ? "Discussions" : slug === "notifications" ? "Notifications" : "Committees";
      return (
        <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8 sm:py-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Member portal / {title}</p>
          <h1 className="mt-1.5 text-[26px] font-semibold text-[#1c3526]">{title}</h1>
          <div className="mt-6">
            {slug === "events" && <PortalEventList />}
            {slug === "discussions" && <PortalDiscussions />}
            {slug === "notifications" && <PortalNotificationList />}
            {slug === "committees" && <PortalCommitteeWorkspace />}
          </div>
          <p className="mt-6"><Link href={PORTAL_ROOT} className="text-[12px] font-semibold text-[#28623e]">Back to portal overview →</Link></p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-shell px-5 py-12">
        <p className="eyebrow">Member portal</p>
        <h1 className="font-display mt-2 text-4xl capitalize text-forest-950">{slug}</h1>
        <div className="mt-6 border hairline bg-white p-8 text-center">
          <p className="font-semibold">This workspace is not available yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
            The &ldquo;{section}&rdquo; section is part of the portal information architecture but has
            no screen behind it yet. Nothing you do here would be saved, so it is not offered as a
            link.
          </p>
          <Link href={PORTAL_ROOT} className="mt-4 inline-block text-sm font-semibold text-primary">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const firstName = auth?.user.name.split(" ").slice(-1)[0] ?? "Your Excellency";

  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <p className="eyebrow">Member portal · private — not indexed</p>
      <h1 className="font-display mt-2 text-4xl text-forest-950">
        Good day, {auth?.user.name ?? "Your Excellency"}
      </h1>
      <p className="mt-2 text-sm text-ink/60">
        Signed in as {auth?.user.email} · {firstName} — same institutional language, denser workspace.
      </p>

      <div
        className="mt-8 grid gap-4 border hairline bg-white p-5 sm:grid-cols-2 lg:grid-cols-4"
        role="status"
        aria-label="Your session at a glance"
      >
        {statusTiles(auth?.user.role).map(([k, v]) => (
          <div key={k} className="border-l-2 border-gold pl-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">{k}</p>
            <p className="mt-1 text-sm font-semibold text-forest-950">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PORTAL_LINKS.filter((l) => l.label !== "Profile & Settings").map((l) => {
          const live = LIVE_SECTIONS.has(l.href.replace("/portal/", ""));
          const Icon = ICONS[l.label] ?? Users;
          const body = (
            <>
              <Icon size={20} className="text-primary" aria-hidden />
              <p className="mt-3 font-semibold text-forest-950">{l.label}</p>
              <p className="text-[13px] text-ink/70">{l.desc}</p>
              {!live && <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Coming soon</p>}
            </>
          );
          const className = `border hairline bg-white p-6 ${live ? "hover:shadow-card" : "opacity-75"}`;
          return live ? (
            <Link key={l.label} href={l.href} className={className}>
              {body}
            </Link>
          ) : (
            <div key={l.label} className={className} aria-disabled="true">
              {body}
            </div>
          );
        })}

        <Link
          href="/portal/profile"
          className="border hairline bg-white p-6 hover:shadow-card"
        >
          <Settings size={20} className="text-primary" aria-hidden />
          <p className="mt-3 font-semibold">Profile &amp; Settings</p>
          <p className="text-[13px] text-ink/70">Change password, review your access</p>
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-2 border border-gold/60 bg-paper px-5 py-4 text-[13px] text-ink/70">
        <Users size={16} className="shrink-0 text-gold-deep" aria-hidden />
        <p>
          Protected by MySQL-backed sessions (8h timeout) and capability checks (
          <code>members.view</code>, <code>documents.view</code>…). Manage credentials in{" "}
          <Link href="/portal/profile" className="font-semibold text-primary">
            Profile &amp; Settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
