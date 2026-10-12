import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowUpRight,
  CalendarDays,
  FileText,
  Handshake,
  Images,
  Link2,
  LayoutDashboard,
  Landmark,
  Mail,
  Newspaper,
  Settings2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { AdminNavigation, AdminWorkspaceHeading } from "@/components/admin-navigation";
import { hasPermission, type Permission } from "@/lib/auth";
import { getAuth } from "@/lib/server-auth";
import { ConferenceAccountLinks } from "@/components/conference-account-links";

const NAV_ITEMS: {
  label: string;
  href: string;
  icon: typeof FileText;
  permissions?: Permission[];
}[] = [
  { label: "Overview", href: "/admin", icon: FileText },
  { label: "Website pages", href: "/admin/website", icon: FileText, permissions: ["settings.manage"] },
  { label: "Current designs", href: "/admin/website/designs", icon: FileText, permissions: ["settings.manage"] },
  { label: "Content status", href: "/admin/website/status", icon: FileText, permissions: ["settings.manage"] },
  { label: "Site content", href: "/admin/content", icon: Settings2, permissions: ["settings.manage"] },
  { label: "Institutional pages", href: "/admin/content/pages", icon: FileText, permissions: ["settings.manage"] },
  { label: "Homepage structure", href: "/admin/content/structure", icon: LayoutDashboard, permissions: ["settings.manage"] },
  { label: "Navigation & footer", href: "/admin/content/navigation", icon: Link2, permissions: ["settings.manage"] },
  { label: "Programmes", href: "/admin/programs", icon: UsersRound, permissions: ["settings.manage"] },
  { label: "Events", href: "/admin/events", icon: CalendarDays, permissions: ["events.view", "events.create", "events.edit"] },
  { label: "Conference speakers", href: "/admin/events/speakers", icon: UsersRound, permissions: ["events.edit"] },
  { label: "News", href: "/admin/news", icon: Newspaper, permissions: ["news.publish"] },
  { label: "Committees", href: "/admin/committees", icon: Landmark, permissions: ["committees.manage"] },
  { label: "Partnerships", href: "/admin/partnerships", icon: Handshake, permissions: ["partnerships.manage"] },
  { label: "Secretariat inbox", href: "/admin/communications", icon: Mail, permissions: ["contact.manage"] },
  {
    label: "Knowledge",
    href: "/admin/knowledge",
    icon: FileText,
    permissions: ["documents.view", "documents.edit", "documents.publish", "documents.approve"],
  },
  {
    label: "Membership",
    href: "/admin/membership",
    icon: UsersRound,
    permissions: ["members.view", "members.update", "users.manage"],
  },
  { label: "Media library", href: "/admin/media", icon: Images, permissions: ["media.manage"] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if ((await headers()).get("x-site-path") === "/admin/events/print") return children;
  const auth = await getAuth();
  const items = auth?.user.role === "guest_desk" ? [] : NAV_ITEMS.filter(
    (item) => !item.permissions || item.permissions.some((permission) => auth && hasPermission(auth.user.role, permission)),
  );
  items.push({ label: "Conference guest desk", href: "/admin/events/operations", icon: UsersRound });

  return (
    <div className="min-h-[75vh] bg-[#f3f5f2] text-[#18251d]">
      <div className="mx-auto grid min-h-[75vh] max-w-[1680px] grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="console-sidebar flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-[#dce2dc] bg-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <div className="shrink-0 px-5 py-4 lg:px-5 lg:py-6">
            <Link href={auth?.user.role === "guest_desk" ? "/admin/events/operations" : "/admin"} className="flex items-center gap-3" aria-label="Secretariat console home">
              <span className="grid h-9 w-9 place-items-center bg-[#123e2a] text-[#e8c96d]"><ShieldCheck size={19} /></span>
              <span>
                <span className="block text-[13px] font-bold tracking-[0.02em] text-[#173c2b]">FFDGN</span>
                <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[#738077]">Secretariat</span>
              </span>
            </Link>
            <span className="hidden border border-[#dce2dc] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#657268] lg:mt-7 lg:inline-block">
              Operations
            </span>
          </div>

          <AdminNavigation items={items.map(({ label, href }) => ({ label, href }))} />
          {auth?.user.role === "guest_desk" && <div className="px-5 pb-4"><ConferenceAccountLinks /></div>}

          <div className="mt-auto hidden shrink-0 border-t border-[#e3e8e3] bg-white px-5 py-4 lg:block">
            <p className="truncate text-[12px] font-semibold text-[#29392f]">{auth?.user.name ?? "Signed out"}</p>
            <p className="truncate text-[11px] text-[#78837b]">{auth?.user.role === "guest_desk" ? "Guest desk staff" : auth?.user.role.replaceAll("_", " ") ?? "Access required"}</p>
            <Link href="/" className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#37634a] hover:text-[#123e2a]">
              Public website <ArrowUpRight size={13} />
            </Link>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="console-topbar flex min-h-12 items-center justify-between border-b border-[#dce2dc] bg-white px-5 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#77837a]"><AdminWorkspaceHeading /></p>
            <span className="flex items-center gap-2 text-[11px] text-[#6e7b71]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#29915a]" />
              {auth ? "Secure workspace" : "Authentication required"}
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
