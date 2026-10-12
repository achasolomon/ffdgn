# FFDGN Digital Platform — MySQL + Real Auth (Phase 1.5)

Institutional digital platform for the Forum of Former Deputy Governors of Nigeria.
Modular monolith: Next.js 16 + MySQL 8 (Prisma) + NextAuth credentials + capability RBAC.

## Conference guest lists, QR emails, RSVP and gate check-in

Administrators can create accounts restricted to the guest desk from **Event settings → Invite a guest-desk staff member**. Choose registration, gate check-in, attendance viewing or event management duties. Staff receive a one-use email link, create their own password on their phone and sign in directly to assigned events without wider console access. The configured SMTP worker sends these setup emails. See [staff account setup](docs/CONFERENCE_STAFF_ACCOUNTS.md). Apply `20261011200000_conference_staff_accounts` and the seventh conference migration, `20261012030000_conference_staff_invitations`, after the five conference migrations described below and regenerate Prisma before using this version.

The console entry is now **Conference guest desk**, with a task menu and separate screens for registration, finding/printing guest tags, uploading invited guests, gate check-in, attendance and settings. See the [plain-language staff guide](docs/CONFERENCE_STAFF_GUIDE.md).

Staff can now register walk-ins without email and prepare a QR tag before gate entry. Imported dignitaries can receive the same QR by email and have their tag printed on arrival. Open **Conference operations** in the sidebar, select the event, then use **Register a walk-in guest** or **Print a guest QR tag**. Registration and printing do not count as attendance; the gate officer scans and confirms entry. See [walk-in and dignitary setup](docs/CONFERENCE_WALKIN_SETUP.md). Apply the additional `20261011180000_conference_walkins` migration and regenerate Prisma along with the four earlier migrations below.

Staff can upload already-invited guests, validate/commit a CSV preview, assign VIP/VVIP categories, add guests individually and search event registrations. Select guests to issue/queue their QR email, resend, regenerate or revoke invitations. The email contains their entry QR, downloadable PNG/PDF and a simple RSVP link; guests do not need accounts or registration forms. QR delivery does not wait for RSVP. Importing alone sends nothing. Online gate check-in and printable badge PDF are available; attendance reports and browser badge printing with explicit collection confirmation are available. Hardware validation remains outstanding.

Apply all four additive conference migrations (`20261011100000_conference_foundation`, `20261011120000_conference_invitations`, `20261011140000_conference_gate`, `20261011160000_conference_printing`) to a backed-up development/staging database with `npm run prisma:deploy`, then configure the encryption key and existing cPanel SMTP settings, set `CONFERENCE_MODULE_ENABLED=true` and restart the application. These migrations are required before deploying this version even when the feature flag is false: the generated Prisma client expects the extended registration schema. Open `/admin/events/operations` as a super administrator or Secretariat administrator, select an event and enable its guest list. Assign existing institutional staff to that event if needed. Invitation-only events block member self-registration while the module is enabled; events without conference configuration retain existing portal behavior. Leave the flag false on production until release validation is complete. See [SMTP/worker setup](docs/CONFERENCE_EMAIL_SETUP.md); email jobs need a supervised worker or scheduled command and do not run in web requests.

Select **Open gate check-in** to verify QR codes by camera/reader, review guests and record duplicate-safe admission. Manual lookup requires an identity-check reason; RSVP is optional unless a manager explicitly requires acceptance. Admitted guests can receive a printable badge PDF. See [gate setup](docs/CONFERENCE_GATE_SETUP.md) and [reporting/printing setup](docs/CONFERENCE_REPORTING_PRINTING.md). Physical printer and host/device rehearsal remain outstanding.

CSV uploads use the downloadable template, with a 500-row/512 KB batch limit. Every row must pass validation before commit. The initial identity policy allows one person per normalized email; shared assistant addresses and conflicting identities require review, rather than automatic merging. Committed preview payloads are purged; uncommitted previews expire after 24 hours. Schedule `npm run conference:purge-previews` at least daily after migration to remove expired private payloads even when no new uploads occur.

Validation: `npm run check:conference`; `npm run check:conference:db` uses an isolated temporary database in the local `ffdgn-mysql` Docker container. Add `-- --api --browser --worker-bundle` to the latter after a production build to test the real APIs, a localhost SMTP capture server, account-free RSVP in headless Chrome/Edge on port 3119 and the packaged standalone worker. It never migrates the database in `DATABASE_URL` or sends real guest mail. See [the integration proposal](docs/CONFERENCE_MODULE_INTEGRATION.md) and [implementation status](docs/CONFERENCE_IMPLEMENTATION.md).

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
- News, events, committees, partnerships, homepage structure, member profiles, and site navigation
  have audited admin workflows. `/admin/content/pages` edits About, Governance, Privacy and
  Accessibility copy; public page rendering remains escaped plain text.
- The Knowledge editor accepts PDF uploads up to 25 MB. PDFs are signature-checked and stored
  outside `public/` at `.data/documents`; `/api/v1/documents/:slug/download` enforces publication,
  visibility and `documents.view` before streaming. Mount `.data/documents` on durable shared
  storage in production or replace the filesystem adapter before deploying multiple instances.
- Member portal workspaces support event registration, committee-scoped discussions and replies,
  notifications, committee meetings/minutes, and recommendation drafts/submission/review. These
  records are private to signed-in accounts and committee membership is checked server-side.
- `scripts/smoke-media.ps1` — 13-assertion media verification incl. upload RBAC (all passing).
- `/login` sign-in page; header shows session state (sign in → name/role → sign out).
- `/portal` greets the signed-in user; `/admin` shows live MySQL counts + audit excerpt.

## Security posture
- Passwords: bcrypt cost 12, never logged; 6-char minimum; current-password required for changes.
- Sessions: JWT, 8h max age; the jwt callback re-reads the account on every token read, so
  deactivation and password changes revoke live sessions immediately rather than within the hour.
- Auth: per-email+IP rate limits, account lockout, login audit entries, generic error messages (no enumeration).
- Authorization: `proxy.ts` (route) + `requirePermission()` (operation) — client checks are cosmetic only.
- Private surfaces: `noindex` headers + robots disallow + session gate.
- Rate limiting: sliding window in Redis (`REDIS_URL`), sliding not fixed so a caller cannot
  spend the full quota twice across a window boundary. Fails **open** if Redis is unreachable,
  because account lockout lives in MySQL and survives; `RATE_LIMIT_FAIL_CLOSED=true` inverts that.
  Redis reconnects indefinitely, so a brief blip cannot retire throttling for the life of the
  process. `/api/healthz` PINGs Redis rather than reporting a cached flag: `degraded` + HTTP 200
  when Redis is unreachable (the instance still serves traffic, so an orchestrator should not
  restart it), HTTP 503 only when the database is down or Redis is unconfigured in production.
- Audit log: append-only, enforced by MySQL grants rather than convention (`npm run db:harden`).
- CSP: per-request nonce, `script-src` has no `'unsafe-inline'`; see `proxy.ts`.
- Restricted records return a real HTTP 404, not a 200 wrapping a 404 body. Do not reintroduce a
  streaming root `loading.tsx` — it flushes a 200 before `notFound()` runs.

## Verification
- `npm run check` — typecheck, `eslint .`, production build.
- `scripts/smoke-test.ts <base-url>` (`npm run smoke -- <base-url>`) — 32 assertions against
  a running server (auth boundaries, slug non-enumeration, contact round trip, rate limiting,
  page status codes). Run against `next start`, not dev.
- `scripts/cleanup-smoke-data.ts` — removes smoke-test contacts afterwards.
- `scripts/check-rate-limit.ts` (`npm run check:ratelimit`) — exercises both limiter backends,
  including that the window actually slides and that a second store handle sees the first
  instance's hits. Set `REDIS_URL` to cover the distributed path.
- `scripts/harden-db.ts` — the MySQL grant hardening, also runnable as `npm run db:harden`.
- `scripts/check-csp-browser.ts <base-url> [path]` (`npm run check:csp`) — drives headless
  Chrome over the DevTools Protocol and asserts the page actually hydrates with **no** CSP
  violation. `curl -I` cannot catch the failure that matters: a nonce that never reaches a
  script leaves the page returning 200 with its server HTML while React is dead. It also
  includes a liveness control (a cross-origin fetch that `connect-src 'self'` must block),
  so "no violations" cannot pass by having no listener attached. No npm dependencies.

## Before production deployment
1. `NEXTAUTH_SECRET` (≥32 random chars), all passwords, MySQL credentials — rotate everything.
2. `REDIS_URL` — rate limits are per-instance without it. `/api/healthz` reports `degraded`
   in production while it is unset. `docker compose up -d redis` provides one locally.
3. `npm run db:harden` — needs `HARDEN_DB_ADMIN_PASSWORD`. Drops GRANT OPTION and anything
   outside the app schema, and omits UPDATE/DELETE on `audit_log` so the trail is truly
   append-only. `--revert` restores the wide grant.
4. TLS everywhere; `NEXTAUTH_URL` = canonical https origin; secure cookies are automatic on https.
5. Add 2FA for privileged roles (roadmap) and MySQL backups + point-in-time recovery.
6. Seed content (`npx prisma migrate deploy && npm run db:seed`); the six development
   accounts are skipped automatically outside development. Create real accounts via
   `POST /api/v1/users` as the first super_admin.

## Structure
- `app/` — public website, `/login`, `/portal`, `/admin`, `/api/v1`, `/api/auth/[...nextauth]`
- `components/` — chrome + `auth-button.tsx` (session-aware) + `providers.tsx`
- `lib/` — `db.ts` (Prisma singleton), `auth.ts` (RBAC source of truth), `auth-options.ts`,
  `server-auth.ts`, `rate-limit.ts`, `search.ts`, `data.ts` (seed baseline + preview fallback)
- `prisma/` — `schema.prisma`, `seed.ts`, `migrations/`, legacy `schema.sql` reference
