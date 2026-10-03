import Link from "next/link";
import { ShieldCheck, Lock } from "lucide-react";
import { PERMISSIONS, hasPermission } from "@/lib/auth";
import { db, dbReady } from "@/lib/db";
import { getAuth } from "@/lib/server-auth";
import { EmptyState } from "@/components/ui";
import { asRoute } from "@/lib/routes";

/**
 * Admin modules. `href: null` means the module has no interface yet — it is
 * rendered as a disabled "Coming soon" card rather than a link that 404s.
 * Inventing navigation targets that do not exist is worse than admitting the
 * module is unfinished: staff waste time chasing dead ends and lose trust in
 * the console.
 */
/**
 * Console destinations that exist as pages. Keeping this a closed union rather
 * than a bare string means a typo here is a compile error instead of a link that
 * 404s in front of staff.
 */
type ConsoleRoute = "/admin/media" | "/admin/content" | "/admin/content/structure" | "/admin/content/navigation" | "/admin/content/pages" | "/admin/content/peer-review" | "/admin/knowledge" | "/admin/membership" | "/admin/events" | "/admin/news" | "/admin/committees" | "/admin/partnerships" | "/admin/communications";
type Module = { title: string; items: string[]; href: ConsoleRoute | null; live: string | null };
const MODULES: Module[] = [
  { title: "Media Library", items: ["Photos", "Videos", "Uploads", "Embeds"], href: "/admin/media", live: "Upload, edit, delete and audit media assets." },
  { title: "Content", items: ["Site settings", "Hero copy", "Identity strip", "Metrics"], href: "/admin/content", live: "Edit hero copy, the identity strip and the metric figures that appear on the homepage." },
  { title: "Homepage structure", items: ["Focus areas", "Institutional timeline", "Leadership seats"], href: "/admin/content/structure", live: "Edit and order published homepage records." },
  { title: "Navigation & footer", items: ["Menu groups", "Child links", "Footer columns"], href: "/admin/content/navigation", live: "Manage site navigation and footer links." },
  { title: "Institutional pages", items: ["About", "Governance", "Privacy", "Accessibility"], href: "/admin/content/pages", live: "Edit public institutional copy without code changes." },
  { title: "Renewed Hope group", items: ["Concept note", "Objectives", "Roster", "Zonal seats"], href: "/admin/content/peer-review", live: "Edit the RHPRG concept note, objectives and member composition." },
  { title: "Knowledge", items: ["Documents", "Categories", "Approvals"], href: "/admin/knowledge", live: "Run a document through the full approval chain, with visibility per record." },
  { title: "Membership", items: ["Members", "Accounts", "Roles", "Verification"], href: "/admin/membership", live: "Roster, account roles, activation and member status." },
  { title: "Events", items: ["Events", "Conferences", "Programmes", "Speakers"], href: "/admin/events", live: "Manage event records, schedules, speakers, linked documents, and publication." },
  { title: "News & media", items: ["News", "Press releases", "Statements", "Speeches"], href: "/admin/news", live: "Create, publish, and archive official communications." },
  { title: "Committees", items: ["Committees", "Mandates", "Chairs", "Member assignments"], href: "/admin/committees", live: "Maintain public committee records and membership assignments." },
  { title: "Partnerships", items: ["Partners", "Cooperation areas", "Related events"], href: "/admin/partnerships", live: "Manage institutional relationships and linked event records." },
  { title: "Communications", items: ["Enquiries", "Newsletter requests", "Handling status"], href: "/admin/communications", live: "Review incoming contact messages and newsletter requests." },
];

export default async function AdminConsole() {
  const auth = await getAuth();
  const live = await dbReady();

  // The audit panel is only rendered for roles that actually hold audit.view.
  // Everyone else signed into the console should not be shown the operational
  // trail of who changed what.
  const canAudit = hasPermission(auth?.user.role as never, "audit.view");

  // Without a database there is nothing truthful to report. The previous
  // implementation multiplied real member counts by 31 and hardcoded 186
  // documents / 12 approvals, which presented invented figures as institutional
  // records. An explicit warning is the honest response.
  const [memberCount, committeeCount, upcomingCount, publishedCount, pendingCount, recentAudit] = live
    ? await Promise.all([
        db.member.count(),
        db.committee.count(),
        db.forumEvent.count({ where: { status: { not: "Past" } } }),
        db.knowledgeDoc.count({ where: { status: "Published" } }),
        db.knowledgeDoc.count({ where: { status: { in: ["Draft", "Editorial_Review", "Institutional_Review", "Approved"] } } }),
        canAudit
          ? db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 4, select: { actorName: true, action: true, createdAt: true } })
          : Promise.resolve([]),
      ])
    : [null, null, null, null, null, []];

  const stats: [string, string][] = live
    ? [
        ["Members", String(memberCount)],
        ["Active Committees", String(committeeCount)],
        ["Upcoming Events", String(upcomingCount)],
        ["Pending Approvals", String(pendingCount)],
        ["Published Documents", String(publishedCount)],
      ]
    : [];

  const liveModules = MODULES.filter((m) => m.href).length;

  return (
    <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8 sm:py-10">
      <div className="console-welcome">
      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Secretariat / Overview</p>
      <h1 className="mt-1.5 text-[26px] font-semibold tracking-normal text-[#1c3526]">Operations overview</h1>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[#6e7b71]">
        <ShieldCheck size={15} className="text-primary" />
        Signed in as <strong>{auth?.user.name}</strong> ({auth?.user.email} · <code>{auth?.user.role}</code>)
      </p>
      </div>

      {auth && hasPermission(auth.user.role, "settings.manage") && <div className="mt-6 border border-[#dce2dc] bg-white p-6"><h2 className="text-lg font-semibold text-[#1c3526]">What would you like to update?</h2><p className="mt-2 text-sm text-[#69776d]">Edit an existing page, create a new page, choose images or update your menus.</p><div className="mt-4 flex flex-wrap gap-4"><Link href={asRoute("/admin/website")} className="bg-primary px-5 py-3 text-sm font-semibold text-white">Manage website pages</Link><Link href="/admin/media" className="px-5 py-3 text-sm font-semibold text-primary">Organise media</Link><Link href="/admin/content/navigation" className="px-5 py-3 text-sm font-semibold text-primary">Update menus &amp; footer</Link></div></div>}
      {!live && (
        <div className="mt-6 border border-gold-deep/40 bg-paper px-5 py-4" role="alert">
          <p className="font-semibold text-forest-950">Database not connected</p>
          <p className="mt-1 text-sm text-ink/65">
            Figures below are withheld rather than estimated. Start MySQL with{" "}
            <code>docker compose up -d db</code> and set <code>DATABASE_URL</code> to see live counts.
          </p>
        </div>
      )}

      {live ? (
        <div className="mt-8 grid gap-px border hairline bg-ink/10 sm:grid-cols-2 lg:grid-cols-5" role="status">
          {stats.map(([k, v]) => (
            <div key={k} className="bg-white px-5 py-5">
              <p className="font-display text-3xl text-forest-950">{v}</p>
              <p className="text-[12px] font-medium uppercase tracking-wider text-ink/55">{k}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            eyebrow="No data source"
            title="Console statistics unavailable"
            description="Counts are read directly from MySQL. With no database connected there is nothing to report, and inventing numbers would misrepresent the Forum's records."
          />
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-2xl text-forest-950">Modules</h2>
        <p className="text-[13px] text-ink/50">
          {liveModules} of {MODULES.length} modules have a working interface
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <section
            key={m.title}
            className={`border hairline p-6 ${m.href ? "bg-white" : "bg-paper"}`}
            aria-label={m.title}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className={`font-display text-xl ${m.href ? "text-forest-950" : "text-ink/55"}`}>{m.title}</h3>
              {!m.href && (
                <span className="shrink-0 border border-ink/20 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-ink/50">
                  Coming soon
                </span>
              )}
            </div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {m.items.map((x) => (
                <li key={x} className="flex items-center justify-between border-b hairline pb-1.5">
                  <span className={m.href ? "text-ink/70" : "text-ink/45"}>{x}</span>
                  {m.href ? (
                    <span className="font-semibold text-primary">Manage →</span>
                  ) : (
                    <Lock size={13} className="text-ink/30" aria-label="Not yet available" />
                  )}
                </li>
              ))}
            </ul>
            {m.href ? (
              <>
                <Link href={asRoute(m.href)} className="mt-3 inline-block text-[13px] font-semibold text-primary link-underline">
                  Open {m.title} →
                </Link>
                {m.live && <p className="mt-1 text-[12.5px] text-ink/50">{m.live}</p>}
              </>
            ) : (
              <p className="mt-3 text-[12.5px] text-ink/45">
                No interface yet. Underlying capabilities are authorized per-operation in the API.
              </p>
            )}
          </section>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="border hairline bg-white p-6" aria-label="Document approval workflow">
          <h2 className="eyebrow">Approval workflow</h2>
          <ol className="mt-3 flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium">
            {["Draft", "Editorial Review", "Institutional Review", "Approval", "Published", "Archived"].map((s, i, a) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className={`border px-2.5 py-1 ${s === "Published" ? "bg-primary text-white border-primary" : "bg-paper"}`}>{s}</span>
                {i < a.length - 1 && <span aria-hidden className="text-gold-deep">↓</span>}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[13px] text-ink/60">
            Every transition is audit-logged with the previous and new value. Advancing a document
            to Published also sets its publication date, makes it publicly visible, and clears the
            public site cache.
          </p>
        </section>

        <section className="border hairline bg-white p-6" aria-label="Audit trail">
          <h2 className="eyebrow">Audit trail</h2>
          {!canAudit ? (
            <>
              <p className="mt-3 text-[13px] text-ink/60" role="status">
                Not shown. Viewing the audit trail requires the <code>audit.view</code> capability.
              </p>
              <p className="mt-3 text-[12.5px] text-ink/50">
                Ask a super_admin if your role needs it; capabilities are granted per role in{" "}
                <code>lib/auth.ts</code> and cannot be self-assigned.
              </p>
            </>
          ) : live && recentAudit.length > 0 ? (
            <table className="mt-3 w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink/50">
                  <th className="py-1.5">Actor</th><th>Action</th><th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentAudit.map((a, i) => (
                  <tr key={i} className="border-t hairline">
                    <td className="py-2 font-medium">{a.actorName}</td>
                    <td className="text-ink/65">{a.action}</td>
                    <td className="text-ink/50">{new Date(a.createdAt).toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-[13px] text-ink/55" role="status">
              {live ? "No audit entries recorded yet." : "Audit trail unavailable without a database."}
            </p>
          )}
          {canAudit && (
            <p className="mt-3 text-[12.5px] text-ink/50">
              Full log at <code>/api/v1/audit</code>, which requires <code>audit.view</code> and
              fails closed if the audit store is unreachable.
            </p>
          )}
        </section>
      </div>

      <section className="mt-6 border hairline bg-paper p-6" aria-label="Roles">
        <h2 className="eyebrow">Capability-based access control</h2>
        <p className="mt-2 text-sm text-ink/65">
          {PERMISSIONS.length} capabilities are centralised in <code>lib/auth.ts</code> and enforced
          server-side by <code>requirePermission()</code>. Accounts are created via{" "}
          <code>POST /api/v1/users</code>; passwords are changed via{" "}
          <code>POST /api/v1/auth/change-password</code>, which also revokes every other active
          session for that account.
        </p>
      </section>
    </div>
  );
}
