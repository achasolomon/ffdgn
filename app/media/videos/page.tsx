import { getTemplateCopy } from "@/lib/template-repo";
import { asRoute as templateRoute } from "@/lib/routes";
import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import Link from "next/link";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading, EmptyState } from "@/components/ui";
import { VideoPlayer, MediaCredit } from "@/components/media";
import { listVideos } from "@/lib/repo";

export default async function VideosPage() {
  const copy = await getTemplateCopy("page-media-videos");

  const managed = await managedWebsitePage("/media/videos");
  if (managed) return managed;

  const videos = await listVideos();
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: copy("field-001"), href: templateRoute(copy("field-002")) }, { label: copy("field-003") }]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading as="h1" eyebrow={copy("field-004")} title={copy("field-005")} lede={copy("field-006")} />
        <Link href={templateRoute(copy("field-007"))} className="text-sm font-semibold text-primary link-underline">{copy("field-008")}</Link>
      </div>
      {videos.length ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {videos.map((v) => (
            <article key={v.id} className="border hairline bg-white p-3">
              <VideoPlayer item={v} />
              <div className="px-2 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-deep">{v.category}</p>
                <h2 className="mt-0.5 font-semibold text-forest-950">{v.title}</h2>
                {v.description && <p className="mt-1 text-[13px] text-ink/60">{v.description}</p>}
                <MediaCredit item={v} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title={copy("field-009")}
            body="The video archive supports YouTube, Vimeo and direct uploads with privacy-hardened embeds. The Secretariat catalogues recordings here after each convening."
            action={<Link href={templateRoute(copy("field-010"))} className="border border-primary/40 px-5 py-2.5 text-sm font-semibold text-primary">{copy("field-011")}</Link>}
          />
        </div>
      )}
    </div>
  );
}

export const revalidate = 300;

export async function generateMetadata() {return await websiteMetadata("/media/videos") ?? {}; }
