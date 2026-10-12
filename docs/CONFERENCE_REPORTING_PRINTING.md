# Attendance reporting and browser badge printing

11 October 2026. Implemented in source; not deployed. The printer model, workstation OS and badge stock have not been supplied. Browser printing uses the current 100 × 140 mm badge. No physical printing, silent print agent or printer acknowledgement has been validated.

## Attendance reports

From Conference operations, select the event and **Attendance report**. Institutional administrators and event-assigned Managers, RegistrationOfficers and ReportingOfficers can view/export the report. Event assignments and the conference module flag are checked server-side. Reports remain available when an event's operations setting is disabled, so staff can review its history.

The summary covers the whole event and refreshes every 15 seconds while the tab is visible. Filters affect the paginated directory and CSV, not the event summary. Failed refreshes retain the old data with an alert and its last update timestamp.

- Active registrations exclude cancelled registrations. Active admitted is the number of current registrations with a first admission. Not yet admitted is active minus active admitted. Attendance percentage uses active admitted / active registrations; it is zero when there are no active registrations.
- Historical admissions include guests whose registrations were subsequently cancelled. Cancellation never erases admission history.
- RSVP totals cover active registrations. Categories show total registrations, active registrations and active admitted guests.
- Printing totals count requests by current state, including reprints. Distinct guests with a confirmed badge is a separate count. Confirmation means an operator explicitly stated they collected a printed badge; it is not device telemetry. PDF downloads are excluded.
- Directory filters: all registrations, historical admissions, not yet admitted or cancelled; optional category and name/email search. Each page has up to 25 rows. Timestamps display in Africa/Lagos.

**Export matching CSV** exports all matching rows, not just the visible page. Exports are capped at 10,000 registrations; narrower filters are required above that limit. Rows are read within one consistent database snapshot. UTF-8 CSV includes both UTC and Lagos admission times, method/operator and print-state counts. CSV cells are quoted and spreadsheet formula prefixes are neutralized. QR/RSVP credentials, encrypted envelopes and manual admission reasons are not exported. The export audit records event/filter/count, not the guest payload or search text. Files contain guest contact information; keep downloaded exports in the installation's approved private storage.

## Printing at the gate

1. Register the walk-in or find the imported guest in Conference operations. A current registration in an enabled event can prepare a QR tag before admission. Tags can also be prepared from gate check-in. See [walk-in and dignitary setup](CONFERENCE_WALKIN_SETUP.md).
2. Select **Prepare browser print**. A durable request and immutable badge snapshot are recorded. Retrying the same request key cannot create another badge request. If a request already exists for this registration, reopen it or provide a 10–500 character reason for an additional badge.
3. Select **Open badge print page**. This opens a separate authenticated page showing the badge without console navigation. Normal registration staff can open/finalize only their own requests; event managers and institutional administrators can manage the event's requests.
4. Select **Open print dialog**. The request is revalidated before opening the browser dialog. Select the installed local printer, 100%/actual size, the right stock and no browser headers/footers. Check the preview; CSS requests 100 × 140 mm but device and driver settings still need a rehearsal.
5. After collecting and checking the badge, select **I collected the printed badge**. If nothing printed, select **Cancel print request**. Closing the dialog, cancelling it, generating a PDF or receiving an `afterprint` event never confirms a physical print automatically.

Prepared requests survive page reloads and can be reopened from gate history. Confirmed/Cancelled requests are final; repeated identical finalization is safe, conflicting transitions are rejected. A reprint requires a new request/reason. Every transition is append-only and shares a transaction with its audit record. A cancelled registration cannot be confirmed as printed. Offline requests are not queued.

Confirmed snapshots remain viewable to authorized staff while their registration and credential remain eligible. Browser menus, previously downloaded files and screenshots cannot be prevented from printing again; this workflow records requests and operator statements. New tags contain the existing entry QR, so phone and tag scans use the same registration. Legacy snapshots contain an admission reference. Printable PDF downloads continue to work and remain audited separately.

Browser printing opens the current document's print dialog through [`window.print()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/print). An [`afterprint` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/afterprint_event) can follow the closing of print preview, so it is not used as evidence of completion. [`@page size`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@page/size) defines the requested paper dimensions.

## Deployment and API

Back up the database and apply all five conference migrations before activating this release. `20261011160000_conference_printing` adds print requests and append-only transition history; `20261011180000_conference_walkins` permits nullable attendee email. They preserve existing admissions, RSVP and invitations. Reapply the installation's established database hardening procedure after migration: `conference_badge_print_actions` must not receive UPDATE/DELETE grants. Local console setup has now backed up and migrated the existing local development database and enabled the module. The production database and deployment archive remain unchanged.

The standalone cPanel release still includes the PDF font/license, Prisma Linux engines and bundled SMTP worker. No local print service needs to run for browser printing; the browser uses the workstation's installed printer driver. A future printer-specific agent requires the actual device, workstation and stock selection.

API routes under `/api/v1/conference/events/{eventId}`:

- `GET /reports` returns event summary, category counts and filtered/pageable attendance directory. Parameters: `attendance`, `category`, `q`, `page`.
- `POST /reports` with the same filters returns the private audited CSV. Requires trusted application origin and the event's view capability.
- `POST /prints` with `{ action: "prepare", registrationId, reason? }` and UUID `Idempotency-Key` prepares a request. The request fingerprint includes its actor; conflicting key reuse returns 409.
- `GET /prints?id=...` returns the current request's snapshot/state after gate/ownership/eligibility checks. `GET /prints?registrationId=...` lists the latest ten visible requests for that registration.
- `POST /prints` with `{ action: "finish", id, state: "Confirmed" | "Cancelled" }` finalizes a request with append-only history/audit. Print mutations use the separate gate rate limit and trusted-origin check.

Pages: `/admin/events/reports?event=...` and `/admin/events/print?event=...&id=...`. These and their APIs are private/no-store. Reports may include cancelled/disabled-event history; printing requires enabled operations and an active registration.

## Verification and next steps

The isolated suite (`npm run check:conference:db -- --api --browser --worker-bundle`) checks report counts/filtering, cross-event role isolation, CSV safety/audit, print snapshots, idempotency, ownership, transactional audit rollback, concurrent confirmations and final states. Browser checks invoke a substituted print dialog, generate a real browser PDF at the CSS paper size and confirm collection through the real API. They do not send a job to a physical printer.

Next: choose and rehearse the printer/workstation/stock, configure the real cPanel SMTP worker, validate a staging release and deployment/rollback, and rehearse the guest import → email → RSVP → admission → badge workflow on the intended gate devices. Re-entry, checkout and operational exception approvals remain later work.

The browser guest tag and emailed guest-tag PDF now share the measured drawing commands in lib/conference/badge.ts. The print preview uses vector artwork with the same text fitting, logo, category, QR placement and 100 � 140 mm dimensions. The formal conference invitation remains a separate document. Previously delivered attachments are unchanged.
