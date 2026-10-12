# Conference email templates and SMTP

11 October 2026. Invitation/email/RSVP phase; not deployed. No real guest emails have been sent during development.

## Operator workflow

The same worker also sends staff password setup emails. In **Conference guest desk → Event settings**, choose **Invite a guest-desk staff member**. Staff create their own password from the one-use link, then sign in to their assigned guest desk. Apply the additional `20261012030000_conference_staff_invitations` migration before running this worker version. No additional mailbox or SMTP settings are needed. See [staff invitation setup](CONFERENCE_STAFF_ACCOUNTS.md).

1. Enable guest management for the event in `/admin/events/operations`.
2. Upload and commit the already-invited guest list. Importing does not email anyone.
3. Select the intended guests and choose **Issue and queue QR emails**. Each recipient gets an inline QR, downloadable PNG, printable invitation PDF and a personalized RSVP link.
4. Run the email worker and watch the email state. **SMTP accepted** means the configured mail server accepted the message, not that it reached the recipient's inbox.
5. Guests keep their emailed QR or open the RSVP link to accept/decline. No account or form-based registration is required. The QR is available with Pending RSVP.

Issue skips existing invitations. Resend retains the current QR/link and does not duplicate work already queued/sending. Regenerate replaces both credentials, cancels pending work for the old version and queues a replacement. Revoke immediately invalidates the QR/link and guest sessions and cancels pending jobs. Previously downloaded images cannot be erased, and an email already submitted to SMTP cannot be unsent; gate validation rejects revoked credentials.

Registration, RSVP and mail delivery are separate facts. Declining RSVP does not cancel the registration or silently invalidate the QR. The gate screen shows RSVP for review; acceptance is only required when a manager explicitly enables that policy. Regeneration preserves the latest RSVP and any original admission.

## Runtime configuration

Configure privately in cPanel; do not paste mailbox passwords into source files or chat.

### Brevo SMTP (configured 12 October 2026)

The conference worker now uses the existing `MAIL_*` settings when `CONFERENCE_SMTP_HOST` is blank. Your private environment files already contain the Brevo host and SMTP credentials; they were not copied into source or previews. Use `MAIL_MAILER=smtp`, `MAIL_HOST=smtp-relay.brevo.com`, `MAIL_PORT=587`, `MAIL_USERNAME` for the Brevo SMTP login, `MAIL_PASSWORD` for the SMTP key, `MAIL_FROM_ADDRESS` for the authorized sender and `MAIL_FROM_NAME` for its display name. Port 587 requires STARTTLS with certificate verification; port 465 uses implicit TLS. `MAIL_ENCRYPTION=tls` describes the 587 setup; transport encryption is enforced from the port and cannot be disabled by that variable. Brevo API keys are not SMTP keys. See [Brevo SMTP instructions](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP).

A populated `CONFERENCE_SMTP_HOST` selects the complete conference override family. Missing override credentials cause a configuration error instead of borrowing `MAIL_*` credentials. Blank override host selects the complete `MAIL_*` family.

Check configuration without sending mail: `npx tsx scripts/check-conference-smtp.ts --production --verify`. This uses Next.js production environment loading, including local overrides when present. The configured relay's connection, STARTTLS and authentication were verified without sending any message. SMTP verification does not prove sender-domain authorization or inbox delivery. Before release, use the production deployment's private environment settings and verify the sender in Brevo.

### Professional templates

Staff setup emails and guest QR emails share a green-and-gold institutional header, responsive table layout, clear action button, preheader, plain-text alternative and privacy footer. Staff invitations include event/duty details, account email, simple setup steps and the actual one-use link expiry in Africa/Lagos time. Guest invitations include the embedded QR and existing downloadable attachments.

Review synthetic [staff invitation](email-previews/staff-invitation.html) and [guest invitation](email-previews/guest-invitation.html) previews. Their example links and QR do not grant access. Regenerate with `npx tsx scripts/check-conference-email-templates.ts --previews`. Browser checks passed at 900, 390 and 320 pixels; rendering in actual Outlook/Gmail/mobile mail clients remains to be checked. Restart the application and existing supervised conference email worker after configuration/code changes. SMTP credentials being configured does not start the worker.

| Variable | Value |
| --- | --- |
| `CONFERENCE_MODULE_ENABLED` | `true` after all four conference migrations are applied |
| `CONFERENCE_CREDENTIAL_KEY` | 32 random bytes encoded as base64, stable and backed up independently of MySQL |
| `NEXTAUTH_URL` | Canonical HTTPS application origin; also used to build the guest RSVP link |
| `CONFERENCE_SMTP_HOST` | Exact certificate-valid hostname supplied by your cPanel mail provider |
| `CONFERENCE_SMTP_PORT` | Usually `465` for implicit TLS or `587` for STARTTLS |
| `CONFERENCE_SMTP_USER` | Existing mailbox username, often its full email address |
| `CONFERENCE_SMTP_PASSWORD` | Mailbox password or provider-issued application password |
| `CONFERENCE_SMTP_FROM` | Authorized sender email address, e.g. the Secretariat mailbox |
| `DATABASE_URL` | Same MySQL database as the web application |

Generate the key locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"` and store its output privately. It encrypts credential envelopes in MySQL and authenticates guest sessions. Never derive it from a password or reuse the database password. This release uses one key: replacing it without reissuing invitations prevents QR rendering/resend and invalidates guest sessions. Back up the key securely with the database recovery procedure. Automated multi-key rotation is future work.

TLS certificate verification stays enabled. Non-465 ports require STARTTLS. The development-only `CONFERENCE_SMTP_ALLOW_LOCAL_PLAINTEXT=true` is restricted to localhost and ignored in production; it is used by isolated SMTP tests, not cPanel deployment.

Host credentials and worker configuration have not been supplied or verified. Confirm the mail provider's authorized From address, sending quotas and domain authentication, and send a controlled test to an explicitly approved address before a guest mailing.

## Worker deployment

`npm run build` builds the web application and bundles `conference-email-worker.cjs` beside `.next/standalone/server.js`. The worker includes SMTP/QR/PDF code; it reuses the standalone Prisma client and `@next/env`. The deployed package must contain its worker, linked license file, Linux Prisma engine and `public/assets/fonts/NotoSans-Regular.ttf` plus its OFL license. Existing archive assembly copies standalone files and public assets; generate a new release rather than reusing the 3 October ZIP.

For the existing Windows-to-cPanel cross-build, run `npm run deploy:prepare-linux` after dependency installation and before `npm run build`. npm can prune the Linux sharp/libvips optional packages on Windows. The preparation command restores the versions pinned in package-lock.json, verifies their archive SHA-512 integrity and confines extraction to their node_modules directories. It does not change the lockfile or database. An ordinary Linux installation already supplies its native packages.

Run from the application root with the same runtime environment as the web application:

```sh
node conference-email-worker.cjs
```

Prefer a supervised, continuously running worker. If the host only permits scheduled jobs, invoke the bounded command:

```sh
node conference-email-worker.cjs --once
```

It processes up to 20 currently available jobs and exits when the queue is empty. Choose scheduling frequency against cPanel limits and acceptable guest-mailing delay. Cron processes do not necessarily inherit Application Manager variables: provision their environment privately. Do not put passwords on the command line or in public web storage. This release does not install a host supervisor or cron schedule.

For development/source checkouts, use `npm run conference:email-worker` or `npm run conference:email-worker -- --once`. Neither runs automatically in a web request. Multiple workers claim separate rows using MySQL 8 `FOR UPDATE SKIP LOCKED` and bounded leases.

## Reliability and states

- Queued: durable database job exists; it has not been accepted by SMTP.
- Processing: worker holds a two-minute lease and records an attempt.
- Accepted: SMTP acknowledged the recipient/message; no inbox-delivery claim.
- Failed: permanent rejection/configuration/rendering issue or retry limit reached; correct the cause and deliberately resend.
- Uncertain: connection may have failed after submission, or a worker died with an expired lease. Review before resend because a duplicate email is possible.
- Cancelled: credentials were superseded/revoked/expired, registration was cancelled, or event operations were disabled.

Known transient pre-submission errors or explicit SMTP 4xx rejections retry up to three attempts with backoff. Unknown post-submission failures do not retry automatically. A deterministic Message-ID correlates attempts; it is not an exactly-once delivery guarantee. Jobs and attempt history persist in MySQL; Redis persistence is not required for this queue.

Credentials and mail work share one transaction with staff audit records and an idempotent dispatch result. A replayed request key returns the original result; conflicting reuse is rejected. Guest response changes have an append-only RSVP history; repeat identical responses do not add duplicate history rows. Reapply database hardening after migrations so new tables get appropriate grants and `conference_rsvp_actions` stays append-only.

## Guest privacy and routes

Email links use `/invite#<rsvp-token>`. The fragment never reaches HTTP request/access logs. The page removes it from the address bar, exchanges it through a same-origin POST and receives a one-hour encrypted HttpOnly session cookie, bounded by invitation expiry. Cookie scope is `/api/v1/conference/guest`; HTTPS sets Secure. Every guest request rechecks generation, revocation, registration status, event setting and expiry.

QR and RSVP tokens are independent random 256-bit capabilities. QR content is the opaque entry token only: no name, email, category or predictable identifier. Stored lookup hashes are SHA-256; recoverable tokens live only in authenticated encrypted envelopes. Staff JSON responses exclude those envelopes/tokens. Guest pages/assets/APIs use private no-store, noindex and no-referrer, with the existing nonce CSP and no external trackers.

New APIs:

- `GET/POST /api/v1/conference/events/:eventId/invitations`: readiness/job metadata and bulk lifecycle actions, with a UUID Idempotency-Key and up to 100 registrations per request.
- `POST /api/v1/conference/guest/token-exchange`.
- `GET /api/v1/conference/guest/invitation`.
- `GET /api/v1/conference/guest/qr` (`?download=1` for attachment).
- `GET /api/v1/conference/guest/pdf`.
- `POST /api/v1/conference/guest/rsvp` with Accepted/Declined.

The one-hour browser session can be reopened from the original email while the invitation remains active. One guest invitation is active per browser cookie at a time. Admission scanning and a printable badge PDF are covered in [gate setup](CONFERENCE_GATE_SETUP.md). Contact edits, companion management, custom invitation template editing, delivery/bounce webhooks and physical printing integration remain subsequent phases.

Implementation references: [Nodemailer SMTP](https://nodemailer.com/smtp), [embedded email images](https://nodemailer.com/message/embedded-images), [node-qrcode](https://github.com/soldair/node-qrcode), [PDF-LIB](https://pdf-lib.js.org/docs/api/classes/pdfdocument), and the bundled [Noto font license](../public/assets/fonts/OFL.txt).
