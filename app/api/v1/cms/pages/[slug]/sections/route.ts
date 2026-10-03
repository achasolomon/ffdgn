import { db, dbReady, fail, failFrom, ok } from "../../../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";
import { fallbackInstitutionalPage } from "@/lib/institutional-pages";
import { formText } from "@/lib/cms-validation";
import { imagePathResolves } from "@/lib/media-path";

const TITLE_MAX = 200;
const BODY_MAX = 5000;
const ALT_MAX = 300;

/**
 * Reads a section payload from an admin request.
 *
 * Image rules mirror homepage focus/timeline rows: a path must resolve to a
 * MediaAsset or an existing file under /public. Alt text is required whenever an
 * image is attached, because a section image illustrates that specific section
 * and there is no other source for it.
 */
async function readSection(input: unknown): Promise<{ ok: true; value: { title: string; body: string; imageUrl: string | null; imageAlt: string | null; published: boolean } } | { ok: false; error: string }> {
  const raw = (input ?? {}) as { title?: unknown; body?: unknown; imageUrl?: unknown; imageAlt?: unknown; published?: unknown };
  const title = formText(raw.title);
  const body = formText(raw.body);
  if (!title || title.length > TITLE_MAX) return { ok: false, error: `Section title is required and must be at most ${TITLE_MAX} characters.` };
  if (!body || body.length > BODY_MAX) return { ok: false, error: `Section text is required and must be at most ${BODY_MAX} characters.` };

  const imagePath = typeof raw.imageUrl === "string" ? raw.imageUrl.trim() : "";
  if (imagePath && !(await imagePathResolves(imagePath))) {
    return { ok: false, error: "Section image must be a media library item or an existing file under /public." };
  }

  const imageAlt = formText(raw.imageAlt);
  if (imagePath && !imageAlt) return { ok: false, error: "Alt text is required when an image is attached to a section." };
  if (imageAlt.length > ALT_MAX) return { ok: false, error: `Section alt text must be at most ${ALT_MAX} characters.` };

  return {
    ok: true,
    value: {
      title,
      body,
      imageUrl: imagePath || null,
      imageAlt: imagePath ? imageAlt : null,
      published: raw.published === false ? false : true,
    },
  };
}

async function requirePage(slug: string) {
  if (!fallbackInstitutionalPage(slug)) return null;
  const page = await db.institutionalPage.findUnique({ where: { slug } });
  if (!page) return null;
  return page;
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Section management requires MySQL.", 503);
    const auth = await requirePermission("settings.manage");
    const gate = await rateLimit(`cms.sections:${auth.user.id}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many section edits. Try again shortly.", 429);
    const { slug } = await params;
    const page = await requirePage(slug);
    if (!page) return fail("NOT_FOUND", "Institutional page not found.", 404);

    const payload = (await req.json().catch(() => null)) as { title?: unknown } | null;
    if (!payload) return fail("VALIDATION", "Request body is required.", 422);
    const parsed = await readSection(payload);
    if (!parsed.ok) return fail("VALIDATION", parsed.error, 422);

    const last = await db.institutionalSection.findFirst({ where: { pageId: page.id }, orderBy: { position: "desc" } });
    const section = await db.institutionalSection.create({
      data: { ...parsed.value, pageId: page.id, position: (last?.position ?? -1) + 1 },
    });
    await audit("cms.section.create", `page:${slug}:section:${section.id}`, {
      previousValue: "(none)", newValue: section.title,
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite(`institutional page ${slug}`);
    return ok({ id: section.id, title: section.title }, { status: 201, revalidated: true });
  } catch (error) { return failFrom(error); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Section management requires MySQL.", 503);
    const auth = await requirePermission("settings.manage");
    const gate = await rateLimit(`cms.sections:${auth.user.id}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many section edits. Try again shortly.", 429);
    const { slug } = await params;
    const page = await requirePage(slug);
    if (!page) return fail("NOT_FOUND", "Institutional page not found.", 404);

    const payload = (await req.json().catch(() => null)) as { id?: unknown } | null;
    if (!payload) return fail("VALIDATION", "Request body is required.", 422);
    const id = formText(payload.id);
    if (!id) return fail("VALIDATION", "Section id is required.", 422);
    const existing = await db.institutionalSection.findFirst({ where: { id, pageId: page.id } });
    if (!existing) return fail("NOT_FOUND", "Section not found on this page.", 404);

    const parsed = await readSection(payload);
    if (!parsed.ok) return fail("VALIDATION", parsed.error, 422);
    const section = await db.institutionalSection.update({ where: { id }, data: parsed.value });
    await audit("cms.section.update", `page:${slug}:section:${id}`, {
      previousValue: existing.title, newValue: section.title,
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite(`institutional page ${slug}`);
    return ok({ id: section.id, title: section.title }, { revalidated: true });
  } catch (error) { return failFrom(error); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Section management requires MySQL.", 503);
    const auth = await requirePermission("settings.manage");
    const gate = await rateLimit(`cms.sections:${auth.user.id}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many section edits. Try again shortly.", 429);
    const { slug } = await params;
    const page = await requirePage(slug);
    if (!page) return fail("NOT_FOUND", "Institutional page not found.", 404);

    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!id) return fail("VALIDATION", "Section id is required.", 422);
    const existing = await db.institutionalSection.findFirst({ where: { id, pageId: page.id } });
    if (!existing) return fail("NOT_FOUND", "Section not found on this page.", 404);

    await db.institutionalSection.delete({ where: { id } });
    await audit("cms.section.delete", `page:${slug}:section:${id}`, {
      previousValue: existing.title, newValue: "(deleted)",
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite(`institutional page ${slug}`);
    return ok({ id }, { revalidated: true });
  } catch (error) { return failFrom(error); }
}

export const dynamic = "force-dynamic";
