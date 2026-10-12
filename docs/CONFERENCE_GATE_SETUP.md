# Conference gate operations

This phase adds online gate verification, first admission and a printable badge to the existing invitation module. It uses the existing MySQL database, staff sessions and event assignments. It does not require a guest account or a completed RSVP unless an event manager explicitly enables that policy.

## Activate and operate

1. Back up the database and apply all pending migrations before deploying the new application. The additive migration `20261011140000_conference_gate` creates `conference_admissions`; it preserves existing registrations and invitations. Follow the existing release process and [SMTP setup](CONFERENCE_EMAIL_SETUP.md). No live migration or deployment was performed during implementation.
2. Enable the conference module and event. Assign existing staff as event Manager or RegistrationOfficer. Institutional super/secretariat administrators retain access. ReportingOfficer can view the directory but cannot use the gate, admit guests or download badges.
3. From **Conference operations**, select the event and **Open gate check-in**. Use HTTPS on the host. Select **Start camera** and grant browser permission, or scan with a keyboard-style QR reader into the QR field. The camera stops when a valid code is decoded or staff stop it, and when the page closes.
4. Review the guest name, organization and category. Select **Confirm admission**. Verification alone does not record admission. An existing admission shows its original timestamp/operator and never offers a second admission.
5. If a guest cannot present their QR, search name/email, verify identity against the approved list and record a manual reason of 10–500 characters. Manual admission still requires a current, active invitation and registration. Missing/expired/revoked invitations must be corrected by authorized registration staff; a reason does not override the block.
6. After admission, download the badge PDF and print at actual size (100 × 140 mm). Badge downloads are audited and repeat downloads are allowed. Downloading is not proof of printing. Browser print requests and explicit operator collection confirmation are now available; see [reporting/printing setup](CONFERENCE_REPORTING_PRINTING.md). No automatic print agent or printer acknowledgement is implemented. Validate stock, dimensions and printer settings before use at the event.

## Camera access

Select **Scan QR with camera** and allow camera access in the browser. On computers with several cameras, select the ordinary HD camera rather than an infrared camera. The scanner offers camera selection and retries with simpler settings or an ordinary camera when the initial camera cannot start.

`localhost` supports camera access. For staff using phones, open the deployed HTTPS website; an HTTP address on the local network does not support live browser scanning. On Windows, check **Settings → Privacy & security → Camera**, including permission for desktop apps, and the site's camera permission in Chrome or Edge. Close video calls or other apps using the camera if it is unavailable.

**Use a QR photo or phone camera** provides a fallback when live scanning cannot start. Images are decoded on the device; only the QR credential is sent for guest verification. Scanning or choosing a photo still requires **Confirm guest entry** to record attendance. The live camera stops after decoding, when staff stop it, when the page is hidden, or when staff leave the page.

## Admission rules

- Pending and declined RSVP do not block admission by default. Managers can explicitly enable **Require accepted RSVP at the gate** in event settings; Pending/Declined then block entry. The public registration setting stays disabled.
- The credential must match the selected event. Only entry QR tokens work; RSVP links cannot be used as entry credentials.
- Disabled events, cancelled registrations and missing, revoked or expired invitations block admission. The server checks the state again when confirming entry.
- The registration is locked in a transaction. A unique admission per registration and transactional audit prevent simultaneous scanners from recording multiple admissions. Failed audit writes roll back admission. A repeat confirmation returns the original admission rather than creating a second one.
- QR regeneration invalidates the old credential but preserves the first admission. Re-entry, checkout and admission reversal are not implemented. There is no offline admission queue: wait for a confirmed server response before letting the guest through.
- Admission rows are append-only; update the existing database grants with `db:harden` after migrating if that is part of the installation's established hardening process. The migration itself does not alter grants.
- Entry QR values travel in POST JSON bodies, never in URLs, response data or audit text. APIs and staff pages use private/no-store responses. Camera permission is enabled only on `/admin/events/gate`, and frames are decoded locally without uploading camera images.
- Gate mutation requests are limited to 240/minute per staff account/IP, independently of guest list maintenance. Other mutation limits remain in place.

## API and persistence

Routes below require staff authentication and the selected event's gate capability. Mutations additionally enforce the configured application origin.

- `GET /api/v1/conference/events/{eventId}/gate?q=...`: name/email lookup, minimum two characters, at most 25 results. Search terms can appear in ordinary server access logs; configure the host's log access/retention appropriately.
- `POST .../gate`: `{ action: "verify", token }` returns a minimal guest/eligibility/admission summary. Verification by registration ID is also available to staff.
- `POST .../gate`: `{ action: "admit", token }` or `{ action: "admit", registrationId, reason }` records first admission or returns `alreadyAdmitted: true` with the original admission. No credentials are returned.
- `POST .../gate/badge`: `{ registrationId }` returns a Unicode PDF for an admitted, current registration with an active QR in an enabled event. Each successful download records `conference.badge.download`, explicitly marking physical printing unconfirmed. The tag includes the current entry QR. For printing before admission, use the guest directory or walk-in registration; see [walk-in setup](CONFERENCE_WALKIN_SETUP.md).

`conference_admissions` records registration, staff ID/name, QR/manual method, manual reason, invitation generation and original timestamp. Actor and registration foreign keys restrict deletion of admission history. Audit actions use `conference.admission` and `conference.badge.download`.

## Validation and remaining work

Run the isolated suite with `npm run check:conference:db -- --api --browser --worker-bundle`. It creates and drops only its own uniquely named temporary database; it never migrates the configured application database. The gate cases cover concurrent entry, audit rollback, roles/origin, RSVP policy, credential rotation/revocation/expiry, cancellation, manual admission, badge dimensions and actual browser camera decoding using a deterministic synthetic video stream.

The browser fixture proves the decoding and admission UI work together; it does not validate a real phone camera, live gate throughput, physical printer or cPanel deployment. Complete a rehearsal on the intended devices and host before the event. Attendance reporting and browser print tracking are now implemented. Subsequent work includes hardware-specific integration/rehearsal, approved exceptions/re-entry workflows and additional event/session access rules.

Successful QR scans open a guest-result modal with the name and category. A verified guest can be checked in directly from the modal; the success message appears only after the server records admission. Existing admissions show Already checked in, and blocked guests show Entry not allowed. Next guest clears the result for the next scan.

Gate actions stay in a sticky toolbar: camera scan/stop, QR photo, guest lookup, handheld scanner, guest details and tag printing. Lookup and guest details use side drawers; entry confirmation and Next guest remain at the top of the details drawer. Unavailable guest actions remain visible with disabled buttons until a guest is selected. Keep this convention for future staff screens: primary task controls must be discoverable without page scrolling.
