# Recruiter scheduler

The shareable entry point is `/calendar`; `/calendar/manage` accepts a meeting
access code or the private admin credential.

## User flow

1. A visitor chooses a date, then a 30-minute time in a centered modal in their persisted local timezone,
   then supplies their name and email. Company, opportunity, notes, and video
   preferences are optional. Video is the default; phone/location details are
   required only for those meeting types. A secure random 16-character management
   code is generated automatically, with copy/save controls after submission.
2. The time is reserved as a request. The confirmation screen and email make it
   clear that John still needs to check his real calendar.
3. John opens the admin view. Pending requests are first, above collapsed
   availability settings. He enters an HTTPS video link inside the approval
   dialog, or declines with an optional explanation and a choose-another-time action.
4. Approval sends an iTIP `REQUEST` calendar invitation to both attendees.
   Cancellation sends `CANCEL` using the same UID and a higher sequence.
5. The visitor can use the access code to view, edit, reschedule, cancel, or
   permanently delete the request and stored details.

Pending and confirmed bookings retain their existing slot when editing, even
after availability changes. Confirmed rescheduling explicitly warns that the old
invitation will be cancelled and the new time requires approval. Browser Back from
review returns to editing; drafts are kept in tab-scoped session storage for up
to 24 hours and cleared on success. Returning email links preselect the booking,
including after admin sign-in, but still require a management code (they are not
passwordless sign-in links). Idempotent submission retries require current,
unexpired booking or admin access; logout and code reset also revoke retry access.
Changing the email on a confirmed meeting cancels the old attendee's invitation
and sends an updated invitation to the new attendee. An address-only correction
keeps John's existing meeting confirmed; moving the meeting still needs approval.

Default availability is Monday–Friday, 9 AM–5 PM Hawaii time, 60 days ahead.
Date-specific hours, closures, and timezones are supported. Existing meetings
retain their UTC instants when availability changes. Requests less than 24 hours
away require an explicit short-notice acknowledgment.

## Accessibility and privacy

- Calendar cells show compact “Open”/unavailable states. Selecting a date opens
  a scrollable time-choice modal; “Choose a different date,” Escape, or the close
  button returns to the calendar with focus restored. Next available opens the
  earliest open date. Availability is indexed once per timezone/data change so
  repeated date selections do not reformat the full horizon. Past,
  closed, and fully booked dates are visibly muted and non-selectable.
  Arrow-key navigation, visible focus, 44px controls, responsive layouts,
  and light/dark themes are supported.
- Loading states reuse the landing-page avatar. Calendar/access checks have a
  centered loader, time/availability/email-status checks use a smaller centered
  loader, and sending/saving actions use compact avatars inside their buttons.
  Each has a descriptive screen-reader status; reduced-motion preferences stop
  the rotation. The same shared component replaces the landing-page loading ring.
- Public responses omit names, email addresses, notes, booking IDs, and access
  credentials. Direct browser access to scheduler collections is denied.
- Access codes are normalized, stored only as secret-key HMAC lookup values, and
  never returned in booking responses or calendar files. The initial and reset
  emails include the code so the visitor can retain it.
- Access grants expire after 30 minutes. A timed-out edit can be re-authenticated
  in a second tab without clearing the original form.
- Recruiters may permanently delete their own booking after cancelling an active
  meeting. The API enforces this, not only the interface. Booking details, codes,
  sessions, submission records, and notification history are removed immediately.
  Outstanding final cancellation/decline email records remain temporarily so
  deletion cannot suppress delivery. They are removed after delivery succeeds or
  all three attempts fail. Daily cleanup removes leftovers once their 24-hour
  deadline has passed; this can occur at the next daily run, not precisely at
  the 24-hour mark. The deletion dialog explains this exception.
  Otherwise, booking, credential, and outbox data is automatically purged 90 days
  after the meeting.
- Incorrect unlock guesses are limited to five per IP in 15 minutes; successful
  sign-ins do not consume that budget. Lockouts show the actual remaining wait.
  Booking creation is
  limited to 20 per IP/hour; other public calls have a coarse rate limit.

## Firebase structure

The React app calls one App-Check-protected Firebase callable function. Anonymous
Firebase Authentication identifies the browser; a private expiring grant applies
booking or admin permissions. Firestore transactions reserve both access codes
and meeting times, so concurrent conflicts fail safely.

| Collection          | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `scheduler/state`   | Active time reservations and date overrides     |
| `schedulerBookings` | Private request details and credential version  |
| `schedulerPins`     | Unique HMAC access-code reservations            |
| `schedulerSessions` | Expiring browser access grants                  |
| `schedulerRequests` | Idempotent creation records                     |
| `schedulerLimits`   | Request counters                                |
| `schedulerMail`     | Private notification outbox and delivery status |

`sendSchedulerMail` delivers through authenticated SMTP, with a delivery lease,
deterministic message IDs, and three attempts. `purgeExpiredSchedulerData` runs
daily and removes data whose retention date has passed.

## Local development

Use Node 22. Install frontend dependencies and Functions dependencies, then use
three terminals:

```sh
npm run start:mail-inbox
npm run start:emulators
npm run start:scheduler
```

The ignored `functions/.secret.local` contains:

```dotenv
SCHEDULER_ADMIN_PIN=<private admin credential>
SCHEDULER_PIN_LOOKUP_SECRET=<stable random secret, at least 32 bytes>
SCHEDULER_SMTP_PASSWORD=emulator-only
```

Checks:

```sh
npm test -- --runInBand
npm run test:functions
npm run test:scheduler-ui
npm run verify:scheduler
npm run build
```

The integration harness is hardcoded to `demo-scheduler` and cleans its own
records.

## Production configuration

- `jpakjr-37793` uses the Blaze plan. Anonymous Authentication is enabled, with
  automatic cleanup of anonymous accounts older than 30 days.
- The web app is registered with Firebase App Check using Google Cloud Fraud
  Defense (reCAPTCHA Enterprise). The production site key is kept in the ignored
  `.env.production.local` file and is restricted to the Firebase Hosting domains
  and `jpakjr.com`.
- `SCHEDULER_ADMIN_PIN`, the stable `SCHEDULER_PIN_LOOKUP_SECRET`, and the Gmail
  app password are stored in Secret Manager. The admin credential is also saved
  in the local macOS Keychain under `jpakjr Scheduler Admin Access Code` for
  `jpakjr101@gmail.com`.
- The ignored `functions/.env.jpakjr-37793` targets Gmail SMTP from
  `jpcollandra@gmail.com` and the Firebase Hosting URL.
- John's notification recipient, reply-to address, and calendar organizer use
  `jpcollandra@gmail.com`. Gmail app-password grouping spaces are removed before
  SMTP authentication. The password must be generated under that same account.
- Firestore rules, all three scheduler functions, and Hosting were deployed on
  September 30, 2026. A user-authorized production test created a request and
  reserved its slot. After correcting the sender account to
  `jpcollandra@gmail.com`, both request notifications were sent successfully by
  the deployed mail function. Production approval/invitation verification still
  requires an actual video meeting link for this test request; see
  `scheduler-verification.md` for the current evidence.

```sh
npm run build
firebase deploy --project jpakjr-37793 --only functions,firestore:rules,hosting
```
