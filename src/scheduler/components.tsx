import { KeyboardEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { FaCalendarAlt, FaEdit, FaLightbulb } from "react-icons/fa";
import { useTheme } from "../ThemeContext";
import { BASE_ZONE, shortTime, timeLabel, timeZones, zoneLabel } from "./time";
import "../Pages/scheduler.scss";
import AvatarLoader from "../components/AvatarLoader";

export function SchedulerLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { theme, toggleTheme } = useTheme()!;
  const heading = useRef<HTMLHeadingElement>(null);
  const location = useLocation();
  useEffect(() => {
    document.title = `${title} · John Collandra`;
    heading.current?.focus();
  }, [location.pathname, title]);
  return (
    <div className="scheduler">
      <a className="scheduler-skip" href="#scheduler-main">
        Skip to content
      </a>
      <header className="scheduler-header">
        <Link to="/nav" className="scheduler-brand">
          John Collandra<span>Let’s find a time to talk.</span>
        </Link>
        <nav aria-label="Scheduler navigation">
          <NavLink to="/calendar" end className="scheduler-button secondary">
            <FaCalendarAlt aria-hidden="true" /> Calendar
          </NavLink>
          <NavLink to="/calendar/manage" className="scheduler-button secondary">
            <FaEdit aria-hidden="true" /> Manage a meeting
          </NavLink>
          <button
            className="scheduler-button secondary"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <FaLightbulb aria-hidden="true" />
            {theme === "dark" ? "Light" : "Dark"} theme
          </button>
        </nav>
      </header>
      <main id="scheduler-main" tabIndex={-1}>
        <div className="scheduler-title">
          <p className="scheduler-eyebrow">A conversation starts here</p>
          <h1 tabIndex={-1} ref={heading}>
            {title}
          </h1>
          <p>{subtitle}</p>
        </div>
        {children}
      </main>
      <footer className="scheduler-footer">
        <Link to="/nav">Back to portfolio</Link>
        <Link to="/contact#contact-form">Need help? Contact John</Link>
      </footer>
    </div>
  );
}
export function Notice({
  children,
  error = false,
  focus = false,
}: {
  children: ReactNode;
  error?: boolean;
  focus?: boolean;
}) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) node.current?.focus();
  }, [focus]);
  return (
    <div
      ref={node}
      tabIndex={focus ? -1 : undefined}
      className={`scheduler-notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function ZoneSelect({
  value,
  onChange,
  id = "display-zone",
  label = "Your timezone",
  disabled = false,
}: {
  value: string;
  onChange: (zone: string) => void;
  id?: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className="scheduler-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {Array.from(new Set([value, ...timeZones])).map((zone) => (
          <option key={zone} value={zone}>
            {zoneLabel(zone)}
          </option>
        ))}
      </select>
    </div>
  );
}
export function MeetingTimes({
  startMs,
  endMs,
  zones,
}: {
  startMs: number;
  endMs: number;
  zones: string[];
}) {
  return (
    <div className="scheduler-times">
      {Array.from(new Set([...zones, BASE_ZONE])).map((zone) => (
        <p key={zone}>
          <strong>{timeLabel(startMs, zone)}</strong>
          <span>
            30 minutes · ends {shortTime(endMs, zone)} · {zoneLabel(zone)}
          </span>
        </p>
      ))}
    </div>
  );
}
export function ManagementCode({ code }: { code: string }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Management code copied.");
    } catch {
      setMessage(
        "Select the code above and copy it. You can also save it below.",
      );
    }
  }
  function save() {
    const url = URL.createObjectURL(
      new Blob(
        [
          `John Collandra meeting management\nCode: ${code}\n${window.location.origin}/calendar/manage\nKeep this code private.\n`,
        ],
        { type: "text/plain" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "meeting-management-code.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="scheduler-card">
      <h2>Save your management code</h2>
      <p>
        Use this code to return, change your request, or cancel. It’s also in
        your request email. Keep it private.
      </p>
      <code className="scheduler-management-code">{code}</code>
      <div className="scheduler-actions">
        <button className="scheduler-button secondary" onClick={copy}>
          Copy code
        </button>
        <button className="scheduler-button secondary" onClick={save}>
          Save code
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
export function ConfirmDialog({
  title,
  children,
  onCancel,
  onConfirm,
  confirmLabel,
  busy,
  danger = false,
  error,
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  busy: boolean;
  danger?: boolean;
  error?: string;
}) {
  const { theme } = useTheme()!;
  return (
    <Modal
      show
      onHide={() => {
        if (!busy) onCancel();
      }}
      centered
      backdrop={busy ? "static" : true}
      keyboard={!busy}
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-description"
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Tab") return;
        const root = event.currentTarget;
        const elements = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), a[href], select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        );
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (!first) {
          event.preventDefault();
          root.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === root)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      className={`scheduler-modal ${theme === "dark" ? "dark-theme" : ""}`}
    >
      <Modal.Header>
        <Modal.Title id="confirmation-title">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body id="confirmation-description">
        {children}
        {error && (
          <Notice error focus>
            {error}
          </Notice>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button
          className="scheduler-button secondary"
          onClick={onCancel}
          disabled={busy}
        >
          Go back
        </button>
        <button
          className={`scheduler-button ${danger ? "danger" : ""}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? (
            <AvatarLoader variant="inline" label="Saving…" />
          ) : (
            confirmLabel
          )}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
