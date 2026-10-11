import { db, dbReady, fail, failFrom, ok } from "../../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";
import { fallbackInstitutionalPage } from "@/lib/institutional-pages";
import { formText } from "@/lib/cms-validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Institutional page management requires MySQL.", 503);
    const auth = await requirePermission("settings.manage");
    const gate = await rateLimit(`cms.pages:${auth.user.id}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many page edits. Try again shortly.", 429);
    const { slug } = await params;
    const fallback = fallbackInstitutionalPage(slug);
    if (!fallback) return fail("NOT_FOUND", "Institutional page not found.", 404);
    const body = (await req.json().catch(() => null)) as { title?: unknown; eyebrow?: unknown; lede?: unknown; body?: unknown } | null;
    if (!body) return fail("VALIDATION", "Request body is required.", 422);
    const title = formText(body.title);
    const eyebrow = formText(body.eyebrow);
    const lede = formText(body.lede);
    const copy = typeof body.body === "string" ? body.body.trim() : "";
    if (!title || title.length > 255 || !eyebrow || eyebrow.length > 128 || !lede || lede.length > 5000 || typeof body.body !== "string" || copy.length > 30000) {
      return fail("VALIDATION", "Provide a title, small heading and introduction within their limits. Closing text is optional (up to 30,000 characters).", 422);
    }
    const existing = await db.institutionalPage.findUnique({ where: { slug } });
    const page = await db.institutionalPage.upsert({
      where: { slug },
      update: { title, eyebrow, lede, body: copy, published: true },
      create: { slug, title, eyebrow, lede, body: copy, published: true, sections: { create: fallback.sections.map((section) => ({ title: section.title, body: section.body, position: section.position, imageUrl: section.imageUrl || null, imageAlt: section.imageAlt || null, published: true })) } },
    });
    await audit("cms.page.update", `page:${slug}`, {
      previousValue: existing?.title ?? "(seeded fallback)", newValue: page.title,
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite(`institutional page ${slug}`);
    return ok({ slug: page.slug, title: page.title }, { revalidated: true });
  } catch (error) { return failFrom(error); }
}

export const dynamic = "force-dynamic";
