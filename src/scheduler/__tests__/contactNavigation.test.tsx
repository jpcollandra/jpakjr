import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, useLocation } from "react-router-dom";
import App from "../../App";
import { ThemeProvider } from "../../ThemeContext";
import { schedulerApi } from "../api";

jest.mock("../../firebase", () => ({ db: {} }));
jest.mock("../../Pages/aboutMe", () => () => <div>Portfolio home</div>);
jest.mock("../../Pages/projects", () => () => <div>Projects</div>);
jest.mock("../../Pages/resume", () => () => <div>Work experience</div>);
jest.mock("../api", () => ({
  schedulerApi: jest.fn(),
  errorMessage: (error: Error) => error.message,
}));

function CurrentRoute() {
  const location = useLocation();
  return <output aria-label="route">{location.pathname}{location.hash}</output>;
}

function openApp(path: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
        <CurrentRoute />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

test("scheduler Contact John actions open and focus the website contact form", async () => {
  (schedulerApi as jest.Mock).mockResolvedValue({ days: [] });
  openApp("/calendar");
  await screen.findByRole("link", { name: "Contact John to find a time." });
  const links = screen.getAllByRole("link", { name: /contact John/i });
  expect(links).toHaveLength(3);
  for (const link of links) {
    expect(link).toHaveAttribute("href", "/contact#contact-form");
  }
  fireEvent.click(screen.getByRole("link", { name: "Need help? Contact John" }));
  expect(screen.getByLabelText("route")).toHaveTextContent("/contact#contact-form");
  const form = await screen.findByRole("form", { name: "Send a Message" });
  await waitFor(() => expect(form).toHaveFocus());
  expect(screen.getByLabelText("Your name")).toBeInTheDocument();
  expect(screen.getByLabelText("Your email")).toBeInTheDocument();
  expect(screen.getByLabelText("Your message")).toBeInTheDocument();
});

test("the contact-form URL works when opened directly from an email", () => {
  openApp("/contact#contact-form");
  expect(screen.getByRole("form", { name: "Send a Message" })).toHaveFocus();
  expect(document.title).toBe("Contact John · John Collandra");
});
