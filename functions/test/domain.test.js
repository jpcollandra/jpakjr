const { test } = require("node:test");
const assert = require("node:assert/strict");
const { DateTime } = require("luxon");
const D = require("../domain");

test("Hawaii weekday hours produce 16 half-hour slots and omit weekends", () => {
  const now = DateTime.fromISO("2026-09-30T08:00", {
    zone: D.BASE_ZONE,
  }).toMillis();
  const day = D.dayAvailability(D.DEFAULT_STATE, "2026-10-01", now);
  assert.equal(day.slots.length, 16);
  assert.equal(
    DateTime.fromMillis(day.slots[0].startMs, { zone: D.BASE_ZONE }).hour,
    9,
  );
  assert.equal(
    D.dayAvailability(D.DEFAULT_STATE, "2026-10-03", now).slots.length,
    0,
  );
});
test("an Eastern override changes availability while keeping existing instants and detecting collisions", () => {
  const now = DateTime.fromISO("2026-09-30T08:00", {
    zone: D.BASE_ZONE,
  }).toMillis();
  const startMs = DateTime.fromISO("2026-10-01T09:00", {
    zone: D.BASE_ZONE,
  }).toMillis();
  const state = {
    ...D.DEFAULT_STATE,
    events: [
      { id: "existing", startMs, endMs: startMs + 1800000, shortNotice: false },
    ],
    overrides: {
      "2026-10-01": {
        timeZone: "America/New_York",
        startTime: "09:00",
        endTime: "17:00",
      },
    },
  };
  const day = D.dayAvailability(state, "2026-10-01", now);
  assert.equal(
    day.slots[0].startMs,
    DateTime.fromISO("2026-10-01T09:00", {
      zone: "America/New_York",
    }).toMillis(),
  );
  assert.equal(state.events[0].startMs, startMs);
  assert.equal(day.slots.find((slot) => slot.startMs === startMs).busy, true);
});
test("Eastern daylight-saving transition uses the correct offset, including Hawaii date rollover", () => {
  const now = DateTime.fromISO("2026-10-01T08:00", {
    zone: D.BASE_ZONE,
  }).toMillis();
  const make = (date) =>
    D.dayAvailability(
      {
        ...D.DEFAULT_STATE,
        overrides: {
          [date]: {
            timeZone: "America/New_York",
            startTime: "09:00",
            endTime: "17:00",
          },
        },
      },
      date,
      now,
    ).slots[0];
  assert.equal(
    DateTime.fromMillis(make("2026-10-30").startMs, { zone: D.BASE_ZONE }).hour,
    3,
  );
  assert.equal(
    DateTime.fromMillis(make("2026-11-02").startMs, { zone: D.BASE_ZONE }).hour,
    4,
  );
  const tokyo = D.dayAvailability(
    {
      ...D.DEFAULT_STATE,
      overrides: {
        "2026-10-02": {
          timeZone: "Asia/Tokyo",
          startTime: "09:00",
          endTime: "17:00",
        },
      },
    },
    "2026-10-02",
    now,
  );
  assert.equal(
    DateTime.fromMillis(tokyo.slots[0].startMs, {
      zone: D.BASE_ZONE,
    }).toISODate(),
    "2026-10-01",
  );
});
test("short notice needs acknowledgment, but an override never allows past or occupied slots", () => {
  const now = DateTime.fromISO("2026-09-30T08:00", {
    zone: D.BASE_ZONE,
  }).toMillis();
  const start = D.dayAvailability(D.DEFAULT_STATE, "2026-09-30", now).slots[0]
    .startMs;
  assert.throws(
    () => D.validateSlot(D.DEFAULT_STATE, "2026-09-30", start, false, now),
    /24 hours/,
  );
  assert.equal(
    D.validateSlot(D.DEFAULT_STATE, "2026-09-30", start, true, now).shortNotice,
    true,
  );
  assert.throws(
    () =>
      D.validateSlot(
        {
          ...D.DEFAULT_STATE,
          events: [{ id: "taken", startMs: start, endMs: start + 1800000 }],
        },
        "2026-09-30",
        start,
        true,
        now,
      ),
    /no longer available/,
  );
  assert.throws(
    () =>
      D.validateSlot(D.DEFAULT_STATE, "2026-09-30", now - 1800000, true, now),
    /no longer available/,
  );
});
test("access-code validation normalizes case and rejects weak or malformed codes", () => {
  assert.equal(D.validatePin("Meet2026"), "MEET2026");
  for (const pin of ["1234567", "this-code-has-symbols", "waytoolongaccesscode1", 7])
    assert.throws(() => D.validatePin(pin));
});
test("private credential fields never leave a booking response; ICS updates preserve UID and fold safely", () => {
  const booking = {
    id: "example",
    name: "Recruiter",
    email: "recruiter@example.com",
    company: "Company, Inc.",
    opportunity: "Engineer; role",
    notes: "line1\nline2",
    contact: "https://example.test",
    startMs: Date.now(),
    endMs: Date.now() + 1800000,
    updatedAt: Date.now(),
    status: "confirmed",
    version: 2,
    credentialVersion: 3,
    currentPinKey: "private",
    pinKeys: ["private"],
  };
  const result = D.publicBooking(booking);
  assert.equal(result.pinKeys, undefined);
  assert.equal(result.currentPinKey, undefined);
  assert.equal(result.credentialVersion, undefined);
  const invite = D.calendarInvite(booking);
  assert.match(invite, /UID:example@jpakjr-scheduler/);
  assert.match(
    invite,
    /ORGANIZER;CN=John Collandra:mailto:jpcollandra@gmail.com/,
  );
  assert.match(invite, /METHOD:REQUEST/);
  assert.match(
    invite.replace(/\r\n /g, ""),
    /ATTENDEE;CN=Recruiter;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:recruiter@example\.com/,
  );
  assert.match(invite, /SEQUENCE:2/);
  assert.match(invite, /Company\\, Inc\./);
  assert.match(
    D.calendarInvite({ ...booking, status: "cancelled" }),
    /METHOD:CANCEL/,
  );
  for (const line of D.calendarInvite({
    ...booking,
    notes: "💻".repeat(100),
  }).split("\r\n"))
    assert.ok(Buffer.byteLength(line) <= 75);
});
