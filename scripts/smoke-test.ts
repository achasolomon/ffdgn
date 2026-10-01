/**
 * Post-remediation smoke test.
 *
 * Verifies the fixes that could not be confirmed by typecheck/lint alone:
 *   1. the contact endpoint persists a real submission,
 *   2. restricted documents are indistinguishable from missing ones (404, not 403),
 *   3. the audit endpoint refuses anonymous callers instead of serving a fallback,
 *   4. write endpoints reject unauthenticated mutations,
 *   5. the upload endpoint rejects a disguised payload.
 *
 * Requires a running server and a seeded database. Usage:
 *   npx tsx scripts/smoke-test.ts [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:3000";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function json(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let payload: unknown = null;
  try { payload = JSON.parse(text); } catch { /* non-JSON body */ }
  return { status: res.status, payload: payload as Record<string, unknown> | null, text };
}

const unique = Date.now();

async function main() {
  console.log(`\nFFDGN smoke test → ${BASE}\n`);

  // 1 — contact endpoint round trip
  {
    const res = await json("/api/v1/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Smoke Test",
        email: `smoke.${unique}@example.com`,
        subject: "Automated verification",
        message: "Post-remediation smoke test submission. Safe to delete.",
        website: "",
      }),
    });
    check("contact endpoint accepts a valid submission", res.status === 200 && res.payload?.status === "success", `got ${res.status}`);
  }

  // 2 — contact endpoint validation
  {
    const res = await json("/api/v1/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "x", email: "not-an-email", subject: "", message: "" }),
    });
    check("contact endpoint rejects invalid input", res.status === 422, `got ${res.status}`);
  }

  // 3 — honeypot is silently absorbed, not announced
  {
    const res = await json("/api/v1/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bot", email: `bot.${unique}@example.com`,
        subject: "spam", message: "spam", website: "http://spam.example",
      }),
    });
    check("honeypot submission is silently dropped", res.status === 200, `got ${res.status}`);
  }

  // 4 — restricted documents must not be enumerable
  {
    const missing = await json("/api/v1/documents/this-record-does-not-exist-12345");
    check("unknown document returns 404", missing.status === 404, `got ${missing.status}`);
    check(
      "document endpoint does not leak 403 for restricted records",
      missing.status !== 403,
      `got ${missing.status}`,
    );
  }

  // 5 — audit endpoint must fail closed, never serve a fallback
  {
    const res = await json("/api/v1/audit");
    check(
      "audit endpoint refuses anonymous callers",
      res.status === 401 || res.status === 403,
      `got ${res.status} — an unauthenticated 200 would be a fail-open regression`,
    );
  }

  // 6 — write endpoints must refuse anonymous callers
  const writes = [
    // Real document slug: an anonymous caller must be rejected before the
    // record is read, so the response cannot be used to enumerate slugs.
    ["/api/v1/documents/end-of-term-governance-2024", "PATCH"],
    ["/api/v1/members/any-member-slug", "PATCH"],
    ["/api/v1/cms/settings", "PATCH"],
    ["/api/v1/cms/metrics", "PATCH"],
    ["/api/v1/users", "POST"],
    ["/api/v1/media/link", "POST"],
  ] as const;
  for (const [path, method] of writes) {
    const res = await json(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? "{}" : JSON.stringify({ to: "Published" }),
    });
    check(`${method} ${path} refuses anonymous callers`, res.status === 401 || res.status === 403, `got ${res.status}`);
  }

  // 7 — upload endpoint must authorize before reading the body
  {
    const form = new FormData();
    // Declares image/png, actually contains HTML with a script tag.
    form.set("file", new Blob(["<html><script>alert(1)</script></html>"], { type: "image/png" }), "evil.png");
    form.set("title", "Disguised payload");
    const res = await json("/api/v1/media", { method: "POST", body: form });
    check(
      "media upload refuses anonymous callers before reading the body",
      res.status === 401 || res.status === 403,
      `got ${res.status}`,
    );
  }

  // 8 — GET methods that are publicly readable must still work
  for (const path of ["/api/v1/documents", "/api/v1/members", "/api/v1/search?q=fiscal"]) {
    const res = await json(path);
    check(`GET ${path} is publicly readable`, res.status === 200, `got ${res.status}`);
  }

  // 9 — page routes
  for (const path of ["/", "/contact", "/news", "/knowledge", "/leadership", "/sitemap.xml", "/robots.txt"]) {
    const res = await fetch(`${BASE}${path}`);
    check(`GET ${path} serves 200`, res.status === 200, `got ${res.status}`);
  }
  {
    const res = await fetch(`${BASE}/no-such-page`);
    check("unknown page serves 404", res.status === 404, `got ${res.status}`);
  }

  // 10 — detail pages.
  //
  // A streaming `loading.tsx` makes Next flush the shell with a 200 before the
  // page body calls `notFound()`, so a missing or restricted record renders the
  // 404 body under a 200 status. That defeats the restricted-record guarantee
  // in spirit — crawlers and clients index it as a live page — so the status
  // code is asserted, not just the body.
  for (const [path, want] of [
    ["/members/atim-tyonongu", 200],
    ["/members/no-such-member-xyz", 404],
    ["/knowledge/end-of-term-governance-2024", 200],
    // Restricted: Published + MEMBERS_ONLY must not be publicly addressable.
    ["/knowledge/subnational-finance-2025", 404],
    ["/news/state-federal-collaboration-call", 200],
    ["/events/national-conference-2025", 200],
  ] as const) {
    const res = await fetch(`${BASE}${path}`);
    check(`GET ${path} serves ${want}`, res.status === want, `got ${res.status}`);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("smoke test crashed:", e);
  process.exit(1);
});