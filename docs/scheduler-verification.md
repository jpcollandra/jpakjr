# Scheduler verification

Verified September 30, 2026 against the disposable `demo-scheduler` Firebase
emulators. No test bookings or email left the local environment.

## Automated checks

- Scheduler frontend checks: 44 tests passed, including the existing date/calendar
  tests plus rendered booking, calendar, recovery, and copy/save controls. Coverage
  includes pending note-only edits, draft restoration/Back, generated codes,
  optional fields, confirmed-reschedule warnings, focused field errors,
  persisted/synchronized timezones, international date rollover, past-week
  compaction, actual CANCEL downloads, direct contact-form links, and avatar
  loading/saving/sending feedback with success and error recovery, repeated and
  same-date modal selection, timezone regrouping, focus trapping/restoration,
  Escape dismissal, unavailable dates, and a full-horizon performance regression.
  PR-review regression tests additionally cover admin email targets through
  sign-in, missing-target fallback, active-deletion protection, and the temporary
  final-notification retention explanation.
- Functions callback/domain/notification tests: 22 tests passed. Coverage includes default and custom
  availability, timezone changes, short-notice/conflict handling, access-code
  validation, optional video details, HTTPS approval validation, private response
  fields, role-specific email actions/local dates/decline explanations, and
  REQUEST/CANCEL calendar invitations. Actual callbacks are exercised against
  isolated Firestore/SMTP fakes for authorized retries, expiry/logout/code-reset
  replay rejection, email-only and combined time/email corrections, active
  deletion rejection, cancellation after deletion, deletion during an active
  SMTP lease, retry exhaustion, duplicate triggers, and detached-email cleanup.
- Emulator integration passed concurrent access-code and time conflicts,
  ownership and admin boundaries, public-data sanitization, Firestore rules,
  pending note-only edits and atomic approval with a video link, timezone preservation, stale-update rejection, cancellation,
  access-code reset/session revocation, recruiter deletion, code reuse,
  idempotent retries, access expiry, failed-guess-only sign-in limiting, typed
  email history with timestamps, decline explanations, and email recipients.
  The integration harness was re-run after the PR-review fixes and additionally
  passed attendee email corrections, revoked/expired create replay rejection,
  active-deletion rejection, and final cancellation/decline delivery and record
  cleanup after booking deletion. All SMTP traffic went to the local test inbox.
- `npx tsc --noEmit`, `node --check functions/index.js`, the optimized React
  production build, and `git diff --check` passed.

## Flow decisions

- A visitor submits a request; the selected time is held but not described as
  confirmed. John must approve it after checking his real calendar.
- Only approval sends a REQUEST calendar invitation. Video preferences are
  optional; the real HTTPS meeting URL is supplied in the approval dialog.
- Declining or cancelling releases the time. A recruiter may reschedule or
  permanently delete their booking and associated stored email history. An active
  booking must be cancelled before deletion. Outstanding final notification
  records are kept only to finish delivery, then removed; daily cleanup removes
  leftovers after their 24-hour deadline.
- Calendar cells use compact Open/unavailable states, with a time-choice modal
  and a Next available shortcut. Fully past weeks are hidden; adjacent month
  cells identify the month. Unavailable dates are muted and non-selectable.
  Keyboard arrow navigation and visible focus remain supported.
- New requests use automatically generated 16-character codes with 80 bits of
  randomness. Existing case-insensitive 8–16 character codes still work. The initial
  email contains the code, reset invalidates old sessions, and timed-out edits
  provide a re-authentication path that preserves the draft in the original tab.
- Booking data is scheduled for automatic deletion 90 days after the meeting;
  direct deletion is available sooner.

## Manual verification of these UX changes (local only)

A disposable “UX Revision Test” booking exercised the calendar → minimal video
form → review → Browser Back → submit flow using Asia/Tokyo. October 2 in the
visitor’s calendar/form/review correctly corresponded to October 1 in Hawaii.
Its pending note-only update retained the same instant. Existing local admin
login was used to add the video URL inside approval, confirm, request a new time
after the explicit cancellation/reapproval warning, decline with an explanation,
recover through Choose another time, reapprove, and cancel. Cancellation showed
Download cancellation; permanent deletion was secondary under privacy controls.
Incorrect-code feedback appeared beside the field and focused it.

All 18 lifecycle messages reached sent with timestamps and were captured in the
local SMTP inbox (not transmitted externally). The cancelled synthetic booking,
pin reservations, outbox, and related demo data were removed after verification;
captured local test emails remain as QA evidence. Mobile testing at 390×844 found
no horizontal overflow and verified compact calendar cells/times below the date.

Follow-up checks verified that scheduler help links open and focus
`/contact#contact-form`, including direct reloads. The shared landing-avatar loader
rotates continuously during loading, is centered in the calendar card, and fits
the 390×844 mobile landing view without horizontal overflow. Emulated
reduced-motion preferences stopped the rotation while retaining the status text.
Temporary browser viewport, motion, and slow-connection overrides were restored.
Loader form/action tests used mocked calls; no new messages or production data
were created for those checks.

The follow-up date-switching fix removed repeated formatting of the complete
availability horizon for every date cell. In a local Node comparison with 976
slots and 42 cells, the old pass performed 40,992 conversions and took 2,284 ms;
building the new index took 13 ms, and its date-cell lookups took under 1 ms.
This is an algorithm check, not a whole-page/browser performance measurement.
Manual browser checks opened October 2, switched to October 3, and reopened
October 3 after Escape without hanging. Selecting October 3 at 4 AM in Tokyo correctly opened the October 2
Hawaii booking route with the same instant. At 390×844 the modal had no horizontal
overflow, and the different-date action remained visible. No request was
submitted; the temporary viewport was restored.

These UX changes have not been deployed. Production status below describes the
earlier release; production bookings and SMTP configuration were untouched.

## Production status

Production was deployed to `https://jpakjr-37793.web.app` on September 30, 2026. Firestore rules and the `schedulerApi`, `sendSchedulerMail`, and
`purgeExpiredSchedulerData` Node.js 22 functions are active in `us-central1`.
Anonymous Authentication and 30-day anonymous-account cleanup are enabled.
Firebase App Check is registered with a domain-restricted Fraud Defense key, and
the optimized Hosting build contains the matching Enterprise provider.

The deploy-time test suite, TypeScript check, and optimized build all passed.
The live Hosting endpoint returned HTTP 200, the homepage exposed the global
“Schedule a meeting” control, and the callable endpoint correctly rejected a
request without Authentication/App Check credentials as unauthenticated.
A real production request was submitted with the user's approval for October 5,
2026, 9:00–9:30 AM HST (3:00–3:30 PM EDT), labeled “Production scheduler
verification.” Record creation, the reserved slot, and the recruiter management
view succeeded. Initial request notifications failed because Gmail rejected SMTP
authentication with `535 BadCredentials`. The app password was valid for
`jpcollandra@gmail.com`, while the SMTP user was configured as
`jpakjr101@gmail.com`. Direct authentication succeeded after using the matching
account and removing Google's password grouping spaces.

The API, mail function, and Hosting were redeployed with `jpcollandra@gmail.com`
as sender, John notification recipient, reply-to, contact address, and calendar
organizer. The two exhausted request notifications were retried with distinct,
deterministic outbox IDs; both reached `sent` on attempt 1 through the production
Firestore trigger. John's notification was sent to `jpcollandra@gmail.com` and
the test recruiter receipt to its original `jpakjr101@gmail.com` address. The
original failed records remain as delivery history. A `sent` status means SMTP
accepted the message; inbox placement was not independently inspected.

The test request remains awaiting approval. Production calendar-invitation
verification requires an actual video meeting URL. The address-change tests
(5 frontend and 6 backend tests), optimized build, syntax checks, and diff checks
passed.

The request, approval, invitation, reschedule, cancellation, deletion, expiry, and
rate-limit flows passed against the Firebase emulators.
