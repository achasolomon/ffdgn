"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Handshake, Images, LayoutDashboard, Landmark, Link2, Mail, Newspaper, Settings2, UsersRound, CalendarDays } from "lucide-react";
import { asRoute } from "@/lib/routes";

const ICONS = {
  "/admin": LayoutDashboard,
  "/admin/website": FileText,
  "/admin/website/designs": FileText,
  "/admin/website/status": FileText,
  "/admin/content": Settings2,
  "/admin/content/pages": FileText,
  "/admin/content/structure": LayoutDashboard,
  "/admin/content/navigation": Link2,
  "/admin/programs": UsersRound,
  "/admin/events": CalendarDays,
  "/admin/events/operations": UsersRound,
  "/admin/news": Newspaper,
  "/admin/committees": Landmark,
  "/admin/partnerships": Handshake,
  "/admin/communications": Mail,
  "/admin/knowledge": FileText,
  "/admin/membership": UsersRound,
  "/admin/media": Images,
};

const SECTIONS = [
  { label: "Workspace", hrefs: ["/admin"] },
  { label: "Conference", hrefs: ["/admin/events/operations"] },
  { label: "Site content", hrefs: ["/admin/website", "/admin/website/designs", "/admin/website/status", "/admin/content", "/admin/content/pages", "/admin/content/structure", "/admin/content/navigation", "/admin/programs"] },
  { label: "Publishing", hrefs: ["/admin/events", "/admin/events/speakers", "/admin/news", "/admin/knowledge", "/admin/media"] },
  { label: "Governance", hrefs: ["/admin/committees", "/admin/partnerships", "/admin/membership"] },
  { label: "Communications", hrefs: ["/admin/communications"] },
];

export function AdminWorkspaceHeading() {
  const pathname = usePathname();
  return <>{["/admin/events/operations", "/admin/events/gate", "/admin/events/reports", "/admin/events/print"].includes(pathname) ? "Conference guest management" : "Content operations"}</>;
}

export function AdminNavigation({ items }: { items: { label: string; href: string }[] }) {
  const pathname = usePathname();

  function link(item: { label: string; href: string }) {
    const active = pathname === item.href || (item.href === "/admin/events/operations" && ["/admin/events/gate", "/admin/events/reports", "/admin/events/print"].includes(pathname));
    const Icon = ICONS[item.href as keyof typeof ICONS] ?? FileText;
    return <Link key={item.href} href={asRoute(item.href)} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-3 border-l-2 px-3 py-2.5 text-[13px] font-medium transition-colors ${active ? "border-[#177344] bg-[#edf5ef] text-[#145b35]" : "border-transparent text-[#58655c] hover:bg-[#f4f6f3] hover:text-[#173c2b]"}`}><Icon size={16} strokeWidth={1.8} />{item.label}</Link>;
  }

  return (
    <nav aria-label="Secretariat" className="hide-scrollbar min-w-0 px-3 pb-3 lg:flex-1 lg:overflow-y-auto lg:pb-4">
      <div className="thin-scroll flex gap-1 overflow-x-auto lg:hidden">{[...items.filter(item => item.href === "/admin/events/operations"), ...items.filter(item => item.href !== "/admin/events/operations")].map(link)}</div>
      <div className="hidden lg:block">
        {SECTIONS.map((section) => {
          const sectionItems = section.hrefs.flatMap((href) => {
            const item = items.find((candidate) => candidate.href === href);
            return item ? [item] : [];
          });
          if (!sectionItems.length) return null;
          return <section key={section.label} className="mb-4 last:mb-0">
            <h2 className="px-3 pb-1.5 pt-3 text-[9px] font-bold uppercase tracking-[0.14em] text-[#98a39a]">{section.label}</h2>
            <div className="grid gap-0.5">{sectionItems.map(link)}</div>
          </section>;
        })}
      </div>
    </nav>
  );
}
