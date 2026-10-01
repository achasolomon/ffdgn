import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp } from "@/lib/rate-limit";

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;
const VIMEO_ID = /^[0-9]{6,12}$/;

/**
 * POST /api/v1/media/link — catalogue a YouTube/Vimeo video. Requires `media.manage`.
 * Body: { title, provider: "YOUTUBE"|"VIMEO", providerId, category?, eventSlug?, description? }.
 * Thumbnails resolve to the provider CDN; playback is a privacy-hardened embed.
 */
export async function POST(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Media library requires the MySQL database.", 503);
    const auth = await requirePermission("media.manage");
    const body = (await req.json().catch(() => null)) as {
      title?: string; provider?: string; providerId?: string;
      category?: string; eventSlug?: string; description?: string;
    } | null;
    if (!body) return fail("VALIDATION", "Request body is required.", 422);

    const title = body.title?.trim() ?? "";
    const provider = body.provider ?? "";
    const providerId = body.providerId?.trim() ?? "";
    if (!title) return fail("VALIDATION", "A title is required.", 422);
    if (provider !== "YOUTUBE" && provider !== "VIMEO") {
      return fail("VALIDATION", 'Provider must be "YOUTUBE" or "VIMEO".', 422);
    }
    const valid = provider === "YOUTUBE" ? YOUTUBE_ID.test(providerId) : VIMEO_ID.test(providerId);
    if (!valid) return fail("VALIDATION", "Invalid provider video ID.", 422);

    let eventId: string | null = null;
    if (body.eventSlug) {
      const event = await db.forumEvent.findUnique({ where: { slug: body.eventSlug }, select: { id: true } });
      if (!event) return fail("VALIDATION", "Unknown eventSlug.", 422);
      eventId = event.id;
    }

    const thumbnailUrl =
      provider === "YOUTUBE" ? `https://i.ytimg.com/vi/${providerId}/hqdefault.jpg` : null;
    const asset = await db.mediaAsset.create({
      data: {
        title, kind: "VIDEO", category: (body.category ?? "Conference").slice(0, 64),
        url: provider === "YOUTUBE" ? `https://www.youtube.com/watch?v=${providerId}` : `https://vimeo.com/${providerId}`,
        thumbnailUrl, provider, providerId,
        photographer: auth.user.name, copyright: "© FFDGN",
        altText: title, description: body.description?.slice(0, 2000) ?? null, eventId,
      },
    });
    await audit("media.link", `media:${asset.id}`, {
      newValue: `${provider} ${providerId} — ${title}`, ip: clientIp(req.headers), actorOverride: auth,
    });
    return ok({ id: asset.id, title, provider, providerId, thumbnailUrl }, null);
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
