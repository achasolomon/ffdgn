import Link from "next/link";
import { Breadcrumbs } from "@/components/chrome";
import { UploadForm, LinkForm } from "@/components/admin-media";
import { db, dbReady } from "@/lib/db";
import { requirePermission } from "@/lib/server-auth";

export default async function AdminMediaPage() {
  try {
    await requirePermission("media.manage");
  } catch {
    return (
      <div className="mx-auto max-w-shell px-5 py-12">
        <p className="eyebrow">Secretariat console</p>
        <h1 className="font-display mt-2 text-3xl text-forest-950">Permission denied</h1>
        <p className="mt-2 text-sm text-ink/60">Media management requires the <code>media.manage</code> capability. Contact a Secretariat Administrator.</p>
        <Link href="/admin" className="mt-4 inline-block text-sm font-semibold text-primary">← Back to console</Link>
      </div>
    );
  }

  const live = await dbReady();
  const assets = live
    ? await db.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { event: { select: { title: true } } } })
    : [];
  const events = live
    ? (await db.forumEvent.findMany({ orderBy: { startDate: "desc" }, select: { slug: true, title: true } }))
    : [];

  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "Secretariat Console", href: "/admin" }, { label: "Media Library" }]} />
      <p className="eyebrow mt-6">Media management · <code>media.manage</code></p>
      <h1 className="font-display mt-2 text-4xl text-forest-950">Media library</h1>
      <p className="mt-2 text-sm text-ink/60">
        Uploads are type/size-validated and catalogued with credit + alt text. Videos play through
        privacy-hardened embeds. Production swap: S3/CDN storage (see README).
      </p>

      {!live && (
        <p className="mt-4 border border-gold/60 bg-paper px-4 py-3 text-sm" role="note">
          Database unavailable — connect MySQL to manage media.
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <UploadForm events={events} />
        <LinkForm events={events} />
      </div>

      <section className="mt-8" aria-label="Recent assets">
        <h2 className="font-display text-2xl text-forest-950">Recent assets ({assets.length})</h2>
        <div className="mt-4 overflow-x-auto border hairline bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b hairline bg-paper text-[11px] uppercase tracking-[0.16em] text-ink/55">
                <th className="px-5 py-3">Title</th><th className="px-5 py-3">Kind</th>
                <th className="px-5 py-3">Collection</th><th className="px-5 py-3">Event</th><th className="px-5 py-3">URL</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="border-b hairline last:border-0 hover:bg-paper">
                  <td className="px-5 py-3 font-semibold text-forest-950">{a.title}</td>
                  <td className="px-5 py-3">{a.kind}{a.provider ? ` · ${a.provider}` : ""}</td>
                  <td className="px-5 py-3">{a.category}</td>
                  <td className="px-5 py-3 text-ink/60">{a.event?.title ?? "—"}</td>
                  <td className="max-w-[220px] truncate px-5 py-3 font-mono text-[12px] text-ink/55">{a.url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
