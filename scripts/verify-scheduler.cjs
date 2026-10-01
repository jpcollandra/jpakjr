// Integration verification against disposable demo-project emulators only.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const { DateTime } = require("../functions/node_modules/luxon");
const requireFunctions = require("node:module").createRequire(
  require("node:path").resolve(__dirname, "../functions/package.json"),
);
const { initializeApp } = requireFunctions("firebase-admin/app");
const { getFirestore } = requireFunctions("firebase-admin/firestore");
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
initializeApp({ projectId: "demo-scheduler" });
const db = getFirestore();
const endpoint =
  "http://127.0.0.1:5001/demo-scheduler/us-central1/schedulerApi";
async function user() {
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    },
  );
  return response.json();
}
async function call(identity, action, data = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${identity.idToken}`,
    },
    body: JSON.stringify({ data: { action, ...data } }),
  });
  const value = await response.json();
  if (value.error) {
    const error = new Error(value.error.message);
    error.code = value.error.status;
    error.details = value.error.details;
    throw error;
  }
  return value.result;
}
const details = {
  name: "Integration Recruiter",
  email: "integration@example.test",
  company: "Integration Test",
  opportunity: "Engineering",
  meetingType: "video",
  contact: "https://example.test/call",
  notes: "Disposable local verification",
};
async function main() {
  // Clean only this harness's disposable records after an interrupted run.
  const stale = await db
    .collection("schedulerBookings")
    .where("company", "==", "Integration Test")
    .get();
  const staleIds = new Set(stale.docs.map((doc) => doc.id));
  for (const doc of stale.docs) {
    for (const key of doc.data().pinKeys)
      await db.doc(`schedulerPins/${key}`).delete();
    await doc.ref.delete();
  }
  const existingState = await db.doc("scheduler/state").get();
  if (existingState.exists)
    await existingState.ref.update({
      events: existingState
        .data()
        .events.filter((event) => !staleIds.has(event.id)),
    });
  const oldLimits = await db.collection("schedulerLimits").get();
  await Promise.all(oldLimits.docs.map((doc) => doc.ref.delete()));
  const a = await user();
  const b = await user();
  const admin = await user();
  const secret = fs
    .readFileSync("functions/.secret.local", "utf8")
    .split("\n")
    .find((line) => line.startsWith("SCHEDULER_ADMIN_PIN="))
    .slice("SCHEDULER_ADMIN_PIN=".length);
  await call(admin, "unlock", { pin: secret });
  let date = DateTime.now().setZone("Pacific/Honolulu").plus({ days: 5 });
  while (date.weekday > 5) date = date.plus({ days: 1 });
  const key = date.toISODate();
  await call(admin, "clearAvailability", { date: key });
  let day = await call(a, "day", { date: key });
  const payload = (pin, index) => ({
    date: key,
    startMs: day.slots[index].startMs,
    pin,
    details,
    requestId: crypto.randomUUID(),
    shortNoticeAcknowledged: true,
  });
  const pinBase = `Code${5000 + Math.floor(Math.random() * 1000)}`;
  const initialPayloads = [payload(pinBase, 0), payload(pinBase, 1)];
  const samePin = await Promise.allSettled([
    call(a, "create", initialPayloads[0]),
    call(b, "create", initialPayloads[1]),
  ]);
  assert.equal(
    samePin.filter((result) => result.status === "fulfilled").length,
    1,
    "only one concurrent claim of an access code succeeds",
  );
  let first = samePin.find((result) => result.status === "fulfilled").value
    .booking;
  assert.equal(first.status, "requested");
  const owner = samePin[0].status === "fulfilled" ? a : b;
  const ownerPayload =
    initialPayloads[samePin[0].status === "fulfilled" ? 0 : 1];
  const other = owner === a ? b : a;
  console.log("PASS concurrent duplicate access-code rejection");
  day = await call(a, "day", { date: key });
  const free = day.slots.filter((slot) => !slot.busy);
  const collision = await Promise.allSettled([
    call(a, "create", { ...payload("Meet6201", 0), startMs: free[0].startMs }),
    call(b, "create", { ...payload("Meet6202", 0), startMs: free[0].startMs }),
  ]);
  assert.equal(
    collision.filter((result) => result.status === "fulfilled").length,
    1,
    "only one concurrent claim of a time succeeds",
  );
  const second = collision.find((result) => result.status === "fulfilled").value
    .booking;
  console.log("PASS concurrent time collision rejection");
  await call(owner, "unlock", { pin: pinBase });
  await assert.rejects(
    call(other, "update", {
      id: first.id,
      version: first.version,
      date: key,
      startMs: first.startMs,
      details,
    }),
    /own meeting|access has expired/,
  );
  await assert.rejects(
    call(other, "delete", { id: first.id, version: first.version }),
    /own meeting|access has expired/,
  );
  const calendar = await call(a, "calendar", { startDate: key, endDate: key });
  assert.ok(!JSON.stringify(calendar).includes(details.email));
  assert.ok(!JSON.stringify(calendar).includes(first.id));
  assert.equal(first.pinKeys, undefined);
  const privateRead = await fetch(
    `http://127.0.0.1:8080/v1/projects/demo-scheduler/databases/(default)/documents/schedulerBookings/${first.id}`,
    { headers: { Authorization: `Bearer ${owner.idToken}` } },
  );
  assert.equal(privateRead.status, 403);
  console.log(
    "PASS recruiter ownership, admin boundary, public privacy, and Firestore rules",
  );
  first = (
    await call(owner, "update", {
      id: first.id,
      version: first.version,
      date: first.date,
      startMs: first.startMs,
      details: {
        ...details,
        contact: "",
        notes: "Pending note-only correction",
      },
      timeZone: "Asia/Tokyo",
    })
  ).booking;
  assert.equal(first.status, "requested");
  assert.equal(
    first.startMs,
    samePin.find((result) => result.status === "fulfilled").value.booking
      .startMs,
  );
  await assert.rejects(
    call(admin, "approve", { id: first.id, version: first.version }),
    /video/,
  );
  first = (
    await call(admin, "approve", {
      id: first.id,
      version: first.version,
      contact: "https://example.test/approved-call",
    })
  ).booking;
  assert.equal(first.status, "confirmed");
  assert.equal(first.contact, "https://example.test/approved-call");
  console.log("PASS pending note-only editing and atomic video-link approval");
  first = (
    await call(owner, "update", {
      id: first.id,
      version: first.version,
      date: first.date,
      startMs: first.startMs,
      details: { ...first, email: "corrected@example.test" },
    })
  ).booking;
  assert.equal(first.status, "confirmed");
  const correctionMail = await db
    .collection("schedulerMail")
    .where("bookingId", "==", first.id)
    .get();
  const oldAttendeeCancellations = correctionMail.docs.filter(
    (doc) => doc.id.startsWith(`${first.id}-${first.version}-cancelled-`),
  );
  assert.equal(oldAttendeeCancellations.length, 1);
  assert.equal(oldAttendeeCancellations[0].data().to, details.email);
  assert.ok(
    oldAttendeeCancellations[0].data().invite.includes("METHOD:CANCEL"),
  );
  console.log("PASS attendee email correction cancels only the old attendee");
  await call(admin, "availability", {
    date: key,
    timeZone: "America/New_York",
    startTime: "09:00",
    endTime: "17:00",
    closed: false,
  });
  const own = await call(owner, "session");
  assert.equal(own.booking.startMs, first.startMs);
  assert.equal(own.booking.originalTimeZone, "Pacific/Honolulu");
  assert.equal(
    (await call(owner, "day", { date: key })).timeZone,
    "America/New_York",
  );
  console.log("PASS date timezone override preserves existing meetings");
  const rescheduleDay = await call(owner, "day", { date: key });
  const rescheduledStart = rescheduleDay.slots.find(
    (slot) => !slot.busy,
  ).startMs;
  const updated = (
    await call(owner, "update", {
      id: first.id,
      version: first.version,
      date: key,
      startMs: rescheduledStart,
      details: {
        ...details,
        meetingType: "in-person",
        contact: "Test meeting room",
        notes: "Updated locally",
      },
    })
  ).booking;
  assert.equal(updated.status, "requested");
  const rescheduleMail = await db
    .collection("schedulerMail")
    .where("bookingId", "==", first.id)
    .get();
  assert.ok(
    rescheduleMail.docs.some((doc) =>
      (doc.data().invite || "").includes("METHOD:CANCEL"),
    ),
  );
  const reapproved = (
    await call(admin, "approve", { id: first.id, version: updated.version })
  ).booking;
  assert.equal(reapproved.status, "confirmed");
  await assert.rejects(
    call(owner, "cancel", { id: first.id, version: first.version }),
    /another window/,
  );
  const cancelled = (
    await call(owner, "cancel", { id: first.id, version: reapproved.version })
  ).booking;
  await assert.rejects(
    call(other, "create", {
      ...payload(pinBase, 0),
      startMs: (await call(other, "day", { date: key })).slots.find(
        (slot) => !slot.busy,
      ).startMs,
    }),
    /access code is already in use/,
  );
  console.log(
    "PASS edit, stale edit rejection, cancel, and access code remains reserved",
  );
  await call(admin, "resetPin", {
    id: first.id,
    version: cancelled.version,
    pin: "Reset007",
  });
  assert.equal((await call(owner, "session")).role, null);
  await assert.rejects(
    call(owner, "create", ownerPayload),
    /own meeting|access has expired/,
  );
  await call(other, "unlock", { pin: "Reset007" });
  const reset = (await call(other, "session")).booking;
  assert.equal(reset.id, first.id);
  console.log("PASS access-code reset revokes sessions and create replays");
  await call(other, "delete", { id: first.id, version: reset.version });
  assert.equal((await call(other, "session")).role, null);
  const reused = (
    await call(owner, "create", {
      ...payload(pinBase, 0),
      startMs: (await call(owner, "day", { date: key })).slots.find(
        (slot) => !slot.busy,
      ).startMs,
    })
  ).booking;
  assert.notEqual(reused.id, first.id);
  const retryId = crypto.randomUUID();
  const retryPin = "Retry6401";
  const retryPayload = {
    ...payload(retryPin, 0),
    requestId: retryId,
    startMs: (await call(a, "day", { date: key })).slots.find(
      (slot) => !slot.busy,
    ).startMs,
  };
  const retry = await call(a, "create", retryPayload);
  const retried = await call(a, "create", retryPayload);
  assert.equal(retry.booking.id, retried.booking.id);
  console.log(
    "PASS deletion, access-code reuse isolation, and retry idempotency",
  );
  const mail = await db.collection("schedulerMail").get();
  assert.ok(mail.size > 0);
  assert.ok(mail.docs.some((doc) => doc.data().to === "jpcollandra@gmail.com"));
  assert.ok(
    mail.docs.some(
      (doc) =>
        doc.data().to === details.email &&
        doc.data().text.includes(pinBase.toUpperCase()),
    ),
  );
  assert.ok(mail.docs.every((doc) => !doc.data().text.includes(secret)));
  const history = await call(admin, "mailStatus", { id: second.id });
  assert.ok(
    history.messages.every(
      (message) => message.id && message.event && message.createdAt,
    ),
  );
  const declined = (
    await call(admin, "decline", {
      id: second.id,
      version: second.version,
      reason: "Away that day. Choose another time.",
    })
  ).booking;
  assert.equal(declined.declineReason, "Away that day. Choose another time.");
  const declineMail = await db
    .collection("schedulerMail")
    .where("bookingId", "==", second.id)
    .get();
  assert.ok(
    declineMail.docs.some(
      (doc) =>
        doc.data().event === "declined" &&
        doc.data().text.includes(declined.declineReason),
    ),
  );
  console.log(
    "PASS typed email history, decline explanation, and recovery message",
  );
  console.log("PASS notification recipients and access-code delivery");
  await db.doc(`schedulerSessions/${a.localId}`).update({ expiresAt: 0 });
  assert.equal((await call(a, "session")).role, null);
  await assert.rejects(call(a, "create", retryPayload), /access has expired/);
  console.log("PASS expired-session and create-replay rejection");
  for (let booking of [declined, reused, retry.booking]) {
    if (["requested", "confirmed"].includes(booking.status)) {
      await assert.rejects(
        call(admin, "delete", { id: booking.id, version: booking.version }),
        /Cancel this meeting/,
      );
      booking = (
        await call(admin, "cancel", { id: booking.id, version: booking.version })
      ).booking;
    }
    await call(admin, "delete", { id: booking.id, version: booking.version });
  }
  // Final messages may outlive booking deletion just long enough for local SMTP
  // delivery. Never remove them before the worker has had its delivery attempt.
  for (const bookingId of [first.id, declined.id, reused.id, retry.booking.id]) {
    const deadline = Date.now() + 15000;
    let remaining;
    do {
      remaining = await db
        .collection("schedulerMail")
        .where("bookingId", "==", bookingId)
        .get();
      if (remaining.empty) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    } while (Date.now() < deadline);
    assert.ok(
      remaining.empty,
      "final test notifications finish and remove their records",
    );
  }
  console.log("PASS cancellation/decline delivery survives deletion and cleans up");
  await call(admin, "clearAvailability", { date: key });
  assert.equal(
    (await call(a, "day", { date: key })).timeZone,
    "Pacific/Honolulu",
  );
  // Legitimate sign-ins don't consume the failed-guess budget.
  const beforeLimits = await db.collection("schedulerLimits").get();
  await Promise.all(beforeLimits.docs.map((doc) => doc.ref.delete()));
  for (let attempt = 0; attempt < 7; attempt++)
    assert.equal((await call(admin, "unlock", { pin: secret })).role, "admin");
  for (let attempt = 0; attempt < 4; attempt++)
    await assert.rejects(
      call(await user(), "unlock", { pin: "Wrong999" }),
      /didn.t match/,
    );
  await assert.rejects(
    call(await user(), "unlock", { pin: "Wrong999" }),
    /Too many incorrect codes.*\d+m \d+s/,
  );
  const failedBudget = (await db.collection("schedulerLimits").get()).docs.find(
    (doc) => doc.data().count === 5,
  );
  assert.ok(failedBudget);
  await failedBudget.ref.update({ expiresAt: Date.now() + 61 * 1000 });
  await assert.rejects(
    call(await user(), "unlock", { pin: "Wrong999" }),
    (error) => {
      assert.equal(error.code, "RESOURCE_EXHAUSTED");
      assert.ok(
        error.details.retryAfterSeconds >= 60 &&
          error.details.retryAfterSeconds <= 61,
      );
      assert.match(error.message, /Try again in 1m/);
      return true;
    },
  );
  await failedBudget.ref.update({ expiresAt: Date.now() - 1 });
  assert.equal((await call(admin, "unlock", { pin: secret })).role, "admin");
  console.log(
    "PASS access-code attempt limiting and restore-default availability",
  );
  const limits = await db.collection("schedulerLimits").get();
  await Promise.all(limits.docs.map((doc) => doc.ref.delete()));
  console.log(
    "Integration checks complete. All data stayed in demo-scheduler.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
