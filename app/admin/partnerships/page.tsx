import Link from "next/link";
import { AdminPartnershipManager } from "@/components/admin-relationship-managers";
import { db, dbReady } from "@/lib/db";
import { getAuth } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";

export default async function AdminPartnershipsPage() {
  const auth = await getAuth();
  if (!auth || !hasPermission(auth.user.role, "partnerships.manage")) {
    return <div className="mx-auto max-w-5xl px-6 py-10"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Engagement</p><h1 className="mt-2 text-2xl font-semibold text-[#1c3526]">Access unavailable</h1><p className="mt-2 text-sm text-[#69776d]">Partnership management requires the partnerships capability.</p><Link href="/admin" className="mt-5 inline-flex text-sm font-semibold text-[#23613f]">Back to overview</Link></div>;
  }
  const live = await dbReady();
  const [rows, events] = live ? await Promise.all([
    db.partnership.findMany({ include: { cooperation: { orderBy: { position: "asc" } }, events: { include: { event: { select: { slug: true } } } }, }, orderBy: { name: "asc" } }),
    db.forumEvent.findMany({ orderBy: { startDate: "desc" }, select: { slug: true } }),
  ]) : [[], []];
  const partnerships = rows.map((row) => ({ slug: row.slug, name: row.name, type: row.type, since: row.since, purpose: row.purpose, logoUrl: row.logoUrl ?? "", published: row.published, cooperation: row.cooperation.map((area) => area.area), events: row.events.map((event) => event.event.slug) }));
  return <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8 sm:py-10"><div className="mb-6"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Engagement / Partnerships</p><h1 className="mt-1.5 text-[26px] font-semibold text-[#1c3526]">Partnership records</h1><p className="mt-1 text-[13px] text-[#738077]">Maintain institutional relationships and their linked programme activity.</p></div>{!live && <p role="alert" className="mb-5 border border-[#e4d3a8] bg-[#fffaf0] px-4 py-3 text-[13px] text-[#755b23]">MySQL is unavailable. Connect the database to edit partnership records.</p>}<AdminPartnershipManager partnerships={partnerships} eventSlugs={events.map((event) => event.slug)} /></div>;
}