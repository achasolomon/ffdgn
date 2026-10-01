import Link from "next/link";
import { Bell, CalendarDays, FileText, MessagesSquare, Users, Settings, FolderLock } from "lucide-react";
import { getAuth } from "@/lib/server-auth";

const TILES = [
  { icon: Users, t: "Member Directory", d: "Private directory with visibility controls", h: "/portal/members" },
  { icon: CalendarDays, t: "Events", d: "Registrations and conference records", h: "/portal/events" },
  { icon: FolderLock, t: "Documents", d: "Secure, permissioned library", h: "/portal/documents" },
  { icon: Users, t: "Committees", d: "Workspaces, meetings, recommendations", h: "/portal/committees" },
  { icon: MessagesSquare, t: "Discussions", d: "Threads, mentions, moderation", h: "/portal/discussions" },
  { icon: Bell, t: "Notifications", d: "Mentions, meetings, publications", h: "/portal/notifications" },
];

export default async function Portal({ params }: { params: { section?: string[] } }) {
  if (params.section?.length) {
    const section = params.section.join(" / ");
    return (
      <div className="mx-auto max-w-shell px-5 py-12">
        <p className="eyebrow">Member portal</p>
        <h1 className="font-display mt-2 text-4xl capitalize text-forest-950">{params.section[0]}</h1>
        <div className="mt-6 border hairline bg-white p-8 text-center">
          <p className="font-semibold">“{section}” workspace</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">Scaffolded under the portal information architecture (§17). Connects to the same institutional data via <code>/api/v1</code> with member-scoped visibility.</p>
          <Link href="/portal" className="mt-4 inline-block text-sm font-semibold text-primary">← Back to dashboard</Link>
        </div>
      </div>
    );
  }
  const auth = await getAuth();
  const firstName = auth?.user.name.split(" ").slice(-1)[0] ?? "Your Excellency";
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <p className="eyebrow">Member portal · private — not indexed</p>
      <h1 className="font-display mt-2 text-4xl text-forest-950">Good day, {auth?.user.name ?? "Your Excellency"}</h1>
      <p className="mt-2 text-sm text-ink/60">Signed in as {auth?.user.email} · role <code>{auth?.user.role}</code> · {firstName} — same institutional language, denser workspace.</p>
      <div className="mt-8 grid gap-4 border hairline bg-white p-5 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Your forum at a glance">
        {[["Membership", "Active · verified"], ["Upcoming event", "Annual Conference 2026"], ["Committee activity", "3 new documents"], ["Unread", "4 messages"]].map(([k, v]) => (
          <div key={k} className="border-l-2 border-gold pl-4"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink/50">{k}</p><p className="mt-1 text-sm font-semibold text-forest-950">{v}</p></div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => (
          <Link key={t.t} href={t.h} className="group border hairline bg-white p-6 hover:shadow-card">
            <t.icon size={20} className="text-primary" />
            <p className="mt-3 font-semibold text-forest-950 group-hover:text-primary">{t.t}</p>
            <p className="text-[13px] text-ink/60">{t.d}</p>
          </Link>
        ))}
        <Link href="/portal/profile" className="border hairline bg-white p-6 hover:shadow-card"><Settings size={20} className="text-primary" /><p className="mt-3 font-semibold">Profile & Settings</p><p className="text-[13px] text-ink/60">Visibility, credentials, 2FA</p></Link>
      </div>
      <div className="mt-6 flex items-center gap-2 border border-gold/60 bg-paper px-5 py-4 text-[13px] text-ink/65">
        <Users size={16} className="shrink-0 text-gold-deep" />
        <p>Protected by MySQL-backed sessions (8h timeout) and capability checks (<code>members.view</code>, <code>documents.view</code>…). Manage credentials in <Link href="/portal/profile" className="font-semibold text-primary">Profile & Settings</Link>.</p>
      </div>
      <p className="mt-4 flex items-center gap-2 text-[13px] text-ink/50"><FileText size={14} /> Private documents such as the 2024 peer-review record stay gated by visibility — see <Link href="/knowledge/primary-healthcare-peer-review-2024" className="font-semibold text-primary">restricted example →</Link></p>
    </div>
  );
}
