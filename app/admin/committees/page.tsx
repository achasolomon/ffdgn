import Link from "next/link";
import { AdminCommitteeManager } from "@/components/admin-relationship-managers";
import { db, dbReady } from "@/lib/db";
import { getAuth } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";

export default async function AdminCommitteesPage() {
  const auth = await getAuth();
  if (!auth || !hasPermission(auth.user.role, "committees.manage")) {
    return <div className="mx-auto max-w-5xl px-6 py-10"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Governance</p><h1 className="mt-2 text-2xl font-semibold text-[#1c3526]">Access unavailable</h1><p className="mt-2 text-sm text-[#69776d]">Committee management requires the committee management capability.</p><Link href="/admin" className="mt-5 inline-flex text-sm font-semibold text-[#23613f]">Back to overview</Link></div>;
  }
  const live = await dbReady();
  const [rows, members] = live ? await Promise.all([
    db.committee.findMany({ include: { seats: { include: { member: { select: { slug: true } } } } }, orderBy: { name: "asc" } }),
    db.member.findMany({ orderBy: { fullName: "asc" }, select: { slug: true, fullName: true } }),
  ]) : [[], []];
  const committees = rows.map((row) => ({ slug: row.slug, name: row.name, mandate: row.mandate, chair: row.chairSlug, meetings: row.meetings, status: row.status as "Active" | "Standing" | "Ad-hoc", published: row.published, members: row.seats.map((seat) => seat.member.slug), imageUrl: row.imageUrl ?? "", imageAlt: row.imageAlt ?? "" }));
  return <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8 sm:py-10"><div className="mb-6"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Governance / Committees</p><h1 className="mt-1.5 text-[26px] font-semibold text-[#1c3526]">Committee records</h1><p className="mt-1 text-[13px] text-[#738077]">Maintain mandates, chairs, membership, and public visibility.</p></div>{!live && <p role="alert" className="mb-5 border border-[#e4d3a8] bg-[#fffaf0] px-4 py-3 text-[13px] text-[#755b23]">MySQL is unavailable. Connect the database to edit committee records.</p>}<AdminCommitteeManager committees={committees} memberOptions={members} /></div>;
}