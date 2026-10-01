import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { ManagementCode } from "../components";
import { useSchedulerTimezone } from "../preferences";
import { downloadInvite } from "../time";
import type { Booking } from "../api";
function Preference({ id }: { id: string }) {
  const [zone, change] = useSchedulerTimezone();
  return (
    <>
      <output aria-label={id}>{zone}</output>
      <button onClick={() => change("Asia/Tokyo")}>Change {id}</button>
    </>
  );
}
test("timezone changes synchronize the editor and its parent meeting page", () => {
  localStorage.setItem("scheduler-timezone", "America/Los_Angeles");
  render(
    <>
      <Preference id="parent" />
      <Preference id="editor" />
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Change editor" }));
  expect(screen.getByLabelText("parent")).toHaveTextContent("Asia/Tokyo");
  expect(screen.getByLabelText("editor")).toHaveTextContent("Asia/Tokyo");
});
test("generated management code has a working copy control with a fallback", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(<ManagementCode code="ABCD2345EFGH6789" />);
  fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Management code copied.",
    ),
  );
  expect(writeText).toHaveBeenCalledWith("ABCD2345EFGH6789");
  writeText.mockRejectedValue(new Error("Clipboard unavailable"));
  fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Select the code above",
    ),
  );
});
test("save code downloads a text file; cancelled meetings download an actual CANCEL calendar file", async () => {
  jest.useFakeTimers();
  let captured: Blob | undefined;
  const create = jest.fn((blob: Blob) => {
    captured = blob;
    return "blob:test";
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: create,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: jest.fn(),
  });
  const downloads: string[] = [];
  const click = jest
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });
  render(<ManagementCode code="ABCD2345EFGH6789" />);
  fireEvent.click(screen.getByRole("button", { name: "Save code" }));
  expect(downloads[0]).toBe("meeting-management-code.txt");
  expect(captured!.type).toBe("text/plain");
  Object.defineProperty(window, "TextEncoder", {
    configurable: true,
    value: require("node:util").TextEncoder,
  });
  downloadInvite({
    id: "test",
    name: "Test",
    email: "test@example.test",
    company: "",
    opportunity: "",
    notes: "",
    contact: "",
    status: "cancelled",
    version: 2,
    updatedAt: Date.now(),
    startMs: Date.now() + 86400000,
    endMs: Date.now() + 88200000,
  } as Booking);
  expect(downloads[1]).toBe("meeting-cancellation.ics");
  expect(captured!.type).toBe("text/calendar;charset=utf-8");
  // FileReader exercises the file content rather than only the button label.
  act(() => jest.runOnlyPendingTimers());
  jest.useRealTimers();
  const text = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(captured!);
  });
  expect(text).toContain("METHOD:CANCEL\r\n");
  expect(text).toContain("STATUS:CANCELLED\r\n");
  click.mockRestore();
});
