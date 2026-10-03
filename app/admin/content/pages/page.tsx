import Link from "next/link";
import { AdminPagesManager } from "@/components/admin-pages-manager";
import { listInstitutionalPages } from "@/lib/repo";
import { getAuth } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";

export default async function AdminPagesPage() {
  const auth = await getAuth();
  if (!auth || !hasPermission(auth.user.role, "settings.manage")) return <div className="mx-auto max-w-5xl px-6 py-10"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Site content</p><h1 className="mt-2 text-2xl font-semibold text-[#1c3526]">Access unavailable</h1><p className="mt-2 text-sm text-[#69776d]">Institutional page editing requires the settings management capability.</p><Link href="/admin" className="mt-5 inline-flex text-sm font-semibold text-[#23613f]">Back to overview</Link></div>;
  const pages = await listInstitutionalPages();
  return <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8 sm:py-10"><div className="mb-6"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Site content / Pages</p><h1 className="mt-1.5 text-[26px] font-semibold text-[#1c3526]">Institutional pages</h1><p className="mt-1 text-[13px] text-[#738077]">Edit public institutional, governance, privacy, and accessibility copy.</p></div><AdminPagesManager key={pages.map((page) => `${page.slug}:${page.sections.map((section) => section.id ?? "fallback").join(",")}`).join("|")} pages={pages} /></div>;
}