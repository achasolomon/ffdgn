# Deployment report

Final archive: C:\Users\HP USER\fdgn\ffdgn-deploy.zip — 55,527,460 bytes
(52.96 MiB). Archive verification confirmed top-level server.js, hidden .next/static,
required Linux native dependencies, and no environment files or excluded video.

Next.js 16.3.8, App Router, npm/package-lock.json, Prisma 5.22, MySQL and NextAuth 4.
Clean npm ci succeeded; npm reported zero vulnerabilities. Production build (including
TypeScript) and ESLint passed under locally downloaded, checksum-verified Node 22.23.3.
Existing standalone output and Prisma Linux binary targets were preserved.
Application API requests were already relative; no unused API base variable or Edge
runtime required removal.

## Files changed or created for this task

- next.config.js: preserve configuration; explicitly trace Linux Prisma/sharp assets;
  exclude environment files, deployment tools and private storage from tracing.
- package.json, package-lock.json: add sharp as a direct dependency.
- lib/upload-dir.ts: configurable persistent UPLOAD_DIR, default /home/ffdgnorg/uploads.
- lib/media-upload.ts: store/delete media in UPLOAD_DIR and avoid broad filesystem tracing.
- lib/document-storage.ts: private PDF storage in UPLOAD_DIR/documents.
- lib/media-path.ts: prevent dynamic path checks from tracing unrelated project files.
- app/uploads/[...path]/route.ts: serve existing upload URLs with MIME validation,
  byte ranges and path validation; private documents remain inaccessible here.
- .env.production: public site URL only; excluded from the archive.
- .gitignore: ignore local build environment, download/cache and tool directories.
- eslint.config.mjs, tsconfig.json: exclude local deployment tools/cache from checks.
- deploy/ENV_VARIABLES.md: variable inventory and cPanel/database/storage instructions.
- deploy/schema.sql: full Prisma-generated SQL schema for an empty MySQL database.
- deploy/assemble.ps1: assemble and validate hidden files, Linux binaries and zip root;
  exclude public/assets/videos/ by removing only the standalone deployment copy.
- deploy/smoke.mjs, deploy/SMOKE_RESULTS.json: reproducible standalone smoke checks and results.
- deploy/REPORT.md: this report.
- Generated artifacts: .next/, node_modules/, framework-generated next-env.d.ts,
  project-local deploy/tools and deploy/.npm-cache, and replacement ffdgn-deploy.zip.

## Validation and manual setup

The standalone Node 22 server returned homepage 200, auth providers API 200 and image
optimizer 200. External upload serving returned 200; byte ranges returned 206 and
invalid ranges returned 416. A private document path returned 404. Health returned
expected 503/degraded with MySQL and Redis deliberately unavailable. Port 3100 was
occupied, so the smoke test used 3101. The smoke-test server was stopped.

Create the cPanel MySQL database/user and import populated-db.sql into an empty database
INSTEAD OF schema.sql. Set runtime variables in Application
Manager, select Node 22 and server.js, create writable external upload storage and
migrate existing uploads/documents. Full instructions are in ENV_VARIABLES.md.

No deployment or git commit was performed. Windows and Linux sharp packages coexist;
Windows sharp loading and image optimization were verified. Actual Linux native
execution, Passenger integration, production database connectivity and authenticated
CMS writes could not be tested locally. The archive targets Linux x64/glibc and
OpenSSL 3. Missing Redis produces degraded health in production. The excluded video
must be hosted separately if its URL is used. The final inspection found the source
public/assets/videos directory empty; this packaging script only deletes the
standalone copy, and does not delete source video files.

## Populated Docker database export

deploy/populated-db.sql contains schema and data exported read-only from ffdgn-mysql:
188,848 bytes, 36 tables, 30 tables with data, including _prisma_migrations. It does
not create or select the local database name, so phpMyAdmin can import it into the
cPanel database you select. The export used a consistent transaction and UTF-8 byte
streaming to avoid PowerShell encoding corruption. No database rows were changed.
Import/restore on cPanel has not been verified.

Added deploy/dump-db.mjs for repeatable export and deploy/DB_EXPORT_RESULTS.json for
non-sensitive metadata; updated .gitignore to exclude the private populated SQL backup
and ENV_VARIABLES.md to use it. The application zip is unchanged and contains no dump.
This backup includes account hashes and private records: transfer it securely and
review local development accounts before production use. Media/PDF files still require
their separate transfer; no seeding is necessary for records already in this dump.
