import Link from "next/link";
import { UploadForm, LinkForm } from "@/components/admin-media";
import { MediaRowActions } from "@/components/admin-media-actions";
import { AssetImage } from "@/components/media";
import { db, dbReady } from "@/lib/db";
import { requirePermission } from "@/lib/server-auth";
import { publicFileExists } from "@/lib/media-path";

/** Rows per page. The library is small; 50 is a screen, not a data dump. */
const PER_PAGE = 50;

/**
 * Can this asset actually render?
 *
 * A MediaAsset row is only a claim that a file exists. The overwhelmingly common
 * failure is a row whose path no longer matches anything on disk — a renamed
 * file, a changed extension, or a seeded portrait placeholder that was never
 * committed. Those render as blank images on the public gallery with no error
 * anywhere, which is exactly the confusion this page now surfaces.
 *
 * Provider-hosted assets (YouTube/Vimeo thumbnails) have no local file and are
 * reported as healthy: they are not verifiable from this filesystem and should
 * not be flagged as broken on a guess.
 */
function isRenderable(url: string, provider: string | null): boolean {
  if (!url.startsWith("/")) return true;
  return publicFileExists(url) || provider === "YOUTUBE" || provider === "VIMEO";
}

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; health?: string }>;
}) {
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
  const params = await searchParams;
  const raw = Number(params.page ?? 1);
  const page = Number.isFinite(raw) ? Math.max(1, Math.trunc(raw)) : 1;
  const missingOnly = params.health === "missing";

  // One extra lightweight query so the header can say "17 of 94 assets are
  // broken" rather than leaving the editor to discover it row by row. Only url
  // and provider are read, and the per-page rows below are unaffected.
  const health = live
    ? await db.mediaAsset.findMany({ select: { id: true, url: true, provider: true } })
    : [];
  const brokenIds = new Set(
    health.filter((a) => !isRenderable(a.url, a.provider)).map((a) => a.id),
  );

  const [assets, total, events] = live
    ? await Promise.all([
        db.mediaAsset.findMany({
          where: missingOnly ? { id: { in: [...brokenIds] } } : undefined,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * PER_PAGE,
          take: PER_PAGE,
          include: { event: { select: { title: true, slug: true } } },
        }),
        missingOnly ? brokenIds.size : db.mediaAsset.count(),
        db.forumEvent.findMany({ orderBy: { startDate: "desc" }, select: { slug: true, title: true } }),
      ])
    : [[], 0, []];

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8 sm:py-10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Assets / Media library</p>
      <h1 className="mt-1.5 text-[26px] font-semibold tracking-normal text-[#1c3526]">Media library</h1>
      <p className="mt-1 text-[13px] text-[#738077]">
        Upload an asset, or replace the file behind one that is already in use.
      </p>

      {!live && (
        <p className="mt-4 border border-gold/60 bg-paper px-4 py-3 text-sm" role="note">
          Database unavailable — connect MySQL to manage media.
        </p>
      )}

      {live && brokenIds.size > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-amber-700/40 bg-amber-50 px-4 py-3" role="status">
          <p className="text-[13px] text-amber-900">
            <strong>{brokenIds.size}</strong> of {health.length} assets point at a file that is not on disk. They appear as
            blank images wherever they are used.
          </p>
          <Link
            href={missingOnly ? "/admin/media" : "/admin/media?health=missing"}
            className="shrink-0 border border-amber-800/50 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-amber-900 hover:bg-amber-100"
          >
            {missingOnly ? "← Show all assets" : "Show only these →"}
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <UploadForm events={events} />
        <LinkForm events={events} />
      </div>

      <section className="mt-8" aria-label="Media assets">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl text-forest-950">
            {missingOnly ? "Assets with a missing file" : "Assets"} ({total.toLocaleString()})
          </h2>
          {totalPages > 1 && (
            <p className="text-[13px] text-ink/60">
              Page {page} of {totalPages}
              {page > 1 && (
                <>
                  {" · "}
                  <Link
                    href={`/admin/media?page=${page - 1}${missingOnly ? "&health=missing" : ""}`}
                    className="font-semibold text-primary"
                  >
                    Previous
                  </Link>
                </>
              )}
              {page < totalPages && (
                <>
                  {" · "}
                  <Link
                    href={`/admin/media?page=${page + 1}${missingOnly ? "&health=missing" : ""}`}
                    className="font-semibold text-primary"
                  >
                    Next
                  </Link>
                </>
              )}
            </p>
          )}
        </div>

        {assets.length === 0 ? (
          <p className="mt-4 border hairline bg-white px-5 py-10 text-center text-sm text-ink/60" role="status">
            {live
              ? missingOnly
                ? "Every asset points at a file that exists."
                : page > 1
                  ? "No assets on this page."
                  : "No assets catalogued yet. Upload one above."
              : "Library unavailable without a database."}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto border hairline bg-white">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b hairline bg-paper text-[11px] uppercase tracking-[0.16em] text-ink/55">
                  <th className="px-5 py-3">Preview</th>
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Kind</th>
                  <th className="px-5 py-3">Collection</th>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">File</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => {
                  const missing = brokenIds.has(a.id);
                  return (
                    <tr
                      key={a.id}
                      className={`border-b hairline align-top last:border-0 ${missing ? "bg-red-50/40" : "hover:bg-paper"}`}
                    >
                      <td className="px-5 py-3">
                        {missing ? (
                          <span
                            className="grid h-14 w-14 place-items-center border border-dashed border-red-700/50 bg-red-50 text-center text-[9px] font-bold uppercase leading-tight tracking-wide text-red-800"
                            title="The file for this asset is not on disk"
                          >
                            No
                            <br />
                            file
                          </span>
                        ) : a.kind === "IMAGE" ? (
                          <AssetImage
                            src={a.url}
                            alt=""
                            width={112}
                            height={112}
                            sizes="56px"
                            className="h-14 w-14 border hairline object-cover"
                          />
                        ) : (
                          <span className="grid h-14 w-14 place-items-center border hairline bg-paper text-[10px] font-semibold uppercase text-ink/55">
                            {a.kind}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-semibold text-forest-950">
                        {a.title}
                        {missing && (
                          <span className="mt-1 block w-fit bg-red-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Missing file
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {a.kind}
                        {a.provider ? ` · ${a.provider}` : ""}
                        <span className="block text-[11.5px] text-ink/55">{a.visibility}</span>
                      </td>
                      <td className="px-5 py-3">
                        {a.category}
                        {!a.inGallery && (
                          <span className="mt-1 block w-fit border border-ink/20 bg-paper px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/60">
                            Hidden from gallery
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-ink/60">{a.event?.title ?? "—"}</td>
                      <td className="max-w-[200px] px-5 py-3">
                        <span className="block truncate font-mono text-[12px] text-ink/55" title={a.url}>
                          {a.url}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <MediaRowActions
                          events={events}
                          asset={{
                            id: a.id,
                            title: a.title,
                            category: a.category,
                            altText: a.altText,
                            photographer: a.photographer,
                            description: a.description,
                            eventSlug: a.event?.slug,
                            visibility: a.visibility,
                            kind: a.kind,
                            url: a.url,
                            inGallery: a.inGallery,
                            year: a.year,
                            fileMissing: missing,
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
