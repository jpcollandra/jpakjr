import { Booking } from "./api";

export const BASE_ZONE = "Pacific/Honolulu";
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
export function localDate(ms = Date.now(), zone = BASE_ZONE) {
  let formatter = dateFormatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dateFormatters.set(zone, formatter);
  }
  const parts = formatter.formatToParts(ms);
  const get = (key: string) => parts.find((part) => part.type === key)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function addDays(date: string, count: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}
export function dateLabel(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(value.getTime())
    ? "Choose a date"
    : new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(value);
}
export function timeLabel(ms: number, zone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(ms);
}
export function shortTime(ms: number, zone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(ms);
}
export function browserZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || BASE_ZONE;
}
export function zoneLabel(zone: string) {
  const names: Record<string, string> = {
    "Pacific/Honolulu": "Hawaii (HST)",
    "America/New_York": "Eastern (New York)",
    "America/Chicago": "Central (Chicago)",
    "America/Denver": "Mountain (Denver)",
    "America/Los_Angeles": "Pacific (Los Angeles)",
    "America/Anchorage": "Alaska",
    "Etc/UTC": "UTC",
    UTC: "UTC",
  };
  return names[zone] || zone.replace(/_/g, " ").split("/").join(" / ");
}
const commonZones = [
  BASE_ZONE,
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];
const extendedIntl = Intl as typeof Intl & {
  supportedValuesOf?: (key: string) => string[];
};
export const timeZones = Array.from(
  new Set([
    ...commonZones,
    ...(extendedIntl.supportedValuesOf?.("timeZone") || []),
  ]),
);
export function downloadInvite(booking: Booking) {
  const escape = (value: string) =>
    value
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  const utc = (ms: number) =>
    new Date(ms)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const cancelled =
    booking.status === "cancelled" || booking.status === "declined";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//John Collandra//Scheduler//EN",
    `METHOD:${cancelled ? "CANCEL" : "REQUEST"}`,
    "BEGIN:VEVENT",
    "ORGANIZER;CN=John Collandra:mailto:jpcollandra@gmail.com",
    `ATTENDEE;CN=${escape(booking.name)};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${booking.email}`,
    `UID:${booking.id}@jpakjr-scheduler`,
    `SEQUENCE:${booking.version}`,
    `DTSTAMP:${utc(booking.updatedAt)}`,
    `DTSTART:${utc(booking.startMs)}`,
    `DTEND:${utc(booking.endMs)}`,
    `SUMMARY:${escape(`Meeting with John Collandra — ${booking.company || booking.name}`)}`,
    `DESCRIPTION:${escape(`${booking.opportunity}\n${booking.notes}`)}`,
    `LOCATION:${escape(booking.contact)}`,
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const encoder = new TextEncoder();
  const folded = lines.map((line) => {
    let result = "";
    let size = 0;
    for (const char of Array.from(line)) {
      const bytes = encoder.encode(char).length;
      if (size + bytes > 73) {
        result += "\r\n ";
        size = 1;
      }
      result += char;
      size += bytes;
    }
    return result;
  });
  const url = URL.createObjectURL(
    new Blob([folded.join("\r\n") + "\r\n"], {
      type: "text/calendar;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = cancelled ? "meeting-cancellation.ics" : "meeting.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
