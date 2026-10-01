# FFDGN Digital Platform — MySQL + Real Auth (Phase 1.5)

Institutional digital platform for the Forum of Former Deputy Governors of Nigeria.
Modular monolith: Next.js 16 + MySQL 8 (Prisma) + NextAuth credentials + capability RBAC.

## Quick start (local)
```bash
npm install
cp .env.example .env            # then set NEXTAUTH_SECRET (openssl rand -base64 32)

docker compose up -d db         # MySQL 8 on 127.0.0.1:3307
npm run db:setup                # migrate + seed institutional baseline
npm run dev                     # http://localhost:3000
```

Seeded accounts (LOCAL ONLY — rotate before any deployment):
| Email | Role | Password |
|---|---|---|
| superadmin@ffdgn.org.ng | super_admin | FFDGN-Super-2026! |
| secretariat@ffdgn.org.ng | secretariat_admin | FFDGN-Secret-2026! |
| editor@ffdgn.org.ng | content_editor | FFDGN-Edit-2026! |
| events@ffdgn.org.ng | events_manager | FFDGN-Event-2026! |
| auditor@ffdgn.org.ng | auditor | FFDGN-Audit-2026! |
| member@ffdgn.org.ng | member | FFDGN-Member-2026! |

## What changed (MySQL + auth promotion)
- `prisma/schema.prisma` — normalized MySQL 8 schema (§27/§31): users, members + service history,
  events + programme, documents (approval workflow), news, committees + seats, partnerships, append-only audit log.
- `prisma/seed.ts` — loads the CMS baseline from `lib/data.ts`; bcrypt-hashed passwords (cost 12).
- `lib/auth-options.ts` — NextAuth credentials provider: email/password, brute-force lockout
  (5 failures → 15 min lock), rate limiting, `auth.login` audit entry, JWT sessions (8h, hourly role refresh).
- `proxy.ts` — Next 16's renamed `middleware` convention. `/portal` requires any institutional
  role; `/admin` requires staff role; `noindex` preserved. Also mints the per-request CSP nonce.
- `lib/server-auth.ts` — `requireAuth()` / `requirePermission()` for server-side authorization; `audit()` writer.
- API migrated to MySQL with seeded-data fallback (no `DATABASE_URL` → preview mode):
  `members`, `events`, `documents`, `search` (public records only), `audit` (requires `audit.view`),
  plus `POST /api/v1/users` (`users.manage`) and `POST /api/v1/auth/change-password` (self).
- Approval workflow engine (`lib/workflow.ts`): `PATCH /api/v1/documents/:slug` allows only legal
  edges, one capability per edge, version increment + audit on every traversal; illegal jumps → 422.
- Membership mutations: `PATCH /api/v1/members/:slug` (`members.update`) for status/visibility, audited.
- `lib/repo.ts` — DB-first reads for all public pages (members, events, knowledge, news, committees,
  partnerships); single-doc/member detail routes 404 restricted records publicly.
- CMS content tables: `site_settings` (hero + identity copy), `site_metrics` (intelligence strip),
  `focus_areas` (Our Role), `timeline_entries` + links, `leadership_seats`, and relation joins
  (`event_speakers`, `member_events`, `member_publications`, `partnership_cooperation/events`, `news_docs`).
  Every public surface — homepage, directory, detail pages, leadership, history, search, sitemap —
  renders from MySQL; `lib/data.ts` survives only as the seed baseline + no-database preview fallback.
  CMS edits refresh via 5-minute ISR (`revalidate = 300`).
- `GET/PATCH /api/v1/cms/settings` and `/api/v1/cms/metrics` (`settings.manage`, audited) so the
  Secretariat edits hero copy and figures without deploys.
- `scripts/smoke-workflow.ps1` — 13-assertion auth/workflow/audit verification (all passing).
- `scripts/smoke-cms.ps1` — 14-assertion CMS sourcing + RBAC verification (all passing).

## Media system (photos + videos)
- `media_assets` table: kind (IMAGE/VIDEO), collection, file or provider embed (YouTube/Vimeo),
  credit, alt text, event link, visibility. 19 records seeded; `scripts/generate-media.mjs`
  produces the on-brand artwork set (`public/media/`) the Secretariat replaces with real photography.
- Portrait covers on members, cover art on events, lead images on news, galleries with lightbox
  on event pages, `/media/photos` (filterable) and `/media/videos` (click-to-play,
  privacy-hardened nocookie/Vimeo embeds — no third-party requests until the user presses play).
- Secretariat console (`/admin/media`, `media.manage`): validated uploads
  (images ≤10 MB, video ≤200 MB, MIME allow-list, stored under `public/uploads` — swap to S3/CDN
  in production) + YouTube/Vimeo cataloguing. Every ingest is audit-logged.
- `scripts/smoke-media.ps1` — 13-assertion media verification incl. upload RBAC (all passing).
- `/login` sign-in page; header shows session state (sign in → name/role → sign out).
- `/portal` greets the signed-in user; `/admin` shows live MySQL counts + audit excerpt.

## Security posture
- Passwords: bcrypt cost 12, never logged; 12-char minimum; current-password required for changes.
- Sessions: JWT, 8h max age; the jwt callback re-reads the account on every token read, so
  deactivation and password changes revoke live sessions immediately rather than within the hour.
- Auth: per-email+IP rate limits, account lockout, login audit entries, generic error messages (no enumeration).
- Authorization: `proxy.ts` (route) + `requirePermission()` (operation) — client checks are cosmetic only.
- Private surfaces: `noindex` headers + robots disallow + session gate.
- CSP: per-request nonce, `script-src` has no `'unsafe-inline'`; see `proxy.ts`.
- Restricted records return a real HTTP 404, not a 200 wrapping a 404 body. Do not reintroduce a
  streaming root `loading.tsx` — it flushes a 200 before `notFound()` runs.

## Verification
- `npm run check` — typecheck, `eslint .`, production build.
- `scripts/smoke-test.ts <base-url>` — 30 assertions against a running server (auth boundaries,
  slug non-enumeration, contact round trip, page status codes). Run against `next start`, not dev.
- `scripts/cleanup-smoke-data.ts` — removes smoke-test contacts and audit rows afterwards.

## Before production deployment
1. `NEXTAUTH_SECRET` (≥32 random chars), all passwords, MySQL credentials — rotate everything.
2. `GRANT` app user least privilege; make `audit_log` insert-only (revoke UPDATE/DELETE).
3. Replace in-memory `lib/rate-limit.ts` with Redis/Upstash (multi-instance correctness).
4. TLS everywhere; `NEXTAUTH_URL` = canonical https origin; secure cookies are automatic on https.
5. Add 2FA for privileged roles (roadmap) and MySQL backups + point-in-time recovery.
6. Delete or rotate the seeded dev accounts; create real accounts via `POST /api/v1/users` as super_admin.

## Structure
- `app/` — public website, `/login`, `/portal`, `/admin`, `/api/v1`, `/api/auth/[...nextauth]`
- `components/` — chrome + `auth-button.tsx` (session-aware) + `providers.tsx`
- `lib/` — `db.ts` (Prisma singleton), `auth.ts` (RBAC source of truth), `auth-options.ts`,
  `server-auth.ts`, `rate-limit.ts`, `search.ts`, `data.ts` (seed baseline + preview fallback)
- `prisma/` — `schema.prisma`, `seed.ts`, `migrations/`, legacy `schema.sql` reference
