import Link from "next/link";
import {
  AdminPeerReviewMembers,
  type PeerReviewMemberRecord,
} from "@/components/admin-peer-review-members";
import { hasPermission } from "@/lib/auth";
import type { PeerReviewMemberContent } from "@/lib/institutional-pages";
import { listPeerReviewMembers } from "@/lib/repo";
import { getAuth } from "@/lib/server-auth";

export default async function AdminPeerReviewPage() {
  const auth = await getAuth();
  if (!auth || !hasPermission(auth.user.role, "settings.manage")) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">
          Site content
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#1c3526]">Access unavailable</h1>
        <p className="mt-2 text-sm text-[#69776d]">
          Peer review group editing requires the settings management capability.
        </p>
        <Link href="/admin" className="mt-5 inline-flex text-sm font-semibold text-[#23613f]">
          Back to overview
        </Link>
      </div>
    );
  }

  const members: PeerReviewMemberRecord[] = (await listPeerReviewMembers({ includeUnpublished: true }))
    // Rows only carry an id once they come from the database; the seed
    // fallback has none, and a member without an id cannot be edited or
    // deleted, so it is omitted rather than rendered as a broken row.
    .filter((member): member is PeerReviewMemberContent & { id: string } => typeof member.id === "string")
    .map((member) => ({
      id: member.id,
      position: member.position,
      name: member.name,
      zone: member.zone,
      role: member.role,
      phone: member.phone ?? null,
      email: member.email ?? null,
      published: member.published ?? true,
    }));

  return (
    <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">
          Site content / Renewed Hope
        </p>
        <h1 className="mt-1.5 text-[26px] font-semibold text-[#1c3526]">
          Renewed Hope Agenda Peer Review Group
        </h1>
        <p className="mt-1 max-w-3xl text-[13px] text-[#738077]">
          Manage the composition of the RHPRG. The concept note and objectives are edited on the{" "}
          <Link href="/admin/content/pages" className="font-semibold text-[#23613f]">
            institutional pages
          </Link>{" "}
          screen under <em>Renewed Hope Agenda Peer Review Group</em>.
        </p>
      </div>
      <AdminPeerReviewMembers members={members} />
    </div>
  );
}
