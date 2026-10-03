import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requirePermission, audit } from "@/lib/server-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { revalidatePublicSite } from "@/lib/revalidate";

/**
 * Membership roster of the Renewed Hope Agenda Peer Review Group (RHPRG).
 *
 * The roster is public-facing tabular content, but it names individuals and
 * carries optional contact details, so every write requires `settings.manage`
 * and is audited like the rest of the CMS.
 */
const MAX_NAME = 200;
const MAX_ZONE = 100;
const MAX_ROLE = 100;
const MAX_PHONE = 50;
const MAX_EMAIL = 255;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type MemberBody = {
  name?: unknown;
  zone?: unknown;
  role?: unknown;
  phone?: unknown;
  email?: unknown;
  position?: unknown;
  published?: unknown;
};

function optionalText(value: unknown, max: number, field: string): { ok: true; value: string | null } | { ok: false; message: string } {
  if (value === undefined || value === null || value === "") return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, message: `\`${field}\` must be text.` };
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > max) return { ok: false, message: `\`${field}\` must be at most ${max} characters.` };
  return { ok: true, value: trimmed };
}

function requiredText(value: unknown, max: number, field: string): { ok: true; value: string } | { ok: false; message: string } {
  const result = optionalText(value, max, field);
  if (!result.ok) return result;
  if (!result.value) return { ok: false, message: `\`${field}\` is required (max ${max} characters).` };
  return { ok: true, value: result.value };
}

/** A validated member, ready for Prisma. `position`/`published` are optional
 * because a partial update may leave them untouched. */
export type MemberData = {
  name: string;
  zone: string;
  role: string;
  phone: string | null;
  email: string | null;
  position?: number;
  published?: boolean;
};

/**
 * Validates a member payload and returns the Prisma-shaped fields, or an
 * error message. Split from the handlers so create and update cannot drift
 * apart on validation rules.
 */
export function validate(body: MemberBody): { ok: true; data: MemberData } | { ok: false; message: string } {
  const name = requiredText(body.name, MAX_NAME, "name");
  if (!name.ok) return { ok: false, message: name.message };
  const zone = requiredText(body.zone, MAX_ZONE, "zone");
  if (!zone.ok) return { ok: false, message: zone.message };
  const role = requiredText(body.role, MAX_ROLE, "role");
  if (!role.ok) return { ok: false, message: role.message };

  const phone = optionalText(body.phone, MAX_PHONE, "phone");
  if (!phone.ok) return { ok: false, message: phone.message };
  const email = optionalText(body.email, MAX_EMAIL, "email");
  if (!email.ok) return { ok: false, message: email.message };
  if (email.value && !EMAIL_PATTERN.test(email.value)) {
    return { ok: false, message: "`email` must be a valid email address." };
  }

  const data: MemberData = {
    name: name.value,
    zone: zone.value,
    role: role.value,
    phone: phone.value,
    email: email.value,
  };

  if (body.position !== undefined && body.position !== null && body.position !== "") {
    const position = typeof body.position === "number" ? body.position : Number(body.position);
    if (!Number.isInteger(position) || position < 1 || position > 9999) {
      return { ok: false, message: "`position` must be a whole number between 1 and 9999." };
    }
    data.position = position;
  }

  if (body.published !== undefined) data.published = Boolean(body.published);

  return { ok: true, data };
}

/**
 * GET  /api/v1/cms/peer-review-members — full roster for the admin editor.
 * POST /api/v1/cms/peer-review-members — add a member. Requires `settings.manage`. Audited.
 */
export async function GET() {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "CMS requires the MySQL database.", 503);
    const rows = await db.peerReviewMember.findMany({ orderBy: { position: "asc" } });
    return ok(rows, { source: "mysql" });
  } catch (e) {
    return failFrom(e);
  }
}

export async function POST(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "CMS requires the MySQL database.", 503);
    const auth = await requirePermission("settings.manage");
    const gate = await rateLimit(`cms.peer-review:${clientIp(req.headers)}`, 60, 10 * 60 * 1000);
    if (!gate.ok) return fail("RATE_LIMITED", "Too many edits. Try again shortly.", 429);

    const body = (await req.json().catch(() => null)) as MemberBody | null;
    if (!body) return fail("VALIDATION", "Request body is required.", 422);
    const validated = validate(body);
    if (!validated.ok) return fail("VALIDATION", validated.message, 422);

    const data = validated.data;
    // A missing position means "append": the next free S/N after the last row.
    const position =
      data.position ??
      ((await db.peerReviewMember.findFirst({ orderBy: { position: "desc" }, select: { position: true } }))?.position ?? 0) + 1;

    const row = await db.peerReviewMember.create({
      data: {
        name: data.name,
        zone: data.zone,
        role: data.role,
        phone: data.phone,
        email: data.email,
        position,
        ...(data.published === undefined ? {} : { published: data.published }),
      },
    });
    await audit("cms.peerReviewMember.create", `peer-review-member:${row.id}`, {
      newValue: `${row.position}. ${row.name} — ${row.role}, ${row.zone}`,
      ip: clientIp(req.headers), actorOverride: auth,
    });
    revalidatePublicSite("peer review member added");
    return ok(row, { revalidated: true });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
