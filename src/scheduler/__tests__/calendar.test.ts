import { dayPresentation } from "../calendar";
import type { Day } from "../api";

const day = (overrides: Partial<Day> = {}): Day => ({
  date: "2026-10-02",
  timeZone: "Pacific/Honolulu",
  startTime: "09:00",
  endTime: "17:00",
  closed: false,
  inRange: true,
  slots: [],
  busy: [],
  shortNotice: false,
  ...overrides,
});

test("calendar labels one or many open times in plain language", () => {
  expect(
    dayPresentation(
      day({ slots: [{ startMs: 1, endMs: 2, busy: false, shortNotice: false }] }),
      "2026-10-01",
    ),
  ).toMatchObject({
    selectable: true,
    availabilityLabel: "1 meeting time available",
    statusLabel: "1 open slot",
  });
  expect(
    dayPresentation(
      day({
        slots: [
          { startMs: 1, endMs: 2, busy: false, shortNotice: false },
          { startMs: 2, endMs: 3, busy: false, shortNotice: false },
        ],
      }),
      "2026-10-01",
    ).statusLabel,
  ).toBe("2 open slots");
});

test("past, closed, and fully booked dates have distinct accessible labels", () => {
  expect(dayPresentation(day({ date: "2026-09-30" }), "2026-10-01"))
    .toMatchObject({ selectable: false, availabilityLabel: "Past date" });
  expect(dayPresentation(day({ closed: true }), "2026-10-01"))
    .toMatchObject({ selectable: false, availabilityLabel: "Not available" });
  expect(
    dayPresentation(
      day({ busy: [{ startMs: 1, endMs: 2, shortNotice: false }] }),
      "2026-10-01",
    ),
  ).toMatchObject({ selectable: false, availabilityLabel: "Fully booked" });
});
