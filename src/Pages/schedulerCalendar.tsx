import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Day, errorMessage, schedulerApi } from "../scheduler/api";
import { addDays, dateLabel, localDate } from "../scheduler/time";
import { Notice, SchedulerLayout, ZoneSelect } from "../scheduler/components";
import { useSchedulerTimezone } from "../scheduler/preferences";
import { localSlots, slotsByLocalDate } from "../scheduler/localCalendar";
import AvatarLoader from "../components/AvatarLoader";
import TimePickerDialog from "../scheduler/TimePickerDialog";

export default function SchedulerCalendar() {
  const navigate = useNavigate();
  const [zone, setZone] = useSchedulerTimezone();
  const today = localDate(Date.now(), zone);
  const hostToday = localDate();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [days, setDays] = useState<Day[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [focusDate, setFocusDate] = useState(today);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const first = `${month}-01`;
  const start = addDays(first, -new Date(`${first}T12:00:00Z`).getUTCDay());
  const weeks = Array.from({ length: 6 }, (_, week) => week).filter(
    (week) => addDays(start, week * 7 + 6) >= today,
  );
  const slots = useMemo(() => localSlots(days, zone), [days, zone]);
  // Group once when availability or timezone changes, not once per calendar
  // cell on every selection/focus update. Repeated Intl work blocked the UI.
  const dates = useMemo(() => slotsByLocalDate(slots, zone), [slots, zone]);
  const now = Date.now();
  const availableOnDate = (date: string) =>
    (dates.get(date) || []).filter((slot) => !slot.busy && slot.startMs > now);
  const selectedSlots = availableOnDate(selectedDate);
  const nextSlot = slots.find((slot) => !slot.busy && slot.startMs > now);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    // Fetch the whole booking horizon in bounded chunks. Dates are then grouped
    // by the visitor's timezone, not by the schedule's date keys.
    Promise.all(
      [
        [-2, 31],
        [32, 62],
      ].map(([from, to]) =>
        schedulerApi<{ days: Day[] }>("calendar", {
          startDate: addDays(hostToday, from),
          endDate: addDays(hostToday, to),
        }),
      ),
    )
      .then((values) => {
        if (active) setDays(values.flatMap((value) => value.days));
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hostToday, revision]);
  function select(date: string) {
    setSelectedDate(date);
    setFocusDate(date);
    setPickerOpen(true);
  }
  function moveMonth(offset: number) {
    const date = new Date(`${first}T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + offset);
    const nextMonth = date.toISOString().slice(0, 7);
    setMonth(nextMonth);
    setFocusDate(nextMonth === today.slice(0, 7) ? today : `${nextMonth}-01`);
    setSelectedDate("");
    setPickerOpen(false);
  }
  function nextAvailable() {
    if (!nextSlot) return;
    const date = localDate(nextSlot.startMs, zone);
    setMonth(date.slice(0, 7));
    select(date);
  }
  return (
    <SchedulerLayout
      title="Schedule a conversation"
      subtitle="Choose a date, then a time. John will confirm your request by email."
    >
      <div className="scheduler-toolbar">
        <p>
          <span className="scheduler-badge">30-minute meetings</span>
          <br />
          Times and dates are shown in your timezone.
        </p>
        <button
          className="scheduler-button"
          onClick={nextAvailable}
          disabled={loading || !nextSlot}
        >
          Next available
        </button>
      </div>
      <ZoneSelect
        value={zone}
        onChange={(value) => {
          setZone(value);
          setSelectedDate("");
          setPickerOpen(false);
          setFocusDate(localDate(Date.now(), value));
          setMonth(localDate(Date.now(), value).slice(0, 7));
        }}
      />
      <section
        className="scheduler-card"
        aria-label="Meeting calendar"
        aria-busy={loading}
      >
        <div className="scheduler-month">
          <button
            className="scheduler-button secondary"
            onClick={() => moveMonth(-1)}
            aria-label="Previous month"
            disabled={month <= today.slice(0, 7)}
          >
            ←
          </button>
          <h2 aria-live="polite">
            {new Intl.DateTimeFormat("en-US", {
              timeZone: "UTC",
              month: "long",
              year: "numeric",
            }).format(new Date(`${first}T12:00:00Z`))}
          </h2>
          <button
            className="scheduler-button secondary"
            onClick={() => moveMonth(1)}
            aria-label="Next month"
            disabled={month >= addDays(today, 62).slice(0, 7)}
          >
            →
          </button>
        </div>
        {error ? (
          <Notice error focus>
            {error}
            <div className="scheduler-actions">
              <button
                className="scheduler-button secondary"
                onClick={() => setRevision((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          </Notice>
        ) : loading ? (
          <AvatarLoader label="Loading available dates…" />
        ) : (
          <>
            <table className="scheduler-calendar">
              <caption className="visually-hidden">
                Choose an open date to choose a time in a dialog. Muted dates
                are unavailable. Use arrow keys to move between days.
              </caption>
              <thead>
                <tr>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <th scope="col" key={day}>
                        {day}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <tr key={week}>
                    {Array.from({ length: 7 }, (_, index) => {
                      const date = addDays(start, week * 7 + index);
                      const count = availableOnDate(date).length;
                      const selectable = date >= today && count > 0;
                      return (
                        <td key={date}>
                          <button
                            ref={(element) => {
                              buttons.current[date] = element;
                            }}
                            className={`scheduler-day ${date.slice(0, 7) !== month ? "outside" : ""} ${!selectable ? "unavailable" : ""} ${selectedDate === date ? "selected" : ""}`}
                            aria-disabled={!selectable}
                            aria-pressed={selectedDate === date}
                            aria-haspopup={selectable ? "dialog" : undefined}
                            aria-current={date === today ? "date" : undefined}
                            tabIndex={date === focusDate ? 0 : -1}
                            onFocus={() => setFocusDate(date)}
                            onClick={() => {
                              if (selectable) select(date);
                            }}
                            aria-label={`${dateLabel(date)}. ${date < today ? "Past date" : selectable ? "Meeting times available" : "Unavailable"}.`}
                            onKeyDown={(event) => {
                              const weekday = new Date(
                                `${date}T12:00:00Z`,
                              ).getUTCDay();
                              const offset = (
                                {
                                  ArrowLeft: -1,
                                  ArrowRight: 1,
                                  ArrowUp: -7,
                                  ArrowDown: 7,
                                  Home: -weekday,
                                  End: 6 - weekday,
                                } as Record<string, number>
                              )[event.key];
                              if (offset !== undefined) {
                                event.preventDefault();
                                buttons.current[addDays(date, offset)]?.focus();
                              }
                            }}
                          >
                            <span className="scheduler-day-number">
                              {Number(date.slice(-2))}
                              {date.slice(0, 7) !== month && (
                                <small>
                                  {" "}
                                  {new Intl.DateTimeFormat("en-US", {
                                    timeZone: "UTC",
                                    month: "short",
                                  }).format(new Date(`${date}T12:00:00Z`))}
                                </small>
                              )}
                            </span>
                            <span
                              className="scheduler-day-status"
                              aria-hidden="true"
                            >
                              {selectable ? "Open" : "—"}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="scheduler-legend">
              <span>Open: meeting times available.</span>
              <span>Muted: past or unavailable.</span>
            </div>
            <p className="scheduler-hint">
              Select an open date to choose a time.
            </p>
            {!nextSlot && (
              <Notice>
                No times are currently available.{" "}
                <Link to="/contact#contact-form">
                  Contact John to find a time.
                </Link>
              </Notice>
            )}
          </>
        )}
      </section>
      <aside className="scheduler-card scheduler-explainer">
        <h2>What happens next?</h2>
        <p>
          Your selected time is reserved while John reviews the request. A
          meeting is only confirmed once you receive his confirmation email.
        </p>
        <p>
          For times less than 24 hours away, a response before the meeting isn’t
          guaranteed. <Link to="/contact#contact-form">Contact John</Link> if
          it’s urgent.
        </p>
        <p>
          Meeting details stay private. Your automatically generated management
          code lets you return, change, or cancel. Details are removed after 90
          days, or sooner if you delete them.
        </p>
        <Link to="/calendar/manage">
          Already requested a meeting? Manage it here →
        </Link>
      </aside>
      <TimePickerDialog
        date={selectedDate}
        zone={zone}
        slots={selectedSlots}
        show={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(slot) => {
          setPickerOpen(false);
          navigate(`/calendar/book/${slot.scheduleDate}?start=${slot.startMs}`);
        }}
      />
    </SchedulerLayout>
  );
}
