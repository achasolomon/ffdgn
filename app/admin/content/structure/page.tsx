import Link from "next/link";
import { AdminHomepageManager } from "@/components/admin-homepage-manager";
import { db, dbReady } from "@/lib/db";
import { getAuth } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";

export default async function AdminHomepageStructurePage() {
  const auth = await getAuth();
  if (!auth || !hasPermission(auth.user.role, "settings.manage")) {
    return <div className="mx-auto max-w-5xl px-6 py-10"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Site content</p><h1 className="mt-2 text-2xl font-semibold text-[#1c3526]">Access unavailable</h1><p className="mt-2 text-sm text-[#69776d]">Homepage structure requires the settings management capability.</p><Link href="/admin" className="mt-5 inline-flex text-sm font-semibold text-[#23613f]">Back to overview</Link></div>;
  }
  const live = await dbReady();
  const [focusAreas, timeline, leadership, members] = live ? await Promise.all([
    db.focusArea.findMany({ orderBy: { position: "asc" } }),
    db.timelineEntry.findMany({ include: { links: { orderBy: { id: "asc" } } }, orderBy: { position: "asc" } }),
    db.leadershipSeat.findMany({ orderBy: { position: "asc" } }),
    db.member.findMany({ orderBy: { fullName: "asc" }, select: { slug: true, fullName: true, photoUrl: true } }),
  ]) : [[], [], [], []];
  return (
    <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-6"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Site content / Homepage</p><h1 className="mt-1.5 text-[26px] font-semibold text-[#1c3526]">Homepage structure</h1><p className="mt-1 text-[13px] text-[#738077]">Manage focus areas, institutional milestones, and leadership order.</p></div>
      {!live && <p role="alert" className="mb-5 border border-[#e4d3a8] bg-[#fffaf0] px-4 py-3 text-[13px] text-[#755b23]">MySQL is unavailable. Connect the database to edit homepage structure.</p>}
      <AdminHomepageManager
        focusAreas={focusAreas.map((row) => ({ ...row, imageUrl: row.imageUrl ?? "" }))}
        timeline={timeline.map((row) => ({ ...row, imageUrl: row.imageUrl ?? "", links: row.links.map(({ label, href }) => ({ label, href })) }))}
        leadership={leadership.map((row) => ({ ...row }))}
        members={members.map((member) => ({ slug: member.slug, name: member.fullName, photo: member.photoUrl ?? undefined }))}
      />
    </div>
  );
}