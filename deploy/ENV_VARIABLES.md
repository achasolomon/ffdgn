# Environment variables

Never upload environment files. Set runtime values in cPanel Application Manager.
Only NEXT_PUBLIC_SITE_URL is included in the local .env.production build input.

| Variable | Used by | Phase | Placeholder/example |
| --- | --- | --- | --- |
| NEXT_PUBLIC_SITE_URL | app/layout.tsx, app/robots.ts, app/sitemap.ts | BUILD-TIME | https://ffdgn.org.ng |
| NODE_ENV | lib/db.ts, proxy.ts, app/api/healthz/route.ts, prisma/seed.ts; Next.js | RUNTIME (also build mode) | production |
| DATABASE_URL | prisma/schema.prisma; lib/db.ts; prisma/seed.ts; scripts/sync-assets.ts, scripts/harden-db.ts | RUNTIME; local database tools | mysql://CPANEL_USER:URL_ENCODED_PASSWORD@localhost:3306/CPANEL_DATABASE |
| NEXTAUTH_SECRET | proxy.ts; NextAuth library | RUNTIME, required | REPLACE_WITH_RANDOM_SECRET_AT_LEAST_32_BYTES |
| NEXTAUTH_URL | NextAuth library | RUNTIME, required | https://ffdgn.org.ng |
| SESSION_MAX_AGE | lib/auth-options.ts | RUNTIME | 28800 |
| REDIS_URL | lib/rate-limit.ts; scripts/check-rate-limit.ts | RUNTIME | redis://:URL_ENCODED_PASSWORD@REDIS_HOST:6379/0 |
| RATE_LIMIT_FAIL_CLOSED | lib/rate-limit.ts | RUNTIME | false |
| UPLOAD_DIR | lib/upload-dir.ts via lib/media-upload.ts and lib/document-storage.ts | RUNTIME | /home/ffdgnorg/uploads |
| PORT | generated standalone/server.js; Next.js | RUNTIME, hosting supplied | 3100 (local smoke test) |
| HOSTNAME | generated standalone/server.js; Next.js | RUNTIME | 0.0.0.0 |
| KEEP_ALIVE_TIMEOUT | generated standalone/server.js | RUNTIME, optional | 5000 |
| NEXT_TELEMETRY_DISABLED | Next.js build tooling; deploy/smoke.mjs | Tooling | 1 |
| SMOKE_PORT | deploy/smoke.mjs | Local testing only | 3101 |
| ALLOW_DEV_ACCOUNTS | prisma/seed.ts | Database tooling only | false |
| HARDEN_DB_USER | scripts/harden-db.ts | Database tooling only | CPANEL_USER |
| HARDEN_DB_ADMIN_USER | scripts/harden-db.ts | Database tooling only | DATABASE_ADMIN_USER |
| HARDEN_DB_ADMIN_PASSWORD | scripts/harden-db.ts | Database tooling only, secret | REPLACE_WITH_ADMIN_PASSWORD |

NEXTAUTH_URL is an authentication callback origin, not an API base URL.
NEXT_PUBLIC_SITE_URL is required for absolute canonical and sitemap URLs.
Local smoke/check scripts use a command-line base URL to contact a running server;
application API calls already use relative /api paths.

## cPanel setup

1. Create a MySQL database and user, grant privileges, and import deploy/populated-db.sql
   into the empty database using phpMyAdmin. This Docker export contains both structure
   and existing content, accounts and Prisma migration history. Import it INSTEAD OF
   schema.sql. If you already imported schema.sql, use a fresh empty database or remove
   only those newly created empty tables before importing. Do not overwrite a database
   containing production changes. schema.sql remains an optional schema-only alternative.
2. Extract ffdgn-deploy.zip directly into the Application Manager application root.
   Select Node.js 22, production mode, domain https://ffdgn.org.ng, and server.js as startup file.
   No server-side npm install or build is required. The archive targets Linux x64/glibc
   with OpenSSL 3 (Debian or RHEL family); other architectures need a new package.
3. Configure runtime values above, especially DATABASE_URL, NEXTAUTH_SECRET,
   NEXTAUTH_URL, NODE_ENV and UPLOAD_DIR. Set HOSTNAME=0.0.0.0 if your host requires it.
   Allow Passenger to supply its listening port; do not force local test port 3100.
4. Create UPLOAD_DIR outside the application root with write access for the app user.
   Move existing public/uploads/YYYY/MM files into UPLOAD_DIR/YYYY/MM, preserving names.
   Move existing .data/documents files into UPLOAD_DIR/documents. Private PDFs continue
   to use their authorized download routes; never expose the documents directory publicly.
   Back up this directory independently of application releases.
5. Arrange a Redis service if available. Without REDIS_URL the app retains in-memory
   rate limiting but /api/healthz reports 503/degraded in production. Verify the host's
   Passenger integration supports the generated Next.js HTTP server and its proxy headers.
6. The populated dump preserves local account password hashes and CMS edits; no manual
   re-entry or seeding is needed for exported records. Review imported accounts before
   exposing production: local development accounts may be present. Do not enable
   development-account seeding in production. Uploaded files are separate from SQL and
   still need the transfer described above. Keep populated-db.sql private; import it
   through phpMyAdmin, then remove any server-side backup copy. Never put it in public
   web storage or the application zip. schema.sql alone has no data or migration history.

The Linux sharp packages are included alongside the Windows packages to preserve local
development. A local Windows smoke test cannot prove Linux native modules or Passenger
behavior; verify images, login, uploads, database access and health after activation.

The deployment archive excludes public/assets/videos/ at your request. Any URL
referencing that file needs separately hosted video content. For local upload
development, set UPLOAD_DIR to a writable absolute path.
