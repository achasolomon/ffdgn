import Link from "next/link";
import {
  MemberRowActions,
  MemberProfileEditor,
  NewMemberButton,
  AccountRowActions,
  CreateAccountForm,
} from "@/components/admin-membership-actions";
import { db, dbReady } from "@/lib/db";
import { getAuth } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";
import { ASSIGNABLE } from "@/app/api/v1/users/_roles";
import { asRoute } from "@/lib/routes";

/** Roster size. A membership directory is a working list; beyond this, paginate. */
const ROSTER_LIMIT = 100;

export default async function AdminMembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const auth = await getAuth();
  const role = auth?.user.role;
  const canSeeMembers = !!role && hasPermission(role, "members.view");
  const canCreateMembers = !!role && hasPermission(role, "members.create");
  const canManageMembers = !!role && hasPermission(role, "members.update");
  const canManageUsers = !!role && hasPermission(role, "users.manage");

  // Nothing here is viewable without at least one relevant capability. An
  // auditor holds members.view but not members.update, so they get the roster
  // read-only and no account section — not a page full of rejected controls.
  if (!canSeeMembers && !canManageUsers) {
    return (
      <div className="mx-auto max-w-shell px-5 py-12">
        <p className="eyebrow">Secretariat console</p>
        <h1 className="font-display mt-2 text-3xl text-forest-950">Permission denied</h1>
        <p className="mt-2 text-sm text-ink/60">
          Membership administration requires a member or account capability. Contact a Secretariat
          Administrator.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm font-semibold text-primary">
          ← Back to console
        </Link>
      </div>
    );
  }

  const live = await dbReady();
  const q = (await searchParams).q?.trim() ?? "";

  const [members, users, activeSuperAdmins] = live
    ? await Promise.all([
        canSeeMembers
          ? db.member.findMany({
              take: ROSTER_LIMIT,
              orderBy: { fullName: "asc" },
              where: q
                ? { OR: [{ fullName: { contains: q } }, { title: { contains: q } }] }
                : undefined,
              select: {
                slug: true, fullName: true, title: true, state: true, region: true,
                category: true, status: true, visibility: true, leadershipRole: true,
                photoUrl: true, bio: true,
                service: { select: { office: true, state: true, startYear: true, endYear: true } },
              },
            })
          : Promise.resolve([]),
        canManageUsers
          ? db.user.findMany({
              take: ROSTER_LIMIT,
              orderBy: [{ isActive: "desc" }, { name: "asc" }],
              select: {
                id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true,
              },
            })
          : Promise.resolve([]),
        // Used to disable controls the API would refuse, so the operator sees
        // why rather than discovering it as a 422.
        canManageUsers
          ? db.user.count({ where: { role: "super_admin", isActive: true } })
          : Promise.resolve(0),
      ])
    : [[], [], 0];

  const inactiveCount = users.filter((u) => !u.isActive).length;

  return (
    <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8 sm:py-10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Members / Directory</p>
      <h1 className="mt-1.5 text-[26px] font-semibold tracking-normal text-[#1c3526]">Membership roster</h1>
      <p className="mt-1 text-[13px] text-[#738077]">Member profiles, service history, directory visibility, and account access.</p>

      {!live && (
        <p className="mt-4 border border-gold/60 bg-paper px-4 py-3 text-sm" role="note">
          Database unavailable — the roster and account list need MySQL.
        </p>
      )}

      {canSeeMembers && (
        <section className="mt-8" aria-labelledby="roster-h">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 id="roster-h" className="font-display text-2xl text-forest-950">
                Members ({members.length})
                {!canManageMembers && <span className="ml-2 text-[13px] font-normal text-ink/55">read-only</span>}
              </h2>
              {canCreateMembers && <NewMemberButton />}
            </div>
            <form role="search" className="flex gap-2">
              <label htmlFor="roster-q" className="sr-only">Search members</label>
              <input
                id="roster-q"
                name="q"
                defaultValue={q}
                placeholder="Name or organisation"
                className="border hairline bg-white px-3 py-1.5 text-[13px]"
              />
              <button type="submit" className="bg-primary px-3 py-1.5 text-[12.5px] font-bold text-white">
                Filter
              </button>
              {q && (
                <Link href={asRoute("/admin/membership")} className="self-center text-[12.5px] font-semibold text-primary">
                  Clear
                </Link>
              )}
            </form>
          </div>

          {members.length === 0 ? (
            <p className="mt-4 border hairline bg-white px-5 py-10 text-center text-sm text-ink/60" role="status">
              {live ? (q ? `No members match “${q}”.` : "No member records.") : "Roster unavailable without a database."}
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto border hairline bg-white">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b hairline bg-paper text-[11px] uppercase tracking-[0.16em] text-ink/55">
                    <th className="px-5 py-3">Member</th>
                    <th className="px-5 py-3">Title</th>
                    <th className="px-5 py-3">State</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Directory</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.slug} className="border-b hairline align-top last:border-0 hover:bg-paper">
                      <td className="px-5 py-3">
                        <span className="font-semibold text-forest-950">{m.fullName}</span>
                        {m.visibility === "PUBLIC" && (
                          <Link
                            href={asRoute(`/members/${m.slug}`)}
                            className="block text-[11.5px] text-primary link-underline"
                          >
                            View public page →
                          </Link>
                        )}
                      </td>
                      <td className="px-5 py-3 text-ink/65">{m.title}</td>
                      <td className="px-5 py-3 text-[12.5px] text-ink/60">
                        {m.state}
                        <span className="block text-ink/45">{m.region}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="border bg-paper px-2 py-0.5 text-[11px] font-semibold text-ink/70">
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[12.5px] text-ink/60">{m.visibility}</td>
                      <td className="px-5 py-3">
                        {canManageMembers ? (
                          <div className="grid gap-2">
                          <MemberRowActions
                            member={{
                              slug: m.slug,
                              fullName: m.fullName,
                              title: m.title,
                              status: m.status,
                              visibility: m.visibility,
                            }}
                          />
                          <MemberProfileEditor
                            member={{
                              slug: m.slug,
                              fullName: m.fullName,
                              title: m.title,
                              status: m.status,
                              visibility: m.visibility,
                              state: m.state,
                              region: m.region,
                              category: m.category,
                              leadershipRole: m.leadershipRole ?? "",
                              photoUrl: m.photoUrl ?? "",
                              bio: m.bio ?? "",
                              service: m.service,
                            }}
                          />
                          </div>
                        ) : (
                          <span className="text-[12.5px] text-ink/45">
                            Requires <code>members.update</code>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {canManageUsers && (
        <section className="mt-12" aria-labelledby="accounts-h">
          <h2 id="accounts-h" className="font-display text-2xl text-forest-950">
            Accounts ({users.length})
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] text-ink/55">
            Deactivating an account ends every live session for that person immediately — the token
            check refuses inactive accounts, so there is no grace period and no cache to wait out.
            Reactivating also clears a lockout.
          </p>

          <div className="mt-4 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="overflow-x-auto border hairline bg-white">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b hairline bg-paper text-[11px] uppercase tracking-[0.16em] text-ink/55">
                    <th className="px-5 py-3">Account</th>
                    <th className="px-5 py-3">Last sign-in</th>
                    <th className="px-5 py-3">Role / status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-center text-sm text-ink/60">
                        {live ? "No accounts." : "Unavailable without a database."}
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="border-b hairline align-top last:border-0 hover:bg-paper">
                        <td className="px-5 py-3">
                          <span className="font-semibold text-forest-950">{u.name}</span>
                          <span className="block text-[12px] text-ink/55">{u.email}</span>
                          {!u.isActive && (
                            <span className="mt-1 inline-block border border-red-800/30 bg-red-50 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-red-900">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-[12.5px] text-ink/60">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toISOString().slice(0, 16).replace("T", " ") : "Never"}
                        </td>
                        <td className="px-5 py-3">
                          <AccountRowActions
                            account={{
                              id: u.id,
                              email: u.email,
                              name: u.name,
                              role: u.role,
                              isActive: u.isActive,
                              lastLoginAt: u.lastLoginAt,
                              assignable: ASSIGNABLE,
                              isSelf: u.id === auth!.user.id,
                              isLastSuperAdmin: activeSuperAdmins <= 1,
                            }}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <CreateAccountForm assignable={ASSIGNABLE} />
              {inactiveCount > 0 && (
                <p className="border hairline bg-paper px-4 py-3 text-[12.5px] text-ink/65">
                  {inactiveCount} inactive account{inactiveCount === 1 ? "" : "s"}. Their audit trail
                  is retained; deactivation revokes access but keeps the record of what they did.
                </p>
              )}
              <p className="border hairline bg-paper px-4 py-3 text-[12.5px] text-ink/65">
                Roles are defined in <code>lib/auth.ts</code> and enforced by{" "}
                <code>requirePermission()</code>. Creating a <code>super_admin</code> is restricted
                to existing super administrators, and the last one cannot be removed.
              </p>
            </div>
          </div>
        </section>
      )}

      {!canSeeMembers && canManageUsers && (
        <p className="mt-8 border hairline bg-paper px-5 py-4 text-[13px] text-ink/65">
          Your role can manage accounts but not read the member roster, so it is withheld here. The
          roster requires <code>members.view</code>.
        </p>
      )}
    </div>
  );
}
