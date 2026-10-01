import { KeyboardEvent, useEffect, useRef } from "react";
import { Modal } from "react-bootstrap";
import { useTheme } from "../ThemeContext";
import { dateLabel, shortTime, zoneLabel } from "./time";
import { LocalSlot } from "./localCalendar";
import { Notice } from "./components";

export default function TimePickerDialog({
  date,
  zone,
  slots,
  show,
  onClose,
  onSelect,
}: {
  date: string;
  zone: string;
  slots: LocalSlot[];
  show: boolean;
  onClose: () => void;
  onSelect: (slot: LocalSlot) => void;
}) {
  const { theme } = useTheme()!;
  const title = useRef<HTMLHeadingElement>(null);
  const focusTitle = () => title.current?.focus({ preventScroll: true });
  useEffect(() => {
    if (show) focusTitle();
  }, [date, show]);

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const root = event.currentTarget;
    const controls = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [tabindex="0"]',
      ),
    );
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === root)
    ) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      scrollable
      size="lg"
      aria-labelledby="available-times-title"
      aria-describedby="available-times-description"
      onEntered={focusTitle}
      onKeyDown={trapFocus}
      className={`scheduler-modal scheduler-time-picker ${theme === "dark" ? "dark-theme" : ""}`}
    >
      <Modal.Header>
        <Modal.Title
          as="h2"
          id="available-times-title"
          tabIndex={-1}
          ref={title}
        >
          {dateLabel(date)}
        </Modal.Title>
        <button
          type="button"
          className="scheduler-button secondary scheduler-modal-close"
          aria-label="Close time choices"
          onClick={onClose}
        >
          ×
        </button>
      </Modal.Header>
      <Modal.Body>
        <p id="available-times-description">
          Choose a 30-minute start time · {zoneLabel(zone)}
        </p>
        {slots.length ? (
          <div className="scheduler-slot-grid">
            {slots.map((slot) => (
              <button
                key={slot.startMs}
                type="button"
                className="scheduler-button secondary"
                onClick={() => onSelect(slot)}
              >
                {shortTime(slot.startMs, zone)}
                {slot.shortNotice && (
                  <span className="scheduler-slot-note">
                    Less than 24 hours
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <Notice>No times remain on this date. Choose another date.</Notice>
        )}
        <p className="scheduler-hint scheduler-time-picker-hint">
          This is a meeting request. John will confirm it by email.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <button
          type="button"
          className="scheduler-button secondary"
          onClick={onClose}
        >
          Choose a different date
        </button>
      </Modal.Footer>
    </Modal>
  );
}
