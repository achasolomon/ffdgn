import Link from "next/link";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, EmptyState } from "@/components/ui";
import { listMembers } from "@/lib/repo";

export default async function MembersPage({ searchParams }: { searchParams: { q?: string; category?: string } }) {
  const members = (await listMembers()).filter((m) => m.visibility === "PUBLIC");
  const q = (searchParams.q ?? "").toLowerCase();
  const category = searchParams.category ?? "";
  const filtered = members.filter(
    (m) =>
      (!q || `${m.name} ${m.title}`.toLowerCase().includes(q)) &&
      (!category || m.category === category)
  );
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "Members" }]} />
      <SectionHeading eyebrow="Members" title="The membership directory" lede="An institutional database — search, filter, open a profile to see service history, committees, events and publications." />
      <form className="mt-8 grid gap-3 border hairline bg-white p-4 md:grid-cols-[1fr_200px_auto]" role="search" aria-label="Member directory">
        <label className="sr-only" htmlFor="mq">Search members</label>
        <input id="mq" name="q" defaultValue={searchParams.q ?? ""} placeholder="Search member…" className="border hairline px-4 py-2.5 text-sm" />
        <select name="category" defaultValue={category} className="border hairline px-3 py-2.5 text-sm bg-white" aria-label="Filter by category">
          <option value="">Everyone</option><option>Former</option><option>Serving</option><option>Secretariat</option>
        </select>
        <button className="bg-primary px-6 py-2.5 text-sm font-semibold text-white">Filter</button>
      </form>
      <p className="mt-4 text-[13px] text-ink/55" role="status">{filtered.length} of {members.length} profiles · {members.filter((m) => m.category === "Former").length} former · {members.filter((m) => m.category === "Serving").length} serving (associate)</p>
      {filtered.length === 0 ? (
        <div className="mt-6"><EmptyState title="No members match these filters" body="Try a different name or category. Sensitive records may be restricted to members." action={<Link href="/members" className="border border-primary/40 px-5 py-2.5 text-sm font-semibold text-primary">Clear filters</Link>} /></div>
      ) : (
        <div className="mt-6 overflow-x-auto border hairline bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr className="border-b hairline bg-paper text-[11px] uppercase tracking-[0.16em] text-ink/55">
              <th className="px-5 py-3 font-bold">Member</th><th className="px-5 py-3 font-bold">Service</th><th className="px-5 py-3 font-bold">Status</th><th className="px-5 py-3 font-bold"><span className="sr-only">Open</span></th>
            </tr></thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.slug} className="border-b hairline last:border-0 hover:bg-paper">
                  <td className="px-5 py-4"><Link href={`/members/${m.slug}`} className="font-semibold text-forest-950 hover:text-primary">{m.name}</Link><span className="block text-[12.5px] text-ink/55">{m.title}</span></td>
                  <td className="px-5 py-4 text-ink/65">{m.service.map((s) => `${s.startYear}–${s.endYear}`).join(", ") || "—"}</td>
                  <td className="px-5 py-4"><span className="border border-primary/30 px-2 py-0.5 text-[12px] font-semibold text-primary">{m.status}</span></td>
                  <td className="px-5 py-4 text-right"><Link href={`/members/${m.slug}`} className="text-[13px] font-semibold text-primary">Profile →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div id="join" className="mt-10 border border-gold/60 bg-white p-6">
        <h2 className="font-display text-xl text-forest-950">Membership information</h2>
        <p className="mt-2 text-sm text-ink/65">Membership comprises former Deputy Governors (full members) and serving Deputy Governors (associates). Verification is handled by the Secretariat. Contact <Link href="/contact" className="font-semibold text-primary">the Secretariat</Link> for applications.</p>
      </div>
    </div>
  );
}
