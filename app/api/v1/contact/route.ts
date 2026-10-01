import { db, dbReady, fail, failFrom, ok } from "../_lib";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/v1/contact — public Secretariat enquiry + newsletter subscription.
 *
 * Unauthenticated by design (visitors write to the Secretariat). Controls:
 * per-email+IP rate limit, honeypot field, server-side validation. Submissions
 * are persisted to `contact_messages` for the Secretariat to work from.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type ContactBody = {
  name?: unknown; email?: unknown; subject?: unknown; message?: unknown;
  /** Honeypot — real visitors never fill this. Bots that do get a fake success. */
  website?: unknown;
};

const asString = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(req: Request) {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Enquiries are unavailable right now.", 503);

    const body = (await req.json().catch(() => null)) as ContactBody | null;
    if (!body) return fail("VALIDATION", "Request body is required.", 422);

    const name = asString(body.name);
    const email = asString(body.email).toLowerCase();
    const subject = asString(body.subject);
    const message = asString(body.message);
    const honeypot = asString(body.website);

    // Honeypot tripped: answer exactly like a success so bots learn nothing.
    if (honeypot) return ok({ received: true });

    const ip = clientIp(req.headers);
    const gate = rateLimit(`contact:${email || "anon"}:${ip}`, 5, 60_000);
    if (!gate.ok) {
      return fail("RATE_LIMITED", "Too many messages sent. Please try again in a minute.", 429);
    }

    if (name.length < 2 || name.length > 120) {
      return fail("VALIDATION", "Please provide your name (2–120 characters).", 422);
    }
    if (!EMAIL_RE.test(email) || email.length > 255) {
      return fail("VALIDATION", "Please provide a valid email address.", 422);
    }
    if (!subject || subject.length > 200) {
      return fail("VALIDATION", "Please provide a subject (max 200 characters).", 422);
    }
    if (message.length < 10 || message.length > 5000) {
      return fail("VALIDATION", "Please provide a message (10–5000 characters).", 422);
    }

    await db.contactMessage.create({ data: { name, email, subject, message, ip } });
    return ok({ received: true });
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
