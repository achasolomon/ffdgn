import { listPublishedWebsitePages } from "@/lib/website-repo";
import { PAGE_CATALOG } from "@/lib/website-content";
import Link from "next/link";
import { AdminNavigationManager } from "@/components/admin-navigation-manager";
import { dbReady } from "@/lib/db";
import { getSiteFooter, getSiteNavigation } from "@/lib/repo";
import { getAuth } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";

export default async function AdminNavigationPage() {
  const auth = await getAuth();
  if (!auth || !hasPermission(auth.user.role, "settings.manage")) return <div className="mx-auto max-w-5xl px-6 py-10"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Site content</p><h1 className="mt-2 text-2xl font-semibold text-[#1c3526]">Access unavailable</h1><p className="mt-2 text-sm text-[#69776d]">Navigation requires the settings management capability.</p><Link href="/admin" className="mt-5 inline-flex text-sm font-semibold text-[#23613f]">Back to overview</Link></div>;
  const [live, navigation, footer] = await Promise.all([dbReady(), getSiteNavigation(), getSiteFooter()]);
  const pages=await listPublishedWebsitePages();
  const knownPages=[...new Map([...PAGE_CATALOG.map(([path,title])=>({path,title})),...pages.map(({page})=>({path:page.path,title:page.title}))].map(page=>[page.path,page])).values()];
  return <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8 sm:py-10"><div className="mb-6"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Site content / Navigation</p><h1 className="mt-1.5 text-[26px] font-semibold text-[#1c3526]">Navigation &amp; footer</h1><p className="mt-1 text-[13px] text-[#738077]">Edit link groups and order. Destinations are restricted to same-site paths.</p></div>{!live && <p role="alert" className="mb-5 border border-[#e4d3a8] bg-[#fffaf0] px-4 py-3 text-[13px] text-[#755b23]">MySQL is unavailable. Connect the database to save navigation.</p>}<AdminNavigationManager knownPages={knownPages} initialNavigation={navigation} initialFooter={footer} /></div>;
}