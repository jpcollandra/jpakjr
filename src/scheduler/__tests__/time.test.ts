import { addDays, localDate, timeLabel } from "../time";

test("Hawaii dates cross midnight at 10:00 UTC, independently of the browser timezone", () => {
  expect(localDate(Date.parse("2026-10-01T09:59:00Z"))).toBe("2026-09-30");
  expect(localDate(Date.parse("2026-10-01T10:00:00Z"))).toBe("2026-10-01");
});
test("time labels show both dates and the seasonal Eastern offset", () => {
  const summer = Date.parse("2026-10-02T02:00:00Z");
  expect(timeLabel(summer, "Pacific/Honolulu")).toContain(
    "Oct 1, 2026, 4:00 PM HST",
  );
  expect(timeLabel(summer, "America/New_York")).toContain(
    "Oct 1, 2026, 10:00 PM EDT",
  );
  expect(
    timeLabel(Date.parse("2026-11-03T02:00:00Z"), "America/New_York"),
  ).toContain("9:00 PM EST");
});
test("calendar navigation handles month, year, and leap-day boundaries", () => {
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
});
