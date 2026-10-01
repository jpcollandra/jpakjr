import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, useLocation } from "react-router-dom";
import SchedulerCalendar from "../../Pages/schedulerCalendar";
import { ThemeProvider } from "../../ThemeContext";
import { schedulerApi } from "../api";
import { addDays } from "../time";
jest.mock("../api", () => ({
  schedulerApi: jest.fn(),
  errorMessage: (error: Error) => error.message,
}));
function CurrentRoute() {
  const location = useLocation();
  return (
    <output aria-label="route">
      {location.pathname}
      {location.search}
    </output>
  );
}
const api = schedulerApi as jest.Mock;
const day = (date: string, start: string) => ({
  date,
  timeZone: "Pacific/Honolulu",
  slots: [
    {
      startMs: Date.parse(start),
      endMs: Date.parse(start) + 1800000,
      busy: false,
      shortNotice: false,
    },
  ],
});
function calendar() {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/calendar"]}>
        <SchedulerCalendar />
        <CurrentRoute />
      </MemoryRouter>
    </ThemeProvider>,
  );
}
beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-30T12:00:00Z"));
  localStorage.setItem("scheduler-timezone", "America/New_York");
  api.mockReset();
  api.mockResolvedValue({
    days: [
      day("2026-10-01", "2026-10-01T19:00:00Z"),
      day("2026-10-02", "2026-10-02T20:00:00Z"),
    ],
  });
});
afterEach(() => jest.restoreAllMocks());
test("calendar skips fully past weeks and routes an international local date to the correct host instant", async () => {
  localStorage.setItem("scheduler-timezone", "Asia/Tokyo");
  const startMs = Date.parse("2026-10-01T19:00:00Z");
  (schedulerApi as jest.Mock).mockResolvedValue({
    days: [
      {
        date: "2026-10-01",
        timeZone: "Pacific/Honolulu",
        slots: [
          {
            startMs,
            endMs: startMs + 1800000,
            busy: false,
            shortNotice: false,
          },
        ],
      },
    ],
  });
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/calendar"]}>
        <SchedulerCalendar />
        <CurrentRoute />
      </MemoryRouter>
    </ThemeProvider>,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Next available" }),
    ).not.toBeDisabled(),
  );
  expect(
    screen.queryByRole("button", { name: /Monday, September 7/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Next available" }));
  expect(
    await screen.findByRole("heading", { name: "Friday, October 2, 2026" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("dialog", { name: "Friday, October 2, 2026" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Choose a different date" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Next available" }));
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Friday, October 2, 2026" }),
    ).toHaveFocus(),
  );
  fireEvent.click(screen.getByRole("button", { name: "4:00 AM GMT+9" }));
  expect(screen.getByLabelText("route")).toHaveTextContent(
    `/calendar/book/2026-10-01?start=${startMs}`,
  );
});

test("switching dates replaces the modal options immediately and the same date can reopen", async () => {
  calendar();
  const first = await screen.findByRole("button", {
    name: "Thursday, October 1, 2026. Meeting times available.",
  });
  fireEvent.click(first);
  const firstDialog = await screen.findByRole("dialog", {
    name: "Thursday, October 1, 2026",
  });
  expect(
    within(firstDialog).getByRole("button", { name: "3:00 PM EDT" }),
  ).toBeInTheDocument();
  expect(
    document.querySelector(".scheduler-card .scheduler-slot-grid"),
  ).toBeNull();
  fireEvent.click(
    within(firstDialog).getByRole("button", {
      name: "Choose a different date",
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Friday, October 2, 2026. Meeting times available.",
    }),
  );
  const secondDialog = await screen.findByRole("dialog", {
    name: "Friday, October 2, 2026",
  });
  expect(
    within(secondDialog).getByRole("button", { name: "4:00 PM EDT" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "3:00 PM EDT" }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    within(secondDialog).getByRole("button", { name: "Close time choices" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Friday, October 2, 2026. Meeting times available.",
    }),
  );
  expect(
    await screen.findByRole("dialog", { name: "Friday, October 2, 2026" }),
  ).toBeInTheDocument();
  expect(api).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "4:00 PM EDT" }));
  expect(screen.getByLabelText("route")).toHaveTextContent(
    `/calendar/book/2026-10-02?start=${Date.parse("2026-10-02T20:00:00Z")}`,
  );
});

test("time dialog traps keyboard focus, closes with Escape, and restores the selected date", async () => {
  calendar();
  const date = await screen.findByRole("button", {
    name: "Thursday, October 1, 2026. Meeting times available.",
  });
  act(() => date.focus());
  fireEvent.click(date);
  const dialog = await screen.findByRole("dialog");
  await waitFor(() =>
    expect(within(dialog).getByRole("heading")).toHaveFocus(),
  );
  const close = within(dialog).getByRole("button", {
    name: "Close time choices",
  });
  const change = within(dialog).getByRole("button", {
    name: "Choose a different date",
  });
  change.focus();
  fireEvent.keyDown(change, { key: "Tab" });
  expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
  expect(change).toHaveFocus();
  fireEvent.keyDown(dialog, { key: "Escape", keyCode: 27 });
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(date).toHaveFocus();
});

test("timezone changes after dismissal regroup the next modal with the visitor's local date", async () => {
  calendar();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Next available" }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Next available" }));
  expect(
    await screen.findByRole("dialog", { name: "Thursday, October 1, 2026" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Choose a different date" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  fireEvent.change(screen.getByLabelText("Your timezone"), {
    target: { value: "Asia/Tokyo" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Next available" }));
  const dialog = await screen.findByRole("dialog", {
    name: "Friday, October 2, 2026",
  });
  expect(
    within(dialog).getByRole("button", { name: "4:00 AM GMT+9" }),
  ).toBeInTheDocument();
  expect(localStorage.getItem("scheduler-timezone")).toBe("Asia/Tokyo");
});

test("unavailable dates do not open a time dialog", async () => {
  calendar();
  const unavailable = await screen.findByRole("button", {
    name: "Saturday, October 3, 2026. Unavailable.",
  });
  expect(unavailable).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(unavailable);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("a full 61-day horizon is not reformatted when a second date is selected", async () => {
  const days = Array.from({ length: 61 }, (_, index) => {
    const date = addDays("2026-09-30", index);
    return {
      date,
      timeZone: "Pacific/Honolulu",
      slots: Array.from({ length: 16 }, (_, index) => {
        const startMs = Date.parse(`${date}T19:00:00Z`) + index * 1800000;
        return {
          startMs,
          endMs: startMs + 1800000,
          busy: false,
          shortNotice: false,
        };
      }),
    };
  });
  api.mockResolvedValue({ days });
  calendar();
  const first = await screen.findByRole("button", {
    name: "Thursday, October 1, 2026. Meeting times available.",
  });
  const formatting = jest.spyOn(Intl.DateTimeFormat.prototype, "formatToParts");
  fireEvent.click(first);
  await screen.findByRole("dialog");
  fireEvent.click(
    screen.getByRole("button", { name: "Choose a different date" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Friday, October 2, 2026. Meeting times available.",
    }),
  );
  await screen.findByRole("dialog", { name: "Friday, October 2, 2026" });
  expect(formatting.mock.calls.length).toBeLessThan(20);
  expect(api).toHaveBeenCalledTimes(2);
});
