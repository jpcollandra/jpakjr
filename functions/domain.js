const { DateTime, IANAZone } = require("luxon");

const BASE_ZONE = "Pacific/Honolulu";
const ADMIN_EMAIL = "jpcollandra@gmail.com";
const DAY_MS = 86400000;
const DEFAULT_STATE = { events: [], overrides: {}, version: 0 };

class SchedulerError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
const fail = (code, message) => {
  throw new SchedulerError(code, message);
};
const dateKey = (now = Date.now()) =>
  DateTime.fromMillis(now, { zone: BASE_ZONE }).toISODate();
const isDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  DateTime.fromISO(value).isValid;
const validZone = (zone) =>
  typeof zone === "string" && IANAZone.isValidZone(zone);
const overlaps = (a, b) => a.startMs < b.endMs && b.startMs < a.endMs;

function scheduleFor(state, date) {
  return {
    timeZone: BASE_ZONE,
    startTime: "09:00",
    endTime: "17:00",
    closed: DateTime.fromISO(date).weekday > 5,
    ...state.overrides[date],
  };
}

function dayAvailability(state, date, now = Date.now()) {
  if (!isDate(date)) fail("invalid-argument", "Choose a valid calendar date.");
  const schedule = scheduleFor(state, date);
  const day = DateTime.fromISO(date, { zone: schedule.timeZone });
  const dayStart = day.startOf("day").toMillis();
  const dayEnd = day.plus({ days: 1 }).startOf("day").toMillis();
  const busy = state.events
    .filter((event) => event.startMs < dayEnd && event.endMs > dayStart)
    .map(({ startMs, endMs, shortNotice }) => ({
      startMs,
      endMs,
      shortNotice,
    }));
  const today = dateKey(now);
  const horizon = DateTime.fromISO(today).plus({ days: 60 }).toISODate();
  const inRange = date >= today && date <= horizon;
  const slots = [];
  if (inRange && !schedule.closed) {
    let start = DateTime.fromISO(`${date}T${schedule.startTime}`, {
      zone: schedule.timeZone,
    });
    const end = DateTime.fromISO(`${date}T${schedule.endTime}`, {
      zone: schedule.timeZone,
    });
    while (start.plus({ minutes: 30 }) <= end) {
      const slot = {
        startMs: start.toMillis(),
        endMs: start.plus({ minutes: 30 }).toMillis(),
      };
      if (slot.startMs > now)
        slots.push({
          ...slot,
          busy: state.events.some((event) => overlaps(slot, event)),
          shortNotice: slot.startMs - now < DAY_MS,
        });
      start = start.plus({ minutes: 30 });
    }
  }
  return {
    date,
    ...schedule,
    inRange,
    slots,
    busy,
    shortNotice: busy.some((event) => event.shortNotice),
  };
}

function validateSlot(
  state,
  date,
  startMs,
  acknowledge,
  now = Date.now(),
  excludeId,
) {
  if (!Number.isSafeInteger(startMs))
    fail("invalid-argument", "Choose an available meeting time.");
  const filtered = {
    ...state,
    events: state.events.filter((event) => event.id !== excludeId),
  };
  const day = dayAvailability(filtered, date, now);
  const slot = day.slots.find((candidate) => candidate.startMs === startMs);
  if (!slot || slot.busy)
    fail(
      "already-exists",
      "That time is no longer available. Please choose another time.",
    );
  if (slot.shortNotice && acknowledge !== true)
    fail(
      "failed-precondition",
      "This meeting starts in less than 24 hours. Please acknowledge the short-notice warning.",
    );
  return { ...slot, timeZone: day.timeZone };
}

function text(value, label, max = 200, required = true) {
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    fail("invalid-argument", `Enter a valid ${label}.`);
  return value.trim();
}

function validateDetails(data, requireVideoLink = false) {
  if (!data || typeof data !== "object")
    fail("invalid-argument", "Complete the meeting details.");
  const name = text(data.name, "name", 100);
  const email = text(data.email, "email address", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail("invalid-argument", "Enter a valid email address.");
  const company = text(data.company ?? "", "company", 150, false);
  const opportunity = text(
    data.opportunity ?? "",
    "role or opportunity",
    200,
    false,
  );
  if (!["phone", "video", "in-person"].includes(data.meetingType))
    fail("invalid-argument", "Choose phone, video, or in person.");
  const contact = text(
    data.contact,
    data.meetingType === "in-person"
      ? "meeting location"
      : data.meetingType === "video"
        ? "video meeting link"
        : "phone number",
    500,
    data.meetingType !== "video" || requireVideoLink,
  );
  if (data.meetingType === "video" && requireVideoLink) {
    try {
      if (new URL(contact).protocol !== "https:") throw new Error();
    } catch {
      fail(
        "invalid-argument",
        "Add a valid HTTPS video meeting link before approving this request.",
      );
    }
  }
  if (data.meetingType === "phone" && contact.replace(/\D/g, "").length < 6)
    fail(
      "invalid-argument",
      "Enter a phone number including its area or country code.",
    );
  return {
    name,
    email,
    company,
    opportunity,
    meetingType: data.meetingType,
    contact,
    notes: text(data.notes ?? "", "notes", 2000, false),
  };
}

function validatePin(pin) {
  if (typeof pin !== "string" || !/^[a-zA-Z0-9]{8,16}$/.test(pin))
    fail(
      "invalid-argument",
      "Choose an access code with 8–16 letters and numbers.",
    );
  return pin.toUpperCase();
}

function validateTimeZone(zone) {
  if (!validZone(zone)) fail("invalid-argument", "Choose a valid timezone.");
  return zone;
}

function validateOverride(data, now = Date.now()) {
  const date = data.date;
  if (
    !isDate(date) ||
    date < dateKey(now) ||
    date > DateTime.fromISO(dateKey(now)).plus({ days: 60 }).toISODate()
  )
    fail("invalid-argument", "Choose a date within the next 60 days.");
  if (!validZone(data.timeZone))
    fail("invalid-argument", "Choose a valid timezone.");
  for (const key of ["startTime", "endTime"])
    if (
      typeof data[key] !== "string" ||
      !/^(?:[01]\d|2[0-3]):(?:00|30)$/.test(data[key])
    )
      fail("invalid-argument", "Use hours or half-hours for availability.");
  if (data.startTime >= data.endTime)
    fail("invalid-argument", "The end time must be after the start time.");
  return {
    timeZone: data.timeZone,
    startTime: data.startTime,
    endTime: data.endTime,
    closed: data.closed === true,
  };
}

function publicBooking(booking) {
  const { pinKeys, currentPinKey, credentialVersion, ...result } = booking;
  return result;
}

const escapeIcs = (value) =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
const icsDate = (ms) =>
  DateTime.fromMillis(ms, { zone: "utc" }).toFormat("yyyyMMdd'T'HHmmss'Z'");
function calendarInvite(booking) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//John Collandra//Scheduler//EN",
    `METHOD:${booking.status === "cancelled" ? "CANCEL" : "REQUEST"}`,
    "BEGIN:VEVENT",
    `ORGANIZER;CN=John Collandra:mailto:${ADMIN_EMAIL}`,
    `ATTENDEE;CN=${escapeIcs(booking.name)};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${booking.email}`,
    `UID:${booking.id}@jpakjr-scheduler`,
    `SEQUENCE:${booking.version}`,
    `DTSTAMP:${icsDate(booking.updatedAt)}`,
    `DTSTART:${icsDate(booking.startMs)}`,
    `DTEND:${icsDate(booking.endMs)}`,
    `SUMMARY:${escapeIcs(`Meeting with John Collandra — ${booking.company || booking.name}`)}`,
    `DESCRIPTION:${escapeIcs(`${booking.opportunity}\n${booking.notes || ""}`)}`,
    `LOCATION:${escapeIcs(booking.contact)}`,
    `STATUS:${booking.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // Fold by UTF-8 byte length, including the leading continuation space.
  return (
    lines
      .map((line) => {
        let output = "";
        let column = 0;
        for (const char of line) {
          const size = Buffer.byteLength(char);
          if (column + size > 73) {
            output += "\r\n ";
            column = 1;
          }
          output += char;
          column += size;
        }
        return output;
      })
      .join("\r\n") + "\r\n"
  );
}

module.exports = {
  BASE_ZONE,
  ADMIN_EMAIL,
  DAY_MS,
  DEFAULT_STATE,
  SchedulerError,
  dateKey,
  isDate,
  overlaps,
  scheduleFor,
  dayAvailability,
  validateSlot,
  validateDetails,
  validatePin,
  validateTimeZone,
  validateOverride,
  publicBooking,
  calendarInvite,
};
