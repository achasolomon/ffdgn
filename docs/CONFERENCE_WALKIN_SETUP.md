# Walk-in registration and dignitary QR tags

Open **Conference guest desk**, select the event and open guest registration in **Event settings**. Institutional administrators and event-assigned Managers/RegistrationOfficers can operate the desk and gate. See the [staff guide](CONFERENCE_STAFF_GUIDE.md) for the current task menu.

## Walk-in desk

1. Use **Register a new guest**. Enter full name, category and the available organization, job title, phone and email. Email is optional; no guest account is created.
2. Select **Save guest & create tag**, then **Print guest tag**.
3. Open the print dialog, select the installed printer and 100 × 140 mm stock, actual size/100%, without browser headers or footers. Confirm collection only after a usable tag has physically printed.
4. Give the tag to the guest. The gate officer scans its QR, checks the displayed identity and confirms admission.

Registration records accepted attendance intent (with RSVP history) so walk-ins can enter when accepted RSVP is required. Registration and printing do not count as gate attendance. Only gate admission does. When an email address is provided, registration also queues a guest-tag and conference-information email in the same transaction. It contains the identical entry QR, printable guest-tag PDF, QR image and conference dates/venue. No additional RSVP is requested. The existing SMTP worker sends it independently of printing. Without an email, registration and printing still work normally; missing SMTP settings do not block either operation.

Retries use the same registration, print request and email job. A failed print preparation can be recovered by retrying unchanged form details without sending a duplicate email. Each no-email guest has a separate identity; names are not used to merge people. If an email already has a registration, find its existing record and print that tag rather than creating another registration. Printing or reprinting alone does not queue another email; use the guest list's invitation controls if a resend is needed.

## Imported dignitaries

Upload the approved CSV and use **Send invitations** in the guest list. On arrival, use **Find a guest & print a tag**, select **Print tag** beside the dignitary, and create/open the tag. The existing phone QR and printed tag QR are identical and work at the same gate. Printing does not replace the invitation, send another email, or admit the guest.

A tag can also be prepared before the first email is issued. Issuing the email afterward queues that same credential. Expired/revoked credentials must be explicitly regenerated. Regeneration invalidates old phone/tag QR codes and old print requests; prepare a replacement tag with a reprint reason. Duplicate gate confirmations retain the original admission.

## Installation

Apply `20261011180000_conference_walkins` after the previous four conference migrations, and regenerate Prisma before running the updated application. The migration makes attendee email nullable without altering existing addresses or their unique index. No new tables are required. Maintain the existing module encryption key and SMTP settings. Production migration/deployment remains separate from local development setup.

New print snapshots contain the credential ID/version, not a plaintext QR token. Staff-only reads render the QR from the encrypted invitation and reject cancelled registrations, expired/revoked/replaced credentials, or unauthorized operators. Legacy admission-only snapshots remain readable.

Printer stock, driver scaling and scan readability must be rehearsed with the actual event devices. Browser dialog closure does not prove physical printing.
