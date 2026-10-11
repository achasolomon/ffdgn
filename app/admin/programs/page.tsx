/* eslint-disable @next/next/no-html-link-for-pages -- Programme switches use full navigation so unsaved form warnings run. */
import Link from "next/link";
import { getAuth } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";
import { listInstitutionalPages, listPeerReviewMembers } from "@/lib/repo";
import { getWebsitePage } from "@/lib/website-repo";
import { AdminPagesManager } from "@/components/admin-pages-manager";
import { AdminPeerReviewMembers } from "@/components/admin-peer-review-members";
export default async function ProgramWorkspace({ searchParams }: { searchParams: Promise<{ program?: string }> }) {
  const auth = await getAuth();
  if (!auth || !hasPermission(auth.user.role, "settings.manage")) return <div className="p-8"><h1 className="text-2xl font-semibold">Access unavailable</h1><p className="mt-2">Your role does not allow editing this content.</p></div>;
  const slug = (await searchParams).program === "polish-nigeria" ? "polish-nigeria" : "renewed-hope";
  const [pages, roster, authored] = await Promise.all([listInstitutionalPages({ includeUnpublished: true }), listPeerReviewMembers({ includeUnpublished: true }), getWebsitePage(`/${slug}`)]);
  const page = pages.find(page => page.slug === slug);
  const members = roster.flatMap(member => member.id ? [{ id: member.id, position: member.position, name: member.name, zone: member.zone, role: member.role, phone: member.phone ?? null, email: member.email ?? null, published: member.published ?? true }] : []);
  return <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8"><header className="mb-6"><p className="text-xs text-[#56755f]">Website / Programmes</p><h1 className="mt-2 text-3xl font-semibold">Programme content & people</h1><p className="mt-2 text-sm text-[#69776d]">Edit the introduction, chapters, images and membership from one workspace.</p></header><nav aria-label="Choose programme" className="mb-6 flex flex-wrap gap-3"><a href="/admin/programs?program=polish-nigeria" className="border bg-white px-4 py-3" aria-current={slug === "polish-nigeria" ? "page" : undefined}>Polish Nigeria</a><a href="/admin/programs?program=renewed-hope" className="border bg-white px-4 py-3" aria-current={slug === "renewed-hope" ? "page" : undefined}>Renewed Hope</a></nav><div className="mb-5 flex flex-wrap gap-4 text-sm"><a href="#programme-content">Content & sections</a>{slug === "renewed-hope" && <a href="#programme-members">Members of the group</a>}<a href={`/${slug}`} target="_blank" rel="noreferrer">View programme ↗</a><Link href="/admin/website/designs">Design labels & buttons</Link></div>{authored && authored.layout !== "extend" && <p role="status" className="mb-5 border border-amber-200 bg-amber-50 p-4 text-sm">A replacement page design is published for this programme. Edit its content in <Link href="/admin/website" className="underline">Website pages</Link>, or unpublish that replacement to use these programme records.</p>}<section id="programme-content">{page ? <AdminPagesManager key={slug} pages={[page]} compact /> : <p role="alert">This programme record is missing. Run the CMS population command before editing.</p>}</section>{slug === "renewed-hope" && <section id="programme-members" className="mt-10"><h2 className="mb-4 text-2xl font-semibold">Members of the Group</h2><AdminPeerReviewMembers members={members} /></section>}</div>;
}
export const dynamic = "force-dynamic";
