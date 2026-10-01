const crypto = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret, defineString } = require("firebase-functions/params");
const nodemailer = require("nodemailer");
const { DateTime } = require("luxon");
const D = require("./domain");
const { notification } = require("./notifications");

initializeApp();
const db = getFirestore();
const adminPin = defineSecret("SCHEDULER_ADMIN_PIN");
const lookupSecret = defineSecret("SCHEDULER_PIN_LOOKUP_SECRET");
const smtpPassword = defineSecret("SCHEDULER_SMTP_PASSWORD");
const smtpHost = defineString("SCHEDULER_SMTP_HOST", { default: "" });
const smtpPort = defineString("SCHEDULER_SMTP_PORT", { default: "587" });
const smtpUser = defineString("SCHEDULER_SMTP_USER", { default: "" });
const smtpFrom = defineString("SCHEDULER_SMTP_FROM", {
  default: D.ADMIN_EMAIL,
});
const siteUrl = defineString("SCHEDULER_SITE_URL", {
  default: "https://jpakjr-37793.web.app",
});
const stateRef = db.doc("scheduler/state");
const bookingRef = (id) => db.collection("schedulerBookings").doc(id);
const grantRef = (uid) => db.collection("schedulerSessions").doc(uid);
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const pinKey = (pin) =>
  crypto
    .createHmac("sha256", lookupSecret.value())
    .update(String(pin).toUpperCase())
    .digest("hex");
const equal = (a, b) =>
  crypto.timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
const error = (code, message, details) => {
  throw new HttpsError(code, message, details);
};
const requireAdmin = (session) => {
  if (session?.role !== "admin")
    error("permission-denied", "This action requires admin access.");
};
const SESSION_MS = 30 * 60 * 1000;

function stateFrom(snapshot) {
  return snapshot.exists
    ? { ...D.DEFAULT_STATE, ...snapshot.data() }
    : { events: [], overrides: {}, version: 0 };
}
function prunedState(state) {
  const now = Date.now();
  const oldest = DateTime.fromMillis(now, { zone: D.BASE_ZONE })
    .minus({ days: 2 })
    .toISODate();
  return {
    ...state,
    events: state.events.filter((event) => event.endMs > now - 2 * D.DAY_MS),
    overrides: Object.fromEntries(
      Object.entries(state.overrides).filter(([date]) => date >= oldest),
    ),
    version: state.version + 1,
  };
}
function ownGrant(booking) {
  return {
    role: "recruiter",
    bookingId: booking.id,
    credentialVersion: booking.credentialVersion,
    expiresAt: Date.now() + SESSION_MS,
  };
}

async function rateLimit(request, action) {
  const peer = request.rawRequest.ip || "unknown";
  const policy = action === "create" ? [20, 60 * 60000] : [300, 15 * 60000];
  const key = hash(`${peer}:${action === "create" ? "create" : "general"}`);
  const ref = db.collection("schedulerLimits").doc(key);
  // Public reads can arrive together from several open calendars. Their coarse
  // request budget uses an atomic counter without serializing every page load.
  // Access-code attempts and booking creation retain strict transactional limits.
  if (action !== "create") {
    const now = Date.now();
    const current = (await ref.get()).data();
    if (current?.expiresAt > now && current.count >= policy[0])
      error("resource-exhausted", "Too many requests. Please try again later.");
    if (current?.expiresAt > now)
      await ref.update({ count: FieldValue.increment(1) });
    else await ref.set({ count: 1, expiresAt: now + policy[1] });
    return;
  }
  await db.runTransaction(
    async (tx) => {
      const snapshot = await tx.get(ref);
      const now = Date.now();
      const previous = snapshot.data();
      const current =
        previous && previous.expiresAt > now
          ? previous
          : { count: 0, expiresAt: now + policy[1] };
      if (current.count >= policy[0])
        error(
          "resource-exhausted",
          "Too many requests. Please try again later.",
        );
      tx.set(ref, { count: current.count + 1, expiresAt: current.expiresAt });
    },
    { maxAttempts: 10 },
  );
}

async function readSession(uid) {
  const snapshot = await grantRef(uid).get();
  const session = snapshot.data();
  if (!session || session.expiresAt <= Date.now()) return null;
  if (session.role === "admin") return session;
  const booking = (await bookingRef(session.bookingId).get()).data();
  return booking && booking.credentialVersion === session.credentialVersion
    ? session
    : null;
}
async function sessionInTransaction(tx, uid, id) {
  const [grant, snapshot] = await Promise.all([
    tx.get(grantRef(uid)),
    tx.get(bookingRef(id)),
  ]);
  const session = grant.data();
  const booking = snapshot.data();
  if (!session || session.expiresAt <= Date.now())
    error(
      "unauthenticated",
      "Your access has expired. Please enter your access code again.",
    );
  if (!booking) error("not-found", "This meeting is no longer available.");
  if (
    session.role !== "admin" &&
    (session.bookingId !== id ||
      session.credentialVersion !== booking.credentialVersion)
  )
    error(
      "permission-denied",
      "You can only manage your own meeting. Please enter its access code.",
    );
  return { session, booking };
}

function queueMail(
  tx,
  booking,
  event,
  calendarZone,
  accessCode,
  audiences = ["visitor", "admin"],
) {
  const includeInvite = ["confirmed", "updated", "cancelled"].includes(event);
  [booking.email, D.ADMIN_EMAIL].forEach((email, index) => {
    const audience = index === 1 ? "admin" : "visitor";
    if (!audiences.includes(audience)) return;
    tx.create(
      db
        .collection("schedulerMail")
        .doc(`${booking.id}-${booking.version}-${event}-${index}`),
      {
        bookingId: booking.id,
        to: email,
        ...notification(
          booking,
          event,
          audience,
          siteUrl.value(),
          accessCode,
        ),
        event,
        audience,
        invite: includeInvite ? D.calendarInvite(booking) : null,
        status: "queued",
        attempts: 0,
        createdAt: Date.now(),
      },
    );
  });
}

async function handle(request) {
  if (!request.auth?.uid)
    error("unauthenticated", "Please refresh the page and try again.");
  const uid = request.auth.uid;
  const input = request.data;
  if (
    !input ||
    typeof input.action !== "string" ||
    JSON.stringify(input).length > 12000
  )
    error("invalid-argument", "Please submit a valid scheduler request.");
  const { action, ...data } = input;
  await rateLimit(request, action);

  if (action === "calendar" || action === "day") {
    const state = stateFrom(await stateRef.get());
    if (action === "day") return D.dayAvailability(state, data.date);
    if (!D.isDate(data.startDate) || !D.isDate(data.endDate))
      error("invalid-argument", "Choose a valid calendar month.");
    const start = DateTime.fromISO(data.startDate);
    const count = DateTime.fromISO(data.endDate).diff(start, "days").days;
    if (count < 0 || count > 41)
      error("invalid-argument", "Choose one calendar month at a time.");
    return {
      today: D.dateKey(),
      days: Array.from({ length: count + 1 }, (_, i) =>
        D.dayAvailability(state, start.plus({ days: i }).toISODate()),
      ),
    };
  }
  if (action === "unlock") {
    const limitRef = db
      .collection("schedulerLimits")
      .doc(hash(`${request.rawRequest.ip || "unknown"}:unlock-failed`));
    const result = await db.runTransaction(
      async (tx) => {
        const now = Date.now();
        const previous = (await tx.get(limitRef)).data();
        const budget =
          previous?.expiresAt > now
            ? previous
            : { count: 0, expiresAt: now + 15 * 60000 };
        if (budget.count >= 5) return { lockedUntil: budget.expiresAt };
        const isAdmin =
          typeof data.pin === "string" &&
          data.pin.length <= 100 &&
          equal(data.pin, adminPin.value());
        let code;
        try {
          code = D.validatePin(data.pin);
        } catch {
          /* Malformed guesses count as failures too. */
        }
        const ref =
          code && !isAdmin
            ? db.collection("schedulerPins").doc(pinKey(code))
            : null;
        const reservation = ref ? (await tx.get(ref)).data() : null;
        const booking = reservation?.active
          ? (await tx.get(bookingRef(reservation.bookingId))).data()
          : null;
        if (isAdmin) {
          tx.set(grantRef(uid), { role: "admin", expiresAt: now + SESSION_MS });
          return { role: "admin" };
        }
        if (booking && booking.currentPinKey === ref.id) {
          tx.set(grantRef(uid), ownGrant(booking));
          return { role: "recruiter", booking: D.publicBooking(booking) };
        }
        // Return, rather than throw, so the failed-attempt counter is committed.
        tx.set(limitRef, { ...budget, count: budget.count + 1 });
        return budget.count + 1 >= 5
          ? { lockedUntil: budget.expiresAt }
          : { failed: true };
      },
      { maxAttempts: 10 },
    );
    if (result.lockedUntil) {
      const seconds = Math.max(
        1,
        Math.ceil((result.lockedUntil - Date.now()) / 1000),
      );
      error(
        "resource-exhausted",
        `Too many incorrect codes. Try again in ${Math.floor(seconds / 60)}m ${seconds % 60}s.`,
        { retryAfterSeconds: seconds, retryAt: result.lockedUntil },
      );
    }
    if (result.failed)
      error(
        "permission-denied",
        "That management code didn’t match. Check the code in your email and try again.",
      );
    return result;
  }
  if (action === "logout") {
    await grantRef(uid).delete();
    return { ok: true };
  }
  if (action === "session") {
    const session = await readSession(uid);
    if (!session) return { role: null };
    if (session.role === "admin") return { role: "admin" };
    return {
      role: "recruiter",
      booking: D.publicBooking(
        (await bookingRef(session.bookingId).get()).data(),
      ),
    };
  }

  if (action === "create") {
    const details = D.validateDetails(data.details);
    const viewerTimeZone = D.validateTimeZone(data.timeZone || D.BASE_ZONE);
    const accessCode = D.validatePin(data.pin);
    const key = pinKey(accessCode);
    if (
      typeof data.requestId !== "string" ||
      !/^[a-zA-Z0-9-]{10,100}$/.test(data.requestId)
    )
      error("invalid-argument", "Refresh the form before submitting.");
    const ref = db.collection("schedulerBookings").doc();
    const reservationRef = db.collection("schedulerPins").doc(key);
    const requestRef = db
      .collection("schedulerRequests")
      .doc(hash(`${uid}:${data.requestId}`));
    return db.runTransaction(async (tx) => {
      const [stateSnapshot, reservation, previous, grantSnapshot] =
        await Promise.all([
          tx.get(stateRef),
          tx.get(reservationRef),
          tx.get(requestRef),
          tx.get(grantRef(uid)),
        ]);
      if (previous.exists) {
        // An idempotency key identifies a submission, not an access credential.
        // Replays must respect logout, expiry, and management-code revocation.
        const { booking } = await sessionInTransaction(
          tx,
          uid,
          previous.data().bookingId,
        );
        return { booking: D.publicBooking(booking) };
      }
      if (reservation.exists)
        error(
          "already-exists",
          "That access code is already in use. Please choose a different code.",
        );
      const state = stateFrom(stateSnapshot);
      const slot = D.validateSlot(
        state,
        data.date,
        data.startMs,
        data.shortNoticeAcknowledged,
      );
      const now = Date.now();
      const booking = {
        ...details,
        id: ref.id,
        date: data.date,
        startMs: slot.startMs,
        endMs: slot.endMs,
        originalTimeZone: slot.timeZone,
        viewerTimeZone,
        shortNotice: slot.shortNotice,
        status: "requested",
        version: 1,
        credentialVersion: 1,
        pinKeys: [key],
        currentPinKey: key,
        createdAt: now,
        updatedAt: now,
        retentionDeleteAt: slot.endMs + 90 * D.DAY_MS,
      };
      const next = prunedState(state);
      next.events.push({
        id: booking.id,
        startMs: booking.startMs,
        endMs: booking.endMs,
        shortNotice: booking.shortNotice,
      });
      tx.set(stateRef, next);
      tx.create(ref, booking);
      tx.create(reservationRef, { bookingId: booking.id, active: true });
      tx.create(requestRef, { bookingId: booking.id, createdAt: now });
      const grant = grantSnapshot.data();
      if (!(grant?.role === "admin" && grant.expiresAt > now))
        tx.set(grantRef(uid), ownGrant(booking));
      queueMail(tx, booking, "requested", slot.timeZone, accessCode);
      return { booking: D.publicBooking(booking) };
    });
  }

  if (action === "list") {
    requireAdmin(await readSession(uid));
    const snapshots = await db
      .collection("schedulerBookings")
      .orderBy("startMs", "asc")
      .get();
    return {
      bookings: snapshots.docs.map((doc) => D.publicBooking(doc.data())),
    };
  }
  if (action === "mailStatus") {
    const session = await readSession(uid);
    if (!session || (session.role !== "admin" && session.bookingId !== data.id))
      error(
        "permission-denied",
        "Enter your meeting access code to view notifications.",
      );
    const snapshots = await db
      .collection("schedulerMail")
      .where("bookingId", "==", data.id)
      .get();
    return {
      messages: snapshots.docs.map((doc) => ({
        id: doc.id,
        event: doc.data().event || "updated",
        status: doc.data().status,
        createdAt: doc.data().createdAt,
        sentAt: doc.data().sentAt || null,
        recipient:
          doc.data().audience === "admin" || doc.data().to === D.ADMIN_EMAIL
            ? "John"
            : "Visitor",
      })),
    };
  }
  if (action === "availability" || action === "clearAvailability") {
    return db.runTransaction(async (tx) => {
      const [stateSnapshot, grant] = await Promise.all([
        tx.get(stateRef),
        tx.get(grantRef(uid)),
      ]);
      const session = grant.data();
      if (!session || session.expiresAt <= Date.now())
        error(
          "unauthenticated",
          "Your access has expired. Please enter your access code again.",
        );
      requireAdmin(session);
      const state = stateFrom(stateSnapshot);
      if (action === "clearAvailability") {
        if (!D.isDate(data.date))
          error("invalid-argument", "Choose a valid date.");
        delete state.overrides[data.date];
      } else state.overrides[data.date] = D.validateOverride(data);
      tx.set(stateRef, prunedState(state));
      return { ok: true };
    });
  }
  if (
    ["update", "cancel", "delete", "resetPin", "approve", "decline"].includes(
      action,
    )
  ) {
    if (typeof data.id !== "string" || !/^[a-zA-Z0-9]{1,100}$/.test(data.id))
      error("invalid-argument", "Choose a valid meeting.");
    const relatedToDelete =
      action === "delete"
        ? await Promise.all([
            db
              .collection("schedulerMail")
              .where("bookingId", "==", data.id)
              .get(),
            db
              .collection("schedulerSessions")
              .where("bookingId", "==", data.id)
              .get(),
            db
              .collection("schedulerRequests")
              .where("bookingId", "==", data.id)
              .get(),
          ])
        : null;
    return db.runTransaction(async (tx) => {
      const { session, booking } = await sessionInTransaction(tx, uid, data.id);
      const state = stateFrom(await tx.get(stateRef));
      if (data.version !== booking.version)
        error(
          "failed-precondition",
          "This meeting changed in another window. Refresh it before making changes.",
        );
      if (["resetPin", "approve", "decline"].includes(action))
        requireAdmin(session);
      const now = Date.now();
      if (action === "resetPin") {
        const accessCode = D.validatePin(data.pin);
        const key = pinKey(accessCode);
        const reservationRef = db.collection("schedulerPins").doc(key);
        const reservation = await tx.get(reservationRef);
        if (reservation.exists && reservation.data().bookingId !== booking.id)
          error(
            "already-exists",
            "That access code is already in use. Please choose a different code.",
          );
        for (const oldKey of booking.pinKeys)
          tx.set(db.collection("schedulerPins").doc(oldKey), {
            bookingId: booking.id,
            active: false,
          });
        tx.set(reservationRef, { bookingId: booking.id, active: true });
        const updated = {
          ...booking,
          pinKeys: [...new Set([...booking.pinKeys, key])],
          currentPinKey: key,
          credentialVersion: booking.credentialVersion + 1,
          version: booking.version + 1,
          updatedAt: now,
        };
        tx.set(bookingRef(booking.id), updated);
        queueMail(
          tx,
          updated,
          "access-updated",
          D.scheduleFor(state, booking.date).timeZone,
          accessCode,
        );
        return { booking: D.publicBooking(updated) };
      }
      const next = prunedState(state);
      next.events = next.events.filter((event) => event.id !== booking.id);
      if (action === "approve") {
        if (booking.status !== "requested")
          error(
            "failed-precondition",
            "Only pending requests can be approved.",
          );
        if (booking.startMs <= now)
          error(
            "failed-precondition",
            "This time has passed. Ask the visitor to choose another time.",
          );
        const details = D.validateDetails(
          { ...booking, contact: data.contact ?? booking.contact },
          true,
        );
        const updated = {
          ...booking,
          ...details,
          declineReason: "",
          status: "confirmed",
          version: booking.version + 1,
          updatedAt: now,
        };
        next.events.push({
          id: booking.id,
          startMs: booking.startMs,
          endMs: booking.endMs,
          shortNotice: booking.shortNotice,
        });
        tx.set(bookingRef(booking.id), updated);
        tx.set(stateRef, next);
        queueMail(
          tx,
          updated,
          "confirmed",
          D.scheduleFor(state, booking.date).timeZone,
        );
        return { booking: D.publicBooking(updated) };
      }
      if (action === "decline") {
        if (booking.status !== "requested")
          error(
            "failed-precondition",
            "Only pending requests can be declined.",
          );
        const updated = {
          ...booking,
          status: "declined",
          declineReason:
            typeof data.reason === "string"
              ? data.reason.trim().slice(0, 1000)
              : "",
          version: booking.version + 1,
          updatedAt: now,
          retentionDeleteAt: now + 90 * D.DAY_MS,
        };
        tx.set(bookingRef(booking.id), updated);
        tx.set(stateRef, next);
        queueMail(
          tx,
          updated,
          "declined",
          D.scheduleFor(state, booking.date).timeZone,
        );
        return { booking: D.publicBooking(updated) };
      }
      if (action === "delete") {
        if (["requested", "confirmed"].includes(booking.status))
          error(
            "failed-precondition",
            "Cancel this meeting before deleting it so attendees are notified.",
          );
        // Read current delivery state inside the transaction. The mail worker
        // may have claimed or finished these records since the query ran.
        const messages = await Promise.all(
          relatedToDelete[0].docs.map((record) => tx.get(record.ref)),
        );
        let finalNotificationsPending = false;
        for (const key of booking.pinKeys)
          tx.delete(db.collection("schedulerPins").doc(key));
        for (const message of messages) {
          const current = message.data();
          if (
            current &&
            ["cancelled", "request-cancelled", "declined"].includes(
              current.event,
            ) &&
            current.status !== "sent" &&
            current.attempts < 3
          ) {
            // Keep only outstanding final notifications, not booking access or
            // history. Delivery removes them; daily cleanup bounds failures.
            tx.update(message.ref, { deleteAfterDeliveryAt: now + D.DAY_MS });
            finalNotificationsPending = true;
          } else tx.delete(message.ref);
        }
        for (const records of relatedToDelete.slice(1))
          for (const record of records.docs) tx.delete(record.ref);
        tx.delete(bookingRef(booking.id));
        tx.set(stateRef, next);
        return { ok: true, finalNotificationsPending };
      }
      if (action === "cancel") {
        if (booking.status === "cancelled")
          return { booking: D.publicBooking(booking) };
        const updated = {
          ...booking,
          status: "cancelled",
          version: booking.version + 1,
          updatedAt: now,
          retentionDeleteAt: now + 90 * D.DAY_MS,
        };
        tx.set(bookingRef(booking.id), updated);
        tx.set(stateRef, next);
        queueMail(
          tx,
          updated,
          booking.status === "confirmed" ? "cancelled" : "request-cancelled",
          D.scheduleFor(state, booking.date).timeZone,
        );
        return { booking: D.publicBooking(updated) };
      }
      const details = D.validateDetails(data.details);
      const viewerTimeZone = D.validateTimeZone(
        data.timeZone || booking.viewerTimeZone || D.BASE_ZONE,
      );
      const moving =
        booking.startMs !== data.startMs ||
        booking.date !== data.date ||
        booking.status === "cancelled" ||
        booking.status === "declined";
      if (!moving && booking.status === "confirmed")
        D.validateDetails(details, true);
      const slot = moving
        ? D.validateSlot(
            state,
            data.date,
            data.startMs,
            data.shortNoticeAcknowledged,
            now,
            booking.id,
          )
        : {
            startMs: booking.startMs,
            endMs: booking.endMs,
            shortNotice: booking.shortNotice,
            timeZone: booking.originalTimeZone,
          };
      const updated = {
        ...booking,
        ...details,
        viewerTimeZone,
        date: data.date,
        startMs: slot.startMs,
        endMs: slot.endMs,
        originalTimeZone: moving ? slot.timeZone : booking.originalTimeZone,
        shortNotice: slot.shortNotice,
        status: moving ? "requested" : booking.status,
        declineReason: "",
        version: booking.version + 1,
        updatedAt: now,
        retentionDeleteAt: slot.endMs + 90 * D.DAY_MS,
      };
      next.events.push({
        id: booking.id,
        startMs: updated.startMs,
        endMs: updated.endMs,
        shortNotice: updated.shortNotice,
      });
      tx.set(bookingRef(booking.id), updated);
      tx.set(stateRef, next);
      const attendeeChanged = details.email !== booking.email;
      if (booking.status === "confirmed" && (moving || attendeeChanged))
        queueMail(
          tx,
          {
            ...booking,
            status: "cancelled",
            version: updated.version,
            updatedAt: now,
          },
          "cancelled",
          D.scheduleFor(state, booking.date).timeZone,
          undefined,
          // An address-only correction must not cancel John's unchanged event.
          moving ? ["visitor", "admin"] : ["visitor"],
        );
      queueMail(
        tx,
        updated,
        updated.status === "requested" ? "request-updated" : "updated",
        D.scheduleFor(state, updated.date).timeZone,
      );
      return { booking: D.publicBooking(updated) };
    });
  }
  error("invalid-argument", "Choose a supported scheduler action.");
}

exports.schedulerApi = onCall(
  {
    region: "us-central1",
    enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== "true",
    secrets: [adminPin, lookupSecret],
    maxInstances: 5,
  },
  async (request) => {
    try {
      return await handle(request);
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      if (err instanceof D.SchedulerError)
        throw new HttpsError(err.code, err.message);
      // Do not log submitted meeting details or credentials.
      console.error("Scheduler operation failed:", err.code || err.name);
      throw new HttpsError(
        "internal",
        "We could not save that change. Please try again.",
      );
    }
  },
);

exports.sendSchedulerMail = onDocumentCreated(
  {
    document: "schedulerMail/{mailId}",
    region: "us-central1",
    secrets: [smtpPassword],
    retry: true,
    maxInstances: 2,
  },
  async (event) => {
    const ref = event.data.ref;
    const message = await db.runTransaction(async (tx) => {
      const current = (await tx.get(ref)).data();
      if (!current) return null;
      if (
        current.status === "sent" ||
        current.attempts >= 3 ||
        (current.deleteAfterDeliveryAt &&
          current.deleteAfterDeliveryAt <= Date.now())
      ) {
        if (current.deleteAfterDeliveryAt) tx.delete(ref);
        return null;
      }
      if ((current.leaseUntil || 0) > Date.now())
        throw new Error(
          "Email delivery is already in progress; retry after the lease expires.",
        );
      if (!smtpHost.value()) {
        tx.update(ref, { status: "not-configured" });
        return null;
      }
      tx.update(ref, {
        status: "sending",
        attempts: current.attempts + 1,
        leaseUntil: Date.now() + 60000,
      });
      return current;
    });
    if (!message) return;
    try {
      const user = smtpUser.value();
      const transport = nodemailer.createTransport({
        host: smtpHost.value(),
        port: Number(smtpPort.value()),
        secure: smtpPort.value() === "465",
        requireTLS: Boolean(user),
        auth: user
          ? {
              user,
              pass:
                smtpHost.value() === "smtp.gmail.com"
                  ? smtpPassword.value().replace(/\s/g, "")
                  : smtpPassword.value(),
            }
          : undefined,
        connectionTimeout: 10000,
        socketTimeout: 20000,
      });
      await transport.sendMail({
        from: smtpFrom.value(),
        to: message.to,
        replyTo: message.replyTo || D.ADMIN_EMAIL,
        subject: message.subject,
        text: message.text,
        messageId: `<${event.params.mailId}@jpakjr-scheduler>`,
        attachments: message.invite
          ? [
              {
                filename:
                  message.event === "cancelled"
                    ? "meeting-cancellation.ics"
                    : "meeting.ics",
                content: message.invite,
                contentType: `text/calendar; charset=utf-8; method=${message.invite.includes("\r\nMETHOD:CANCEL\r\n") ? "CANCEL" : "REQUEST"}`,
              },
            ]
          : [],
      });
      await finishMailDelivery(ref, true);
    } catch (err) {
      await finishMailDelivery(ref, false);
      throw new Error("Scheduler email delivery failed.");
    }
  },
);

async function finishMailDelivery(ref, delivered) {
  await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data();
    if (!current) return;
    // Deletion may have been requested after this worker acquired its lease.
    if (current.deleteAfterDeliveryAt && (delivered || current.attempts >= 3))
      tx.delete(ref);
    else
      tx.update(ref, {
        status: delivered ? "sent" : "failed",
        ...(delivered ? { sentAt: Date.now() } : {}),
        leaseUntil: 0,
      });
  });
}

exports.purgeExpiredSchedulerData = onSchedule(
  {
    schedule: "every day 03:00",
    timeZone: D.BASE_ZONE,
    region: "us-central1",
    maxInstances: 1,
  },
  async () => {
    const expired = await db
      .collection("schedulerBookings")
      .where("retentionDeleteAt", "<=", Date.now())
      .limit(100)
      .get();
    for (const snapshot of expired.docs) {
      const booking = snapshot.data();
      const mail = await db
        .collection("schedulerMail")
        .where("bookingId", "==", snapshot.id)
        .get();
      const sessions = await db
        .collection("schedulerSessions")
        .where("bookingId", "==", snapshot.id)
        .get();
      const requests = await db
        .collection("schedulerRequests")
        .where("bookingId", "==", snapshot.id)
        .get();
      const batch = db.batch();
      for (const key of booking.pinKeys || [])
        batch.delete(db.collection("schedulerPins").doc(key));
      for (const message of mail.docs) batch.delete(message.ref);
      for (const session of sessions.docs) batch.delete(session.ref);
      for (const request of requests.docs) batch.delete(request.ref);
      batch.delete(snapshot.ref);
      await batch.commit();
    }
    const abandonedNotifications = await db
      .collection("schedulerMail")
      .where("deleteAfterDeliveryAt", "<=", Date.now())
      .limit(100)
      .get();
    if (!abandonedNotifications.empty) {
      const batch = db.batch();
      for (const message of abandonedNotifications.docs)
        batch.delete(message.ref);
      await batch.commit();
    }
  },
);
