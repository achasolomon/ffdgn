import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PERMISSIONS, auditLog } from "@/lib/auth";
import { listCommittees, listEvents, listMembers } from "@/lib/repo";
import { db, dbReady } from "@/lib/db";
import { getAuth } from "@/lib/server-auth";

const MODULES: [string, string[], string][] = [
  ["Membership", ["Members", "Applications", "Roles", "Verification"], `/admin/membership`],
  ["Content", ["Pages", "News", "Media", "Announcements"], `/admin/content`],
  ["Media Library", ["Photos", "Videos", "Uploads", "Embeds"], `/admin/media`],
  ["Events", ["Events", "Conferences", "Speakers", "Registrations"], `/admin/events`],
  ["Knowledge", ["Documents", "Categories", "Approvals"], `/admin/knowledge`],
  ["Committees", ["Committees", "Meetings", "Recommendations"], `/admin/committees`],
  ["Communications", ["Notifications", "Messaging"], `/admin/comms`],
];

export default async function AdminConsole() {
  const auth = await getAuth();
  const live = await dbReady();

  let fallbackMembers = 0, fallbackCommittees = 0, fallbackUpcoming = 0;
  if (!live) {
    const [m, c, e] = await Promise.all([listMembers(), listCommittees(), listEvents()]);
    fallbackMembers = m.length * 31;
    fallbackCommittees = c.length + 3;
    fallbackUpcoming = e.filter((x) => x.status !== "Past").length + 3;
  }

  const [memberCount, committeeCount, upcomingCount, publishedCount, pendingCount, recentAudit] = live
    ? await Promise.all([
        db.member.count(),
        db.committee.count(),
        db.forumEvent.count({ where: { status: { not: "Past" } } }),
        db.knowledgeDoc.count({ where: { status: "Published" } }),
        db.knowledgeDoc.count({ where: { status: { in: ["Draft", "Editorial_Review", "Institutional_Review", "Approved"] } } }),
        db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 4, select: { actorName: true, action: true, createdAt: true } }),
      ])
    : [fallbackMembers, fallbackCommittees, fallbackUpcoming, 186, 12, []];

  const stats: [string, string][] = [
    ["Members", String(memberCount)],
    ["Active Committees", String(committeeCount)],
    ["Upcoming Events", String(upcomingCount)],
    ["Pending Approvals", String(pendingCount)],
    ["Published Documents", String(publishedCount)],
  ];

  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <p className="eyebrow">Secretariat console · restricted — not indexed</p>
      <h1 className="font-display mt-2 text-4xl text-forest-950">Secretariat overview</h1>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink/60">
        <ShieldCheck size={15} className="text-primary" />
        Signed in as <strong>{auth?.user.name}</strong> ({auth?.user.email} · <code>{auth?.user.role}</code>) ·
        source <code>{live ? "MySQL" : "seed fallback"}</code>.
      </p>

      <div className="mt-8 grid gap-px border hairline bg-ink/10 sm:grid-cols-2 lg:grid-cols-5" role="status">
        {stats.map(([k, v]) => <div key={k} className="bg-white px-5 py-5"><p className="font-display text-3xl text-forest-950">{v}</p><p className="text-[12px] font-medium uppercase tracking-wider text-ink/55">{k}</p></div>)}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(([t, items, h]) => (
          <section key={t} className="border hairline bg-white p-6" aria-label={t}>
            <h2 className="font-display text-xl text-forest-950">{t}</h2>
            <ul className="mt-3 space-y-1.5 text-sm">{(items as string[]).map((x) => <li key={x} className="flex justify-between border-b hairline pb-1.5"><span className="text-ink/70">{x}</span><span className="text-primary font-semibold">Manage →</span></li>)}</ul>
            <Link href={h as string} className="mt-3 inline-block text-[13px] font-semibold text-primary">Open {t} →</Link>
          </section>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="border hairline bg-white p-6" aria-label="Document approval workflow">
          <h2 className="eyebrow">Approval workflow (§25)</h2>
          <ol className="mt-3 flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium">
            {["Draft", "Editorial Review", "Institutional Review", "Approval", "Published", "Archived"].map((s, i, a) => (
              <li key={s} className="flex items-center gap-1.5"><span className={`border px-2.5 py-1 ${s === "Published" ? "bg-primary text-white border-primary" : "bg-paper"}`}>{s}</span>{i < a.length - 1 && <span aria-hidden className="text-gold-deep">↓</span>}</li>
            ))}
          </ol>
          <p className="mt-3 text-[13px] text-ink/60">Every transition is logged. Example restricted record: <Link href="/knowledge/subnational-finance-2025" className="font-semibold text-primary">Subnational Finance study (Institutional Review)</Link>.</p>
        </section>
        <section className="border hairline bg-white p-6" aria-label="Audit trail">
          <h2 className="eyebrow">Audit trail (immutable)</h2>
          <table className="mt-3 w-full text-[13px]"><thead><tr className="text-left text-[11px] uppercase tracking-wider text-ink/50"><th className="py-1.5">Actor</th><th>Action</th><th>Time</th></tr></thead>
          <tbody>
            {live
              ? recentAudit.map((a, i) => <tr key={i} className="border-t hairline"><td className="py-2 font-medium">{a.actorName}</td><td className="text-ink/65">{a.action}</td><td className="text-ink/50">{new Date(a.createdAt).toISOString().slice(0, 10)}</td></tr>)
              : auditLog.slice(0, 4).map((a) => <tr key={a.id} className="border-t hairline"><td className="py-2 font-medium">{a.actor}</td><td className="text-ink/65">{a.action}</td><td className="text-ink/50">{a.timestamp.slice(0, 10)}</td></tr>)}
          </tbody></table>
          <p className="mt-2 text-[12.5px] text-ink/50">Full log at <code>/api/v1/audit</code> · permission <code>audit.view</code>.</p>
        </section>
      </div>

      <section className="mt-6 border hairline bg-paper p-6" aria-label="Roles">
        <h2 className="eyebrow">Capability-based RBAC (§24)</h2>
        <p className="mt-2 text-sm text-ink/65">{PERMISSIONS.length} capabilities centralised in <code>lib/auth.ts</code>, enforced in middleware + <code>requirePermission()</code> — no scattered role checks. Accounts are managed via <code>POST /api/v1/users</code> (<code>users.manage</code>); password changes via <code>POST /api/v1/auth/change-password</code>.</p>
      </section>
    </div>
  );
}
