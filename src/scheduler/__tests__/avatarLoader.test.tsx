import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, useLocation } from "react-router-dom";
import AvatarLoader, { AVATAR_IMAGE_SRC } from "../../components/AvatarLoader";
import Landing from "../../Pages/landing";
import Contact from "../../Pages/contact";
import SchedulerCalendar from "../../Pages/schedulerCalendar";
import SchedulerManage from "../../Pages/schedulerManage";
import { MeetingEditor } from "../../Pages/schedulerBooking";
import { ThemeProvider } from "../../ThemeContext";
import { ConfirmDialog } from "../components";
import { schedulerApi } from "../api";
import { addDoc } from "firebase/firestore";

jest.mock("../../firebase", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));
jest.mock("../api", () => ({
  schedulerApi: jest.fn(),
  errorMessage: (error: Error) => error.message,
  isAccessExpired: () => false,
}));

const api = schedulerApi as jest.Mock;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
function CurrentRoute() {
  const location = useLocation();
  return <div aria-label="route">{location.pathname}</div>;
}
function wrap(ui: React.ReactNode) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/calendar"]}>
        {ui}
        <CurrentRoute />
      </MemoryRouter>
    </ThemeProvider>,
  );
}
beforeEach(() => {
  Object.defineProperty(window, "crypto", {
    configurable: true,
    value: require("node:crypto").webcrypto,
  });
  jest.clearAllMocks();
  api.mockReset();
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(() => jest.useRealTimers());

test("the shared loader reuses the landing avatar and announces the operation, not the decorative image", () => {
  render(<AvatarLoader label="Loading available dates…" />);
  const status = screen.getByRole("status");
  expect(status).toHaveTextContent("Loading available dates…");
  expect(status).toHaveAttribute("aria-live", "polite");
  expect(status).toHaveAttribute("aria-atomic", "true");
  expect(status.querySelector("img")).toHaveAttribute("src", AVATAR_IMAGE_SRC);
  expect(status.querySelector("img")).toHaveAttribute("alt", "");
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

test("calendar centers the avatar while waiting and removes it when dates arrive", async () => {
  const pending = deferred<{ days: [] }>();
  api.mockReturnValue(pending.promise);
  wrap(<SchedulerCalendar />);
  expect(
    screen.getByText("Loading available dates…").closest("[role=status]"),
  ).toHaveClass("avatar-loader--panel");
  await act(async () => pending.resolve({ days: [] }));
  expect(
    screen.queryByText("Loading available dates…"),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("table")).toBeInTheDocument();
});

test("a failed calendar request replaces the avatar with recovery instead of spinning forever", async () => {
  const pending = deferred<{ days: [] }>();
  api.mockReturnValue(pending.promise);
  wrap(<SchedulerCalendar />);
  await act(async () => pending.reject(new Error("Try again shortly.")));
  expect(
    screen.queryByText("Loading available dates…"),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Try again shortly.");
  expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
});

test("booking-time loading uses a centered compact avatar and leaves entered details usable", async () => {
  const pending = deferred<{ date: string; slots: []; timeZone: string }>();
  api.mockReturnValue(pending.promise);
  wrap(<MeetingEditor initialDate="2026-10-02" onSaved={jest.fn()} />);
  expect(screen.getByRole("status")).toHaveClass("avatar-loader--compact");
  expect(screen.getByLabelText("Name")).toBeEnabled();
  expect(screen.getByLabelText(/Time ·/)).toBeDisabled();
  await act(async () =>
    pending.resolve({
      date: "2026-10-02",
      slots: [],
      timeZone: "Pacific/Honolulu",
    }),
  );
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByLabelText(/Time ·/)).toBeEnabled();
});

test("access checking and sign-in use the avatar and recover from a failed code", async () => {
  const session = deferred<{ role: null }>();
  const unlock = deferred<{ role: null }>();
  api.mockImplementation((action: string) =>
    action === "session" ? session.promise : unlock.promise,
  );
  wrap(<SchedulerManage />);
  expect(screen.getByRole("status")).toHaveTextContent("Checking your access…");
  await act(async () => session.resolve({ role: null }));
  fireEvent.change(screen.getByLabelText("Management code (from your email)"), {
    target: { value: "LOCALTEST" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Open meeting" }));
  expect(screen.getByRole("button", { name: "Checking…" })).toBeDisabled();
  expect(screen.getByRole("status")).toHaveClass("avatar-loader--inline");
  await act(async () => unlock.reject(new Error("That code did not match.")));
  expect(screen.getByRole("button", { name: "Open meeting" })).toBeEnabled();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("saving in an approval/action dialog has a centered inline avatar and keeps actions disabled", () => {
  wrap(
    <ConfirmDialog
      title="Save changes?"
      busy
      confirmLabel="Save changes"
      onConfirm={jest.fn()}
      onCancel={jest.fn()}
    >
      <p>Review details.</p>
    </ConfirmDialog>,
  );
  expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  expect(screen.getByRole("status")).toHaveClass("avatar-loader--inline");
  expect(screen.getByRole("button", { name: "Go back" })).toBeDisabled();
});

test("admin availability and refresh operations use distinct avatar feedback and finish cleanly", async () => {
  const day = deferred<unknown>();
  const refresh = deferred<{ bookings: [] }>();
  let listCalls = 0;
  api.mockImplementation(async (action: string) => {
    if (action === "session") return { role: "admin" };
    if (action === "list")
      return ++listCalls === 1 ? { bookings: [] } : refresh.promise;
    return day.promise;
  });
  wrap(<SchedulerManage />);
  await screen.findByRole("button", { name: "Refresh meetings" });
  expect(
    screen.getByText("Loading availability…").closest("[role=status]"),
  ).toHaveClass("avatar-loader--compact");
  await act(async () =>
    day.resolve({
      timeZone: "Pacific/Honolulu",
      startTime: "09:00",
      endTime: "17:00",
      closed: false,
    }),
  );
  await waitFor(() =>
    expect(screen.queryByText("Loading availability…")).not.toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Refresh meetings" }));
  expect(
    screen.getByRole("button", { name: "Refreshing meetings…" }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "Sign out" })).toBeDisabled();
  await act(async () => refresh.resolve({ bookings: [] }));
  expect(
    screen.getByRole("button", { name: "Refresh meetings" }),
  ).toBeEnabled();
});

test("signing out shows the avatar only for the actual sign-out operation", async () => {
  const logout = deferred<void>();
  api.mockImplementation(async (action: string) => {
    if (action === "session") return { role: "admin" };
    if (action === "list") return { bookings: [] };
    if (action === "logout") return logout.promise;
    return {
      timeZone: "Pacific/Honolulu",
      startTime: "09:00",
      endTime: "17:00",
      closed: false,
    };
  });
  wrap(<SchedulerManage />);
  fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
  expect(screen.getByRole("button", { name: "Signing out…" })).toBeDisabled();
  await act(async () => logout.resolve());
  expect(screen.getByRole("button", { name: "Open meeting" })).toBeEnabled();
  expect(screen.queryByText("Signing out…")).not.toBeInTheDocument();
});

test("contact sending shows the avatar until the local mock finishes, with no real message sent", async () => {
  const pending = deferred<void>();
  (addDoc as jest.Mock).mockReturnValue(pending.promise);
  wrap(<Contact />);
  fireEvent.change(screen.getByLabelText("Your name"), {
    target: { value: "Test visitor" },
  });
  fireEvent.change(screen.getByLabelText("Your email"), {
    target: { value: "visitor@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Your message"), {
    target: { value: "Loader test" },
  });
  fireEvent.submit(screen.getByRole("form", { name: "Send a Message" }));
  expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  expect(screen.getByRole("status")).toHaveClass("avatar-loader--inline");
  await act(async () => pending.resolve());
  expect(screen.getByRole("button", { name: "Sent!" })).toBeEnabled();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("landing uses the spinning avatar instead of a generic ring and cleans up its navigation timer", async () => {
  jest.useFakeTimers();
  const view = wrap(<Landing />);
  fireEvent.click(screen.getByRole("button", { name: "Enter" }));
  expect(screen.getByRole("status")).toHaveClass("avatar-loader--hero");
  expect(screen.getByRole("status")).toHaveTextContent("Opening portfolio…");
  expect(
    screen.getByRole("button", { name: "Schedule a meeting" }),
  ).toBeDisabled();
  expect(view.container.querySelector(".loading-ring")).toBeNull();
  await act(async () => jest.advanceTimersByTime(2000));
  await waitFor(() =>
    expect(screen.getByLabelText("route")).toHaveTextContent("/nav"),
  );
  view.unmount();
  jest.useRealTimers();
});
