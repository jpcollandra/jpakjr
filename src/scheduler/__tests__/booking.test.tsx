import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { MeetingEditor } from "../../Pages/schedulerBooking";
import { ThemeProvider } from "../../ThemeContext";
import { Booking, Day, schedulerApi } from "../api";
jest.mock("../api", () => ({
  schedulerApi: jest.fn(),
  errorMessage: (error: Error) => error.message,
  isAccessExpired: () => false,
}));
const api = schedulerApi as jest.Mock;
const startMs = Date.parse("2026-10-02T19:00:00Z");
const booking: Booking = {
  id: "fixture",
  date: "2026-10-02",
  name: "Test Visitor",
  email: "visitor@example.test",
  company: "",
  opportunity: "",
  meetingType: "video",
  contact: "",
  notes: "",
  startMs,
  endMs: startMs + 1800000,
  originalTimeZone: "Pacific/Honolulu",
  status: "requested",
  shortNotice: false,
  version: 1,
  createdAt: 1,
  updatedAt: 1,
};
const day = (date: string): Day => ({
  date,
  timeZone: "Pacific/Honolulu",
  startTime: "09:00",
  endTime: "17:00",
  closed: false,
  inRange: true,
  busy: [],
  shortNotice: false,
  slots:
    date === booking.date
      ? [
          { startMs, endMs: startMs + 1800000, busy: true, shortNotice: false },
          {
            startMs: startMs + 3600000,
            endMs: startMs + 5400000,
            busy: false,
            shortNotice: false,
          },
        ]
      : [],
});
function BrowserBack() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Browser Back</button>;
}
function editor(value?: Booking, saved = jest.fn()) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/calendar/book/2026-10-02"]}>
        <BrowserBack />
        <MeetingEditor
          initialDate="2026-10-02"
          booking={value}
          onSaved={saved}
        />
      </MemoryRouter>
    </ThemeProvider>,
  );
}
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  localStorage.setItem("scheduler-timezone", "America/Los_Angeles");
  Object.defineProperty(window, "crypto", {
    configurable: true,
    value: {
      randomUUID: () => "test-request-1234",
      getRandomValues: (bytes: Uint8Array) => bytes.fill(3),
    },
  });
  jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-30T12:00:00Z"));
  api.mockReset();
  api.mockImplementation(async (action: string, input: { date: string }) =>
    action === "day" ? day(input.date) : { booking },
  );
});
afterEach(() => jest.restoreAllMocks());
test("pending edit keeps its reserved time and permits a note-only update", async () => {
  const saved = jest.fn();
  editor(booking, saved);
  await waitFor(() =>
    expect(screen.getByLabelText(/Time ·/)).not.toBeDisabled(),
  );
  expect(screen.getByLabelText(/Time ·/)).toHaveValue(String(startMs));
  expect(screen.getByLabelText("Your timezone")).toHaveValue(
    "America/Los_Angeles",
  );
  fireEvent.change(screen.getByLabelText(/Anything John/), {
    target: { value: "Note correction" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review request" }));
  fireEvent.click(await screen.findByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(api).toHaveBeenCalledWith(
    "update",
    expect.objectContaining({
      startMs,
      date: booking.date,
      details: expect.objectContaining({ notes: "Note correction" }),
    }),
  );
});
test("Back returns to editing, and leaving/reopening restores the draft", async () => {
  const first = editor();
  await waitFor(() =>
    expect(screen.getByLabelText(/Time ·/)).not.toBeDisabled(),
  );
  fireEvent.change(screen.getByLabelText(/Time ·/), {
    target: { value: String(startMs + 3600000) },
  });
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Draft Visitor" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "draft@example.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review request" }));
  expect(
    await screen.findByRole("heading", { name: "Review your meeting request" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Browser Back" }));
  expect(await screen.findByLabelText("Name")).toHaveValue("Draft Visitor");
  first.unmount();
  editor();
  await waitFor(() =>
    expect(screen.getByLabelText(/Time ·/)).not.toBeDisabled(),
  );
  expect(screen.getByLabelText("Name")).toHaveValue("Draft Visitor");
  expect(screen.getByLabelText("Email")).toHaveValue("draft@example.test");
  expect(screen.getByLabelText(/Time ·/)).toHaveValue(
    String(startMs + 3600000),
  );
});
test("minimal video request generates a code with optional company and opportunity", async () => {
  const saved = jest.fn();
  editor(undefined, saved);
  await waitFor(() =>
    expect(screen.getByLabelText(/Time ·/)).not.toBeDisabled(),
  );
  fireEvent.change(screen.getByLabelText(/Time ·/), {
    target: { value: String(startMs + 3600000) },
  });
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Visitor" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "visitor@example.test" },
  });
  expect(screen.getByLabelText("Company (optional)")).not.toBeRequired();
  expect(screen.queryByLabelText(/Repeat.*code/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Review request" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Submit request" }),
  );
  await waitFor(() => expect(saved).toHaveBeenCalled());
  const sent = api.mock.calls.find((call) => call[0] === "create")[1];
  expect(sent.pin).toMatch(/^[A-Z2-9]{16}$/);
  expect(sent.details).toMatchObject({
    company: "",
    opportunity: "",
    contact: "",
    meetingType: "video",
  });
  expect(sessionStorage.getItem("scheduler-draft-new")).toBeNull();
});
test("confirmed reschedule warns before sending and uses Request new time", async () => {
  editor({
    ...booking,
    status: "confirmed",
    contact: "https://example.test/call",
  });
  await waitFor(() =>
    expect(screen.getByLabelText(/Time ·/)).not.toBeDisabled(),
  );
  fireEvent.change(screen.getByLabelText(/Time ·/), {
    target: { value: String(startMs + 3600000) },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review request" }));
  expect(
    await screen.findByText(/Requesting a new time cancels/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Request new time" }),
  ).toBeInTheDocument();
});
test("invalid fields have nearby messages and focus moves to the first invalid field", async () => {
  editor(booking);
  await waitFor(() =>
    expect(screen.getByLabelText(/Time ·/)).not.toBeDisabled(),
  );
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "invalid" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review request" }));
  expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveFocus();
  expect(screen.getByLabelText("Email")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});
test("changing timezone preserves the instant while updating its local date", async () => {
  editor(booking);
  await waitFor(() =>
    expect(screen.getByLabelText(/Time ·/)).not.toBeDisabled(),
  );
  fireEvent.change(screen.getByLabelText("Your timezone"), {
    target: { value: "Asia/Tokyo" },
  });
  await waitFor(() =>
    expect(screen.getByLabelText(/Time ·/)).not.toBeDisabled(),
  );
  expect(screen.getByLabelText("Date in your timezone")).toHaveValue(
    "2026-10-03",
  );
  expect(screen.getByLabelText(/Time ·/)).toHaveValue(String(startMs));
  expect(localStorage.getItem("scheduler-timezone")).toBe("Asia/Tokyo");
});
test("a future booking can move earlier without an artificial minimum-date restriction", async () => {
  editor({
    ...booking,
    status: "confirmed",
    contact: "https://example.test/call",
  });
  await waitFor(() =>
    expect(screen.getByLabelText(/Time ·/)).not.toBeDisabled(),
  );
  expect(screen.getByLabelText("Date in your timezone")).toHaveAttribute(
    "min",
    "2026-09-30",
  );
});
test("declined rebooking defaults to the visitor's local date, not the host date", async () => {
  localStorage.setItem("scheduler-timezone", "Asia/Tokyo");
  editor({ ...booking, status: "declined" });
  await waitFor(() =>
    expect(screen.getByLabelText(/Time ·/)).not.toBeDisabled(),
  );
  expect(screen.getByLabelText("Date in your timezone")).toHaveValue(
    "2026-10-03",
  );
  expect(screen.getByLabelText(/Time ·/)).toHaveValue("");
});
