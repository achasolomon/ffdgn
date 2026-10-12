# Guest-desk-only staff accounts

Passwords require at least six characters, including during staff setup and later password changes. Staff setup retains the bcrypt limit of 72 UTF-8 bytes. This length rule does not change bcrypt's hashing cost of 12.

An institutional administrator opens **Conference guest desk → Event settings → Invite a staff member**. Enter the staff member's name, email and duty, then select **Create account & send setup link**.

The configured SMTP worker emails a private password setup link. Staff open it on their phone, create and confirm their own password, then sign in with their email. Sign-in goes straight to the guest desk. Links expire after 72 hours and work once. Event settings shows setup email status; **Send a new setup link** invalidates the previous link and queues a replacement for staff who have not yet created their password. Existing accounts are never overwritten. Each person should use their own account so registrations, entry checks and printing are attributed to the correct staff member.

If SMTP is not configured or the worker is stopped, the invitation remains queued. Configure the variables in [SMTP setup](CONFERENCE_EMAIL_SETUP.md) and run the existing conference email worker. “Email sent” means accepted by SMTP, rather than confirmed inbox delivery. This workflow has been tested using a local mail capture server; real inbox delivery still needs validation.

Password setup, sign-in, guest-desk tasks and the staff account screen fit phone displays. Gate scanning uses the phone camera when permissions are granted and the site is served over HTTPS. Registration, printing and check-in require a network connection. Printing from a phone also requires a compatible printer or a connected printing workstation.

| Duty | Available functions |
| --- | --- |
| Registration, tags and gate check-in | Register walk-ins, upload/find guests, send invitations, print tags, gate check-in and attendance viewing |
| Gate check-in and tags only | Scan/verify guests, confirm entry and print tags at the gate; no guest-list editing, invitations, reports or settings |
| View attendance only | View/search the guest list and attendance reports; download attendance; no registration, printing, gate entry or settings |
| Manage this event's guest desk | All guest-desk tasks and event settings; cannot create accounts or grant staff access |

All newly created accounts use the dedicated `guest_desk` institutional role. It grants no website, membership, document, media, audit, user-management or member-portal permissions. Event assignments determine the functions available and the events listed. Sign-in goes directly to the guest desk; the sidebar contains only that area. **My account** allows the person to change their own password, and **Sign out** ends their session.

Administrators use **Add an existing staff account or change their duty** to assign the same person to another event, change duties, or choose **Remove access to this event**. Removing the assignment prevents further operations for that event immediately. Existing institutional staff keep their wider account permissions when assigned; this does not convert them into restricted accounts. Super administrators can deactivate the whole account from the existing account-management console.

## Installation and enforcement

Apply `20261011200000_conference_staff_accounts` and then the seventh conference migration, `20261012030000_conference_staff_invitations`, after the previous five migrations and regenerate Prisma. The invitation migration creates a separate durable staff setup queue; it does not change existing passwords or accounts. Back up first and reapply database grants to the new table. Production packaging, migration and deployment remain separate from local setup.

Account creation requires a Super/Secretariat administrator, trusted origin, rate limit and UUID request key. User creation, event assignment, invitation queue, audit and retry result commit together. A pending account receives an unknown random password hash until setup succeeds. Setup checks account activity, restricted role, assignment and token expiry; token consumption, bcrypt cost-12 password update and audit commit together. Concurrent submissions cannot reuse a token. Only its hash and an authenticated encrypted envelope are stored; links are not returned in API responses or audits. The browser removes the fragment immediately, and setup responses disable caching/referrers. The envelope is cleared after setup. Resend retries are idempotent and an in-progress send cannot be replaced.

The proxy limits pages/APIs and redirects broader console/portal requests to the guest desk; API denials return 403. The server also checks the current database role, activity/password epoch and event assignment on each authenticated request. Protected/API proxy matchers include extension-ending paths to ensure their path headers cannot be supplied by a client to bypass restrictions. Module capability checks still apply independently of the limited navigation.
