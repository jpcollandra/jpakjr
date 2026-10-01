jest.mock("../../firebase", () => ({ auth: {}, functions: {} }));
jest.mock("firebase/auth", () => ({ signInAnonymously: jest.fn() }));
jest.mock("firebase/functions", () => ({ httpsCallable: jest.fn() }));
import { errorMessage } from "../api";
test("timeout and unavailable errors use plain-language recovery instead of technical codes", () => {
  const timeout = errorMessage({
    code: "functions/deadline-exceeded",
    message: "deadline-exceeded",
  });
  expect(timeout).toContain("connection timed out");
  expect(timeout).toContain("will not create a duplicate");
  expect(timeout).not.toContain("deadline-exceeded");
  expect(
    errorMessage({ code: "functions/internal", message: "internal" }),
  ).toContain("temporarily unavailable");
});
