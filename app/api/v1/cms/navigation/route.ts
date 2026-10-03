import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";

const PATH = /^\/(?!\/)[A-Za-z0-9\-_/?.=&%#]*$/;
const labelValid = (value: unknown, max = 80): value is string => typeof value === "string" && !!value.trim() && value.trim().length <= max;
const pathValid = (value: unknown): value is string => typeof value === "string" && value.length <= 255 && PATH.test(value);

function validateNavigation(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) return false;
  return value.every((item) => item && typeof item === "object" &&
    labelValid(item.label) && pathValid(item.href) && Array.isArray(item.children) && item.children.length <= 20 &&
    item.children.every((child: unknown) => child && typeof child === "object" &&
      labelValid((child as Record<string, unknown>).label) && pathValid((child as Record<string, unknown>).href) &&
      labelValid((child as Record<string, unknown>).desc, 255)));
}

function validateFooter(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) return false;
  return value.every((column) => column && typeof column === "object" &&
    labelValid(column.heading) && Array.isArray(column.links) && column.links.length <= 20 &&
    column.links.every((link: unknown) => link && typeof link === "object" &&
      labelValid((link as Record<string, unknown>).label) && pathValid((link as Record<string, unknown>).href)));
}

export async function PATCH(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Navigation management requires MySQL.", 503);
    const auth = await requirePermission("settings.manage");
    const gate = await rateLimit(`cms.navigation:${auth.user.id}`, 40, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many navigation edits. Try again shortly.", 429);
    const body = (await req.json().catch(() => null)) as { navigation?: unknown; footer?: unknown } | null;
    if (!body || !validateNavigation(body.navigation) || !validateFooter(body.footer)) return fail("VALIDATION", "Provide valid navigation groups and footer columns with same-site paths.", 422);
    const keys = ["navigation.primary", "navigation.footer"];
    const previous = await db.siteSetting.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } });
    const previousByKey = new Map(previous.map((row) => [row.key, row.value]));
    const next = [JSON.stringify(body.navigation), JSON.stringify(body.footer)];
    await db.$transaction([
      db.siteSetting.upsert({ where: { key: keys[0] }, update: { value: next[0] }, create: { key: keys[0], value: next[0] } }),
      db.siteSetting.upsert({ where: { key: keys[1] }, update: { value: next[1] }, create: { key: keys[1], value: next[1] } }),
    ]);
    await audit("cms.navigation.update", "navigation:primary+footer", {
      previousValue: `${previousByKey.get(keys[0]) ?? "default"} | ${previousByKey.get(keys[1]) ?? "default"}`.slice(0, 200),
      newValue: `${next[0]} | ${next[1]}`.slice(0, 200), ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite("navigation updated");
    return ok({ saved: true }, { revalidated: true });
  } catch (e) { return failFrom(e); }
}

export const dynamic = "force-dynamic";