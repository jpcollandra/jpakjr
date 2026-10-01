const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const { DateTime } = require("luxon");
const D = require("../domain");

// Exercise the real callable/mail callbacks without contacting Firebase or SMTP.
// The fake transaction also rejects reads after writes, as Firestore does.
function fixture() {
  const store = new Map();
  const sent = [];
  let nextId = 0;
  let send = async () => {};
  const clone = (value) =>
    value === undefined ? undefined : structuredClone(value);
  const snapshot = (ref) => ({
    ref,
    id: ref.id,
    exists: store.has(ref.path),
    data: () => clone(store.get(ref.path)),
  });
  function write(ref, value, merge = false) {
    const result = merge ? { ...store.get(ref.path) } : {};
    for (const [key, entry] of Object.entries(value))
      result[key] =
        entry && typeof entry === "object" && "increment" in entry
          ? (result[key] || 0) + entry.increment
          : clone(entry);
    store.set(ref.path, result);
  }
  function doc(docPath) {
    const ref = {
      path: docPath,
      id: docPath.split("/").pop(),
      get: async () => snapshot(ref),
      set: async (value) => write(ref, value),
      update: async (value) => {
        assert.ok(store.has(ref.path));
        write(ref, value, true);
      },
      delete: async () => store.delete(ref.path),
    };
    return ref;
  }
  function collection(name, filters = [], limit = Infinity) {
    return {
      doc: (id) => doc(`${name}/${id || `TestBooking${++nextId}`}`),
      where: (field, operator, value) =>
        collection(name, [...filters, [field, operator, value]], limit),
      orderBy: () => collection(name, filters, limit),
      limit: (count) => collection(name, filters, count),
      get: async () => {
        const docs = Array.from(store.keys())
          .filter(
            (key) =>
              key.startsWith(`${name}/`) &&
              filters.every(([field, operator, value]) =>
                operator === "=="
                  ? store.get(key)[field] === value
                  : store.get(key)[field] <= value,
              ),
          )
          .slice(0, limit)
          .map((key) => snapshot(doc(key)));
        return { docs, size: docs.length, empty: docs.length === 0 };
      },
    };
  }
  function operations() {
    const pending = [];
    return {
      get: async (ref) => {
        assert.equal(pending.length, 0, "transaction reads precede writes");
        return snapshot(ref);
      },
      set: (ref, value) => pending.push(() => write(ref, value)),
      create: (ref, value) =>
        pending.push(() => {
          assert.equal(store.has(ref.path), false);
          write(ref, value);
        }),
      update: (ref, value) =>
        pending.push(() => {
          assert.ok(store.has(ref.path));
          write(ref, value, true);
        }),
      delete: (ref) => pending.push(() => store.delete(ref.path)),
      commit: async () => pending.forEach((operation) => operation()),
    };
  }
  const db = {
    doc,
    collection,
    batch: operations,
    runTransaction: async (callback) => {
      const tx = operations();
      const result = await callback(tx);
      await tx.commit();
      return result;
    },
  };
  class HttpsError extends Error {
    constructor(code, message, details) {
      super(message);
      this.code = code;
      this.details = details;
    }
  }
  const mocks = {
    "firebase-admin/app": { initializeApp() {} },
    "firebase-admin/firestore": {
      getFirestore: () => db,
      FieldValue: { increment: (value) => ({ increment: value }) },
    },
    "firebase-functions/v2/https": {
      onCall: (_, callback) => callback,
      HttpsError,
    },
    "firebase-functions/v2/firestore": {
      onDocumentCreated: (_, callback) => callback,
    },
    "firebase-functions/v2/scheduler": {
      onSchedule: (_, callback) => callback,
    },
    "firebase-functions/params": {
      defineSecret: (name) => ({ value: () => `test-only-${name}` }),
      defineString: (name, config) => ({
        value: () =>
          name === "SCHEDULER_SMTP_HOST" ? "mock.smtp" : config.default,
      }),
    },
    nodemailer: {
      createTransport: () => ({
        sendMail: async (message) => {
          await send(message);
          sent.push(message);
        },
      }),
    },
  };
  const indexPath = path.resolve(__dirname, "../index.js");
  const actualRequire = createRequire(indexPath);
  const module = { exports: {} };
  vm.runInNewContext(
    fs.readFileSync(indexPath, "utf8"),
    {
      require: (name) => mocks[name] || actualRequire(name),
      module,
      exports: module.exports,
      process: { env: {} },
      Buffer,
      console,
      URL,
      Date,
    },
    { filename: indexPath },
  );
  store.set("schedulerSessions/admin", {
    role: "admin",
    expiresAt: Date.now() + 1800000,
  });
  let date = DateTime.now().setZone(D.BASE_ZONE).plus({ days: 5 });
  while (date.weekday > 5) date = date.plus({ days: 1 });
  const dateKey = date.toISODate();
  const details = {
    name: "API Test Visitor",
    email: "visitor@example.test",
    company: "",
    opportunity: "",
    meetingType: "video",
    contact: "https://example.test/call",
    notes: "Private test notes",
  };
  const payload = {
    date: dateKey,
    startMs: D.dayAvailability(D.DEFAULT_STATE, dateKey).slots[0].startMs,
    details,
    pin: "TESTCODE12345678",
    requestId: "test-submission-request",
    timeZone: "America/New_York",
  };
  const call = (uid, action, data = {}) =>
    module.exports.schedulerApi({
      auth: { uid },
      rawRequest: { ip: "test-peer" },
      data: { action, ...data },
    });
  return {
    store,
    sent,
    payload,
    call,
    setSend: (callback) => (send = callback),
    create: async () => (await call("owner", "create", payload)).booking,
    approve: async (booking) =>
      (
        await call("admin", "approve", {
          id: booking.id,
          version: booking.version,
          contact: details.contact,
        })
      ).booking,
    cancel: async (booking) =>
      (
        await call("owner", "cancel", {
          id: booking.id,
          version: booking.version,
        })
      ).booking,
    remove: (booking) =>
      call("owner", "delete", { id: booking.id, version: booking.version }),
    mail: (id) =>
      Array.from(store.entries())
        .filter(
          ([key, value]) =>
            key.startsWith("schedulerMail/") && value.bookingId === id,
        )
        .map(([key, value]) => ({ ref: doc(key), ...clone(value) })),
    deliver: (message) =>
      module.exports.sendSchedulerMail({
        data: { ref: message.ref },
        params: { mailId: message.ref.id },
      }),
    purge: module.exports.purgeExpiredSchedulerData,
  };
}

test("an authorized create retry returns the same booking without more mail", async () => {
  const f = fixture();
  const booking = await f.create();
  const retry = await f.call("owner", "create", f.payload);
  assert.equal(retry.booking.id, booking.id);
  assert.equal(f.mail(booking.id).length, 2);
});

test("create replays cannot bypass session expiry or logout", async () => {
  for (const revoke of ["expire", "logout"]) {
    const f = fixture();
    const booking = await f.create();
    if (revoke === "expire")
      f.store.get("schedulerSessions/owner").expiresAt = 0;
    else await f.call("owner", "logout");
    await assert.rejects(f.call("owner", "create", f.payload), {
      code: "unauthenticated",
    });
    await f.call("owner", "unlock", { pin: f.payload.pin });
    assert.equal(
      (await f.call("owner", "create", f.payload)).booking.id,
      booking.id,
    );
  }
});

test("management-code reset revokes create replay until valid reauthentication", async () => {
  const f = fixture();
  const booking = await f.create();
  await f.call("admin", "resetPin", {
    id: booking.id,
    version: booking.version,
    pin: "REPLACECODE1234",
  });
  assert.equal((await f.call("owner", "session")).role, null);
  await assert.rejects(f.call("owner", "create", f.payload), {
    code: "permission-denied",
  });
  await f.call("owner", "unlock", { pin: "REPLACECODE1234" });
  assert.equal(
    (await f.call("owner", "create", f.payload)).booking.id,
    booking.id,
  );
});

test("another browser cannot reuse a create idempotency key to read a booking", async () => {
  const f = fixture();
  await f.create();
  await assert.rejects(f.call("other", "create", f.payload), {
    code: "already-exists",
  });
});

test("address-only changes cancel the old attendee without cancelling John's event", async () => {
  const f = fixture();
  const booking = await f.approve(await f.create());
  const updated = (
    await f.call("owner", "update", {
      id: booking.id,
      version: booking.version,
      date: booking.date,
      startMs: booking.startMs,
      details: { ...f.payload.details, email: "corrected@example.test" },
    })
  ).booking;
  assert.equal(updated.status, "confirmed");
  const messages = f.mail(booking.id).filter((message) =>
    message.ref.id.startsWith(`${booking.id}-${updated.version}-`),
  );
  const cancellations = messages.filter((message) => message.event === "cancelled");
  assert.equal(cancellations.length, 1);
  assert.equal(cancellations[0].to, f.payload.details.email);
  assert.match(cancellations[0].invite, /METHOD:CANCEL/);
  assert.ok(cancellations[0].invite.includes(`UID:${booking.id}@jpakjr-scheduler`));
  assert.ok(cancellations[0].invite.includes(`SEQUENCE:${updated.version}`));
  const invitations = messages.filter((message) => message.event === "updated");
  assert.equal(invitations.length, 2);
  assert.ok(invitations.some((message) => message.to === updated.email));
  assert.ok(invitations.some((message) => message.to === D.ADMIN_EMAIL));
  assert.ok(invitations.every((message) => message.invite.includes("METHOD:REQUEST")));
});

test("combined time/address changes cancel both old invitations and request approval", async () => {
  const f = fixture();
  const booking = await f.approve(await f.create());
  const updated = (
    await f.call("owner", "update", {
      id: booking.id,
      version: booking.version,
      date: booking.date,
      startMs: booking.startMs + 1800000,
      details: { ...f.payload.details, email: "corrected@example.test" },
    })
  ).booking;
  assert.equal(updated.status, "requested");
  const messages = f.mail(booking.id).filter((message) =>
    message.ref.id.startsWith(`${booking.id}-${updated.version}-`),
  );
  assert.equal(messages.filter((message) => message.event === "cancelled").length, 2);
  const requests = messages.filter((message) => message.event === "request-updated");
  assert.equal(requests.length, 2);
  assert.ok(requests.every((message) => message.invite === null));
});

test("the API rejects deletion of an active request or confirmed meeting", async () => {
  const f = fixture();
  let booking = await f.create();
  for (const status of ["requested", "confirmed"]) {
    assert.equal(booking.status, status);
    await assert.rejects(f.remove(booking), { code: "failed-precondition" });
    assert.ok(f.store.has(`schedulerBookings/${booking.id}`));
    if (status === "requested") booking = await f.approve(booking);
  }
});

test("cancel then delete preserves final delivery and removes it after sending", async () => {
  const f = fixture();
  const booking = await f.cancel(await f.approve(await f.create()));
  const result = await f.remove(booking);
  assert.equal(result.finalNotificationsPending, true);
  assert.equal(f.store.has(`schedulerBookings/${booking.id}`), false);
  assert.equal((await f.call("owner", "session")).role, null);
  for (const collection of ["schedulerPins/", "schedulerRequests/"])
    assert.equal(Array.from(f.store.keys()).some((key) => key.startsWith(collection)), false);
  const notifications = f.mail(booking.id);
  assert.equal(notifications.length, 2);
  assert.ok(notifications.every((message) => message.event === "cancelled"));
  assert.ok(notifications.every((message) => message.deleteAfterDeliveryAt > Date.now()));
  for (const message of notifications) await f.deliver(message);
  assert.equal(f.sent.length, 2);
  assert.ok(f.sent.every((message) => message.attachments[0].content.includes("METHOD:CANCEL")));
  assert.equal(f.mail(booking.id).length, 0);
  // A duplicate trigger cannot send the removed final notice again.
  await f.deliver(notifications[0]);
  assert.equal(f.sent.length, 2);
});

test("deletion during SMTP delivery is detected after the worker's lease was acquired", async () => {
  const f = fixture();
  const booking = await f.cancel(await f.approve(await f.create()));
  const message = f.mail(booking.id).find((item) => item.event === "cancelled");
  let entered;
  let release;
  const started = new Promise((resolve) => (entered = resolve));
  const pending = new Promise((resolve) => (release = resolve));
  f.setSend(async () => { entered(); await pending; });
  const delivery = f.deliver(message);
  await started;
  assert.equal(f.store.get(message.ref.path).status, "sending");
  await f.remove(booking);
  assert.ok(f.store.get(message.ref.path).deleteAfterDeliveryAt);
  release();
  await delivery;
  assert.equal(f.store.has(message.ref.path), false);
  assert.equal(f.sent.length, 1);
});

test("final notification retries survive deletion and clean up after three failures", async () => {
  const f = fixture();
  const booking = await f.cancel(await f.approve(await f.create()));
  const message = f.mail(booking.id).find((item) => item.event === "cancelled");
  await f.remove(booking);
  f.setSend(async () => { throw new Error("Synthetic SMTP failure"); });
  for (let attempt = 1; attempt <= 3; attempt++) {
    await assert.rejects(f.deliver(message), /email delivery failed/);
    if (attempt < 3) {
      assert.equal(f.store.get(message.ref.path).attempts, attempt);
      assert.equal(f.store.get(message.ref.path).status, "failed");
    }
  }
  assert.equal(f.store.has(message.ref.path), false);
});

test("deletion removes already-delivered notifications without retaining history", async () => {
  const f = fixture();
  const booking = await f.cancel(await f.approve(await f.create()));
  for (const message of f.mail(booking.id))
    f.store.get(message.ref.path).status = "sent";
  const result = await f.remove(booking);
  assert.equal(result.finalNotificationsPending, false);
  assert.equal(f.mail(booking.id).length, 0);
});

test("daily cleanup removes expired detached mail without deleting ordinary history", async () => {
  const f = fixture();
  f.store.set("schedulerMail/expired-final", { deleteAfterDeliveryAt: Date.now() - 1 });
  f.store.set("schedulerMail/unexpired-final", { deleteAfterDeliveryAt: Date.now() + D.DAY_MS });
  f.store.set("schedulerMail/ordinary-history", { status: "sent" });
  await f.purge();
  assert.equal(f.store.has("schedulerMail/expired-final"), false);
  assert.equal(f.store.has("schedulerMail/unexpired-final"), true);
  assert.equal(f.store.has("schedulerMail/ordinary-history"), true);
});
