import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import SchedulerManage from "../../Pages/schedulerManage";
import { ThemeProvider } from "../../ThemeContext";
import { Booking, schedulerApi } from "../api";

jest.mock("../api", () => ({
  schedulerApi: jest.fn(),
  errorMessage: (error: Error) => error.message,
  isAccessExpired: () => false,
}));

const api = schedulerApi as jest.Mock;
const first: Booking = {
  id: "first-booking",
  name: "First Visitor",
  email: "first@example.test",
  company: "",
  opportunity: "",
  meetingType: "video",
  contact: "",
  notes: "",
  date: "2026-10-02",
  startMs: Date.parse("2026-10-02T19:00:00Z"),
  endMs: Date.parse("2026-10-02T19:30:00Z"),
  originalTimeZone: "Pacific/Honolulu",
  shortNotice: false,
  status: "requested",
  version: 1,
  createdAt: 1,
  updatedAt: 1,
};
const target: Booking = {
  ...first,
  id: "target-booking",
  name: "Target Visitor",
  startMs: first.startMs + 1800000,
  endMs: first.endMs + 1800000,
};
const day = {
  timeZone: "Pacific/Honolulu",
  startTime: "09:00",
  endTime: "17:00",
  closed: false,
};
function show(route: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[route]}>
        <SchedulerManage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}
beforeEach(() => {
  api.mockReset();
  localStorage.clear();
  sessionStorage.clear();
});

test.each(["booking", "requested"])(
  "signing in from a %s link selects its target, not the first pending meeting",
  async (query) => {
    let signedIn = false;
    api.mockImplementation(async (action: string) => {
      if (action === "session") return { role: signedIn ? "admin" : null };
      if (action === "unlock") {
        signedIn = true;
        return { role: "admin" };
      }
      if (action === "list") return { bookings: [first, target] };
      if (action === "mailStatus") return { messages: [] };
      return day;
    });
    show(`/calendar/manage?${query}=${target.id}`);
    fireEvent.change(
      await screen.findByLabelText("Management code (from your email)"),
      { target: { value: "TESTADMIN" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Open meeting" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Target Visitor/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(screen.getByRole("button", { name: /First Visitor/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("heading", { name: "Target Visitor" })).toBeInTheDocument();
  },
);

test("a missing email-link target safely falls back to an existing request", async () => {
  api.mockImplementation(async (action: string) => {
    if (action === "session") return { role: "admin" };
    if (action === "list") return { bookings: [first] };
    if (action === "mailStatus") return { messages: [] };
    return day;
  });
  show("/calendar/manage?booking=deleted-booking");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /First Visitor/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    ),
  );
});

test("deletion explains temporary final-notification retention and reports pending delivery", async () => {
  const cancelled = { ...first, status: "cancelled" as const };
  let deleted = false;
  api.mockImplementation(async (action: string) => {
    if (action === "session")
      return deleted ? { role: null } : { role: "recruiter", booking: cancelled };
    if (action === "mailStatus") return { messages: [] };
    if (action === "delete") {
      deleted = true;
      return { ok: true, finalNotificationsPending: true };
    }
    return day;
  });
  show("/calendar/manage");
  fireEvent.click(
    await screen.findByRole("button", { name: "Delete booking and data" }),
  );
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("Final cancellation or decline emails can still finish sending");
  expect(dialog).toHaveTextContent("daily cleanup after 24 hours");
  fireEvent.click(screen.getByRole("button", { name: "Delete booking permanently" }));
  await screen.findByText(/Final cancellation or decline emails will finish sending/);
  expect(api).toHaveBeenCalledWith("delete", expect.objectContaining({
    id: first.id,
    version: first.version,
  }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("active meetings keep permanent deletion disabled", async () => {
  api.mockImplementation(async (action: string) => {
    if (action === "session") return { role: "recruiter", booking: first };
    if (action === "mailStatus") return { messages: [] };
    return day;
  });
  show("/calendar/manage");
  expect(
    await screen.findByRole("button", { name: "Delete booking and data" }),
  ).toBeDisabled();
});
