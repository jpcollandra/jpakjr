import { localSlots, slotsOnDate, slotsByLocalDate } from "../localCalendar";
import type { Day } from "../api";
const makeDay = (date: string, timeZone: string, starts: string[]): Day => ({
  date,
  timeZone,
  startTime: "09:00",
  endTime: "17:00",
  closed: false,
  inRange: true,
  busy: [],
  shortNotice: false,
  slots: starts.map((start) => ({
    startMs: Date.parse(start),
    endMs: Date.parse(start) + 1800000,
    busy: false,
    shortNotice: false,
  })),
});
test("Tokyo dates use the visitor's date while preserving the host date for submission", () => {
  const slots = localSlots(
    [
      makeDay("2026-10-01", "Pacific/Honolulu", [
        "2026-10-01T19:00:00Z",
        "2026-10-02T02:00:00Z",
      ]),
    ],
    "Asia/Tokyo",
  );
  expect(slotsOnDate(slots, "2026-10-01", "Asia/Tokyo")).toHaveLength(0);
  expect(slotsOnDate(slots, "2026-10-02", "Asia/Tokyo")).toHaveLength(2);
  expect(slotsOnDate(slots, "2026-10-02", "Asia/Tokyo")[0].scheduleDate).toBe(
    "2026-10-01",
  );
});
test("timezone overrides regroup correctly and duplicate instants have one option", () => {
  const days = [
    makeDay("2026-10-02", "Asia/Tokyo", ["2026-10-02T00:00:00Z"]),
    makeDay("2026-10-01", "Pacific/Honolulu", ["2026-10-02T00:00:00Z"]),
  ];
  const slots = localSlots(days, "America/Los_Angeles");
  expect(slots).toHaveLength(1);
  expect(slotsOnDate(slots, "2026-10-01", "America/Los_Angeles")).toHaveLength(
    1,
  );
});
test("local grouping honors daylight-saving offsets", () => {
  const slots = localSlots(
    [
      makeDay("2026-11-02", "Pacific/Honolulu", [
        "2026-11-03T04:30:00Z",
        "2026-11-03T05:30:00Z",
      ]),
    ],
    "America/New_York",
  );
  expect(slotsOnDate(slots, "2026-11-02", "America/New_York")).toHaveLength(1);
  expect(slotsOnDate(slots, "2026-11-03", "America/New_York")).toHaveLength(1);
});

test("the date index converts each slot once and supports repeated constant-time lookups", () => {
  const slots = localSlots(
    [
      makeDay("2026-11-02", "Pacific/Honolulu", [
        "2026-11-03T04:30:00Z",
        "2026-11-03T05:30:00Z",
      ]),
    ],
    "America/New_York",
  );
  const formatting = jest.spyOn(Intl.DateTimeFormat.prototype, "formatToParts");
  const index = slotsByLocalDate(slots, "America/New_York");
  expect(formatting).toHaveBeenCalledTimes(slots.length);
  for (let i = 0; i < 42; i++) {
    expect(index.get("2026-11-02")).toHaveLength(1);
    expect(index.get("2026-11-03")).toHaveLength(1);
  }
  expect(formatting).toHaveBeenCalledTimes(slots.length);
  expect(index.get("2026-11-03")![0].scheduleDate).toBe("2026-11-02");
  formatting.mockRestore();
});
