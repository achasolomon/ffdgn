import { db, dbReady, fail, failFrom, ok } from "../../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";
import { formText } from "@/lib/cms-validation";

const CATEGORIES = ["News", "Press Release", "Statement", "Media Coverage", "Speech"] as const;
const STATUSES = ["Draft", "Published", "Archived"] as const;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type NewsInput = {
  title?: string; category?: string; date?: string; location?: string;
  excerpt?: string; body?: string; imageUrl?: string; relatedEvent?: string;
  relatedDocs?: string[]; status?: string; official?: boolean;
};

function validate(input: NewsInput, slug: string) {
  const title = formText(input.title);
  const category = formText(input.category);
  const location = formText(input.location);
  const excerpt = formText(input.excerpt);
  const body = formText(input.body);
  const date = formText(input.date);
  const status = formText(input.status) || "Draft";
  const imageUrl = formText(input.imageUrl);
  const relatedEvent = formText(input.relatedEvent);
  const relatedDocs = input.relatedDocs ?? [];
  if (!SLUG.test(slug) || slug.length > 128) return { error: "Slug must use lowercase letters, numbers, and hyphens." };
  if (!title || title.length > 255) return { error: "Title is required (max 255 characters)." };
  if (!(CATEGORIES as readonly string[]).includes(category)) return { error: "Choose a valid news category." };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return { error: "Enter a valid publication date." };
  if (!location || location.length > 128) return { error: "Location is required (max 128 characters)." };
  if (!excerpt || excerpt.length > 5000) return { error: "Summary is required (max 5,000 characters)." };
  if (!body || body.length > 50000) return { error: "Article body is required (max 50,000 characters)." };
  if (!(STATUSES as readonly string[]).includes(status)) return { error: "Choose Draft, Published, or Archived." };
  if (imageUrl && !/^\/(?!\/)[^\r\n]*$/.test(imageUrl)) return { error: "Image must be a same-site media path (for example /media/news/image.jpg)." };
  if (!Array.isArray(relatedDocs) || relatedDocs.some((docSlug) => typeof docSlug !== "string" || !SLUG.test(docSlug))) return { error: "Related documents must be valid slugs." };
  if (relatedEvent && !SLUG.test(relatedEvent)) return { error: "Related event must be a valid slug." };
  return { value: {
    title, category, date: new Date(`${date}T00:00:00Z`), location, excerpt, body,
    status: status as (typeof STATUSES)[number], imageUrl: imageUrl || null,
    relatedEvent, relatedDocs: [...new Set(relatedDocs)], official: input.official !== false,
  } };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "News management requires MySQL.", 503);
    const auth = await requirePermission("news.publish");
    const gate = await rateLimit(`cms.news:${auth.user.id}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many news edits. Try again shortly.", 429);
    const { slug } = await params;
    const existing = await db.newsArticle.findUnique({ where: { slug } });
    if (!existing) return fail("NOT_FOUND", "News item not found.", 404);
    const input = validate((await req.json().catch(() => null)) ?? {}, slug);
    if (input.error || !input.value) return fail("VALIDATION", input.error ?? "Invalid news item.", 422);
    const relationError = await (async () => {
      if (input.value.relatedEvent && !(await db.forumEvent.findUnique({ where: { slug: input.value.relatedEvent }, select: { id: true } }))) return "Related event was not found.";
      if (input.value.relatedDocs.length && (await db.knowledgeDoc.count({ where: { slug: { in: input.value.relatedDocs } } })) !== input.value.relatedDocs.length) return "One or more related documents were not found.";
      return null;
    })();
    if (relationError) return fail("VALIDATION", relationError, 422);

    const { relatedDocs, relatedEvent, ...value } = input.value;
    const updated = await db.newsArticle.update({
      where: { slug },
      data: {
        ...value,
        event: relatedEvent ? { connect: { slug: relatedEvent } } : { disconnect: true },
        linkedDocs: {
          deleteMany: {},
          create: relatedDocs.map((docSlug) => ({ doc: { connect: { slug: docSlug } } })),
        },
      },
      select: { slug: true, title: true, status: true },
    });
    await audit("news.update", `news:${slug}`, {
      previousValue: `${existing.status}: ${existing.title}`,
      newValue: `${updated.status}: ${updated.title}`, ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite(`news updated ${slug}`);
    return ok(updated, { revalidated: true });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";