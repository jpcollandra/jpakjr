import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Booking,
  Day,
  errorMessage,
  isAccessExpired,
  MeetingDetails,
  schedulerApi,
} from "../scheduler/api";
import { addDays, dateLabel, localDate, shortTime } from "../scheduler/time";
import {
  MeetingTimes,
  Notice,
  SchedulerLayout,
  ZoneSelect,
} from "../scheduler/components";
import {
  managementCode,
  savedTimezone,
  useSchedulerTimezone,
} from "../scheduler/preferences";
import { LocalSlot, localSlots, slotsOnDate } from "../scheduler/localCalendar";
import AvatarLoader from "../components/AvatarLoader";

const emptyDetails: MeetingDetails = {
  name: "",
  email: "",
  company: "",
  opportunity: "",
  meetingType: "video",
  contact: "",
  notes: "",
};
interface Draft {
  details: MeetingDetails;
  date: string;
  startMs: number;
  entryStart: number;
  code: string;
  requestId: string;
  savedAt: number;
}
function readDraft(key: string): Draft | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    if (
      value &&
      value.savedAt > Date.now() - 86400000 &&
      value.details &&
      typeof value.code === "string" &&
      typeof value.requestId === "string"
    )
      return value;
    sessionStorage.removeItem(key);
  } catch {
    /* A missing draft never prevents booking. */
  }
  return null;
}
export function MeetingEditor({
  initialDate,
  initialStart = 0,
  booking,
  onSaved,
  onClose,
}: {
  initialDate: string;
  initialStart?: number;
  booking?: Booking;
  onSaved: (booking: Booking, code?: string) => void;
  onClose?: () => void;
  admin?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const draftKey = `scheduler-draft-${booking ? `${booking.id}-${booking.version}` : "new"}`;
  const [draft] = useState(() => readDraft(draftKey));
  const [zone, setZone] = useSchedulerTimezone();
  const activeBooking =
    booking?.status === "requested" || booking?.status === "confirmed";
  const sameEntry = draft && draft.entryStart === initialStart;
  const firstStart = sameEntry
    ? draft!.startMs
    : initialStart || (activeBooking ? booking!.startMs : 0);
  const [date, setDate] = useState(() =>
    firstStart
      ? localDate(firstStart, savedTimezone())
      : sameEntry && draft?.date
        ? draft.date
        : booking
          ? [
              localDate(booking.startMs, savedTimezone()),
              localDate(Date.now(), savedTimezone()),
            ]
              .sort()
              .pop()!
          : draft?.date || initialDate,
  );
  const [days, setDays] = useState<Day[]>([]);
  const [details, setDetails] = useState<MeetingDetails>(
    draft?.details || booking || emptyDetails,
  );
  const [startMs, setStartMs] = useState(firstStart);
  const [code, setCode] = useState(() => draft?.code || managementCode());
  const [requestId] = useState(() => draft?.requestId || crypto.randomUUID());
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [reauthNeeded, setReauthNeeded] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const reviewKey = `review-${requestId}`;
  const reviewing = location.state?.schedulerReviewKey === reviewKey;
  useEffect(() => {
    heading.current?.focus();
  }, [reviewing]);
  useEffect(() => {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          details,
          date,
          startMs,
          entryStart: initialStart,
          code,
          requestId,
          savedAt: Date.now(),
        }),
      );
    } catch {
      /* Continue if storage is disabled. */
    }
  }, [details, date, startMs, code, requestId, draftKey, initialStart]);
  function clearDraft() {
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      /* No stored draft. */
    }
  }
  useEffect(() => {
    let active = true;
    setLoading(true);
    setDays([]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setLoading(false);
      return;
    }
    // A visitor's date can span multiple schedule dates, including timezone overrides.
    Promise.all(
      [-2, -1, 0, 1, 2].map((offset) =>
        schedulerApi<Day>("day", { date: addDays(date, offset) }),
      ),
    )
      .then((value) => {
        if (active) setDays(value);
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
  }, [date, revision]);
  let slots = slotsOnDate(localSlots(days, zone), date, zone).filter(
    (slot) =>
      !slot.busy || (activeBooking && slot.startMs === booking!.startMs),
  );
  const keepingOriginal =
    activeBooking && localDate(booking!.startMs, zone) === date;
  if (
    keepingOriginal &&
    !slots.some((slot) => slot.startMs === booking!.startMs)
  )
    slots = [
      {
        startMs: booking!.startMs,
        endMs: booking!.endMs,
        busy: false,
        shortNotice: booking!.shortNotice,
        scheduleDate: booking!.date,
        timeZone: booking!.originalTimeZone,
      },
      ...slots,
    ];
  slots.sort((a, b) => a.startMs - b.startMs);
  const selected: LocalSlot | undefined = slots.find(
    (slot) => slot.startMs === startMs,
  );
  const sameTime = activeBooking && startMs === booking!.startMs;
  const requestingNewTime = !!booking && (!sameTime || !activeBooking);
  const shortNotice =
    startMs > 0 && startMs - Date.now() < 86400000 && !sameTime;
  function changeZone(value: string) {
    setZone(value);
    if (startMs) setDate(localDate(startMs, value));
  }
  function changeDetail(key: keyof MeetingDetails, value: string) {
    setDetails((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  }
  function edit() {
    if (reviewing) navigate(-1);
  }
  function review(event: FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!selected) errors.time = "Choose an available meeting time.";
    if (!details.name.trim()) errors.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim()))
      errors.email = "Enter a valid email address.";
    if (
      details.meetingType === "phone" &&
      details.contact.replace(/\D/g, "").length < 6
    )
      errors.contact =
        "Enter your phone number, including the area or country code.";
    if (details.meetingType === "in-person" && !details.contact.trim())
      errors.contact = "Enter a preferred meeting location or city.";
    setFieldErrors(errors);
    setError("");
    const first = Object.keys(errors)[0];
    if (first) {
      document.getElementById(`meeting-${first}`)?.focus();
      return;
    }
    setAcknowledged(false);
    navigate(`${location.pathname}${location.search}`, {
      state: { ...location.state, schedulerReviewKey: reviewKey },
    });
  }
  async function submit() {
    if (!selected) return;
    setSaving(true);
    setError("");
    setReauthNeeded(false);
    try {
      const result = await schedulerApi<{ booking: Booking }>(
        booking ? "update" : "create",
        {
          id: booking?.id,
          version: booking?.version,
          requestId,
          date: sameTime ? booking!.date : selected.scheduleDate,
          startMs,
          details,
          timeZone: zone,
          pin: booking ? undefined : code,
          shortNoticeAcknowledged: acknowledged,
        },
      );
      clearDraft();
      onSaved(result.booking, booking ? undefined : code);
    } catch (err) {
      setError(errorMessage(err));
      setReauthNeeded(isAccessExpired(err));
      if ((err as { code?: string }).code === "functions/already-exists") {
        if (!booking && errorMessage(err).includes("access code")) {
          setCode(managementCode());
          setError(
            "Please submit again. We’ve generated a new management code for you.",
          );
        } else {
          setRevision((value) => value + 1);
          edit();
        }
      }
    } finally {
      setSaving(false);
    }
  }
  const contactLabel =
    details.meetingType === "video"
      ? booking?.status === "confirmed"
        ? "Video meeting link"
        : "Video preference (optional)"
      : details.meetingType === "phone"
        ? "Phone number"
        : "Preferred location or city";
  const errorProps = (key: string) => ({
    "aria-invalid": !!fieldErrors[key],
    "aria-describedby": fieldErrors[key] ? `error-${key}` : undefined,
  });
  const fieldError = (key: string) =>
    fieldErrors[key] && (
      <p className="scheduler-field-error" id={`error-${key}`} role="alert">
        {fieldErrors[key]}
      </p>
    );
  if (reviewing && selected)
    return (
      <section className="scheduler-card" aria-labelledby="review-title">
        <h2 id="review-title" tabIndex={-1} ref={heading}>
          {booking ? "Review your changes" : "Review your meeting request"}
        </h2>
        {requestingNewTime && booking?.status === "confirmed" && (
          <Notice>
            Requesting a new time cancels the current confirmed invitation. The
            new time will need John’s confirmation. Keep the current meeting if
            you don’t want to make that change.
          </Notice>
        )}
        {requestingNewTime && booking && (
          <div className="scheduler-previous">
            <h3>Previous time</h3>
            <MeetingTimes
              startMs={booking.startMs}
              endMs={booking.endMs}
              zones={[zone]}
            />
          </div>
        )}
        <h3>{requestingNewTime ? "Requested new time" : "Meeting time"}</h3>
        <MeetingTimes startMs={startMs} endMs={selected.endMs} zones={[zone]} />
        <dl className="scheduler-details">
          <dt>Name</dt>
          <dd>{details.name}</dd>
          <dt>Email</dt>
          <dd>{details.email}</dd>
          {details.company && (
            <>
              <dt>Company</dt>
              <dd>{details.company}</dd>
            </>
          )}
          {details.opportunity && (
            <>
              <dt>Role or opportunity</dt>
              <dd>{details.opportunity}</dd>
            </>
          )}
          <dt>Meeting type</dt>
          <dd>
            {details.meetingType === "video"
              ? "Video call"
              : details.meetingType === "phone"
                ? "Phone call"
                : "In person"}
          </dd>
          {details.contact && (
            <>
              <dt>{contactLabel}</dt>
              <dd>{details.contact}</dd>
            </>
          )}
          {details.notes && (
            <>
              <dt>Notes</dt>
              <dd>{details.notes}</dd>
            </>
          )}
        </dl>
        {details.meetingType === "video" && booking?.status !== "confirmed" && (
          <p>John will provide a video link when confirming.</p>
        )}
        {!booking && (
          <p>
            A private management code is generated for you. Save it after
            submitting; we’ll include it in your email too.
          </p>
        )}
        {shortNotice && (
          <div className="scheduler-warning">
            <h3>This time is less than 24 hours away</h3>
            <p>
              This is a request, not a confirmed meeting. John may not be able
              to respond before this time.
            </p>
            <label className="scheduler-check">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              I understand that John must still confirm this meeting.
            </label>
          </div>
        )}
        {error && (
          <Notice error focus>
            {error}
            {reauthNeeded && (
              <p>
                <Link
                  to="/calendar/manage"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sign in again in a new tab
                </Link>
                , then return and retry. Your details are kept here.
              </p>
            )}
          </Notice>
        )}
        <div className="scheduler-actions">
          <button
            className="scheduler-button secondary"
            disabled={saving}
            onClick={edit}
          >
            Edit details
          </button>
          <button
            className="scheduler-button"
            disabled={saving || (shortNotice && !acknowledged)}
            onClick={submit}
          >
            {saving ? (
              <AvatarLoader variant="inline" label="Sending…" />
            ) : requestingNewTime ? (
              "Request new time"
            ) : booking ? (
              "Save changes"
            ) : (
              "Submit request"
            )}
          </button>
        </div>
      </section>
    );
  return (
    <section className="scheduler-card">
      <h2 tabIndex={-1} ref={heading}>
        {booking
          ? activeBooking
            ? "Edit your meeting"
            : "Choose another time"
          : "Your meeting request"}
      </h2>
      {error && (
        <Notice error focus>
          {error}
          <button
            className="scheduler-button secondary"
            onClick={() => {
              setError("");
              setRevision((value) => value + 1);
            }}
          >
            Try again
          </button>
        </Notice>
      )}
      <form onSubmit={review} noValidate>
        <fieldset disabled={saving}>
          <legend className="visually-hidden">Meeting details</legend>
          <div className="scheduler-form-grid">
            <div className="scheduler-field">
              <label htmlFor="meeting-date">Date in your timezone</label>
              <input
                id="meeting-date"
                type="date"
                value={date}
                min={
                  [
                    localDate(Date.now(), zone),
                    keepingOriginal && booking
                      ? localDate(booking.startMs, zone)
                      : localDate(Date.now(), zone),
                  ].sort()[0]
                }
                max={addDays(localDate(Date.now(), zone), 62)}
                onChange={(event) => {
                  setDate(event.target.value);
                  setStartMs(0);
                }}
              />
            </div>
            <ZoneSelect value={zone} onChange={changeZone} id="meeting-zone" />
          </div>
          <div className="scheduler-field">
            <label htmlFor="meeting-time">Time · {dateLabel(date)}</label>
            {loading && (
              <AvatarLoader variant="compact" label="Loading times…" />
            )}
            <select
              id="meeting-time"
              value={selected ? startMs : ""}
              onChange={(event) => {
                setStartMs(Number(event.target.value));
                setFieldErrors((current) => ({ ...current, time: "" }));
              }}
              disabled={loading}
              {...errorProps("time")}
            >
              <option value="">
                {loading
                  ? "Loading times…"
                  : slots.length
                    ? "Choose a time"
                    : "No available times — choose another date"}
              </option>
              {slots.map((slot) => (
                <option key={slot.startMs} value={slot.startMs}>
                  {shortTime(slot.startMs, zone)}
                  {activeBooking && slot.startMs === booking!.startMs
                    ? " — keep current time"
                    : ""}
                </option>
              ))}
            </select>
            {fieldError("time")}
            <p className="scheduler-hint">
              Your local date and time are shown first. Hawaii time appears on
              review.
            </p>
          </div>
          <div className="scheduler-form-grid">
            {(["name", "email", "company", "opportunity"] as const).map(
              (key) => (
                <div className="scheduler-field" key={key}>
                  <label htmlFor={`meeting-${key}`}>
                    {
                      {
                        name: "Name",
                        email: "Email",
                        company: "Company (optional)",
                        opportunity: "Role or opportunity (optional)",
                      }[key]
                    }
                  </label>
                  <input
                    id={`meeting-${key}`}
                    value={details[key]}
                    type={key === "email" ? "email" : "text"}
                    required={key === "name" || key === "email"}
                    autoComplete={
                      {
                        name: "name",
                        email: "email",
                        company: "organization",
                        opportunity: "off",
                      }[key]
                    }
                    maxLength={
                      { name: 100, email: 254, company: 150, opportunity: 200 }[
                        key
                      ]
                    }
                    onChange={(event) => changeDetail(key, event.target.value)}
                    {...errorProps(key)}
                  />
                  {fieldError(key)}
                </div>
              ),
            )}
          </div>
          <div className="scheduler-field">
            <label htmlFor="meeting-type">How would you like to meet?</label>
            <select
              id="meeting-type"
              value={details.meetingType}
              onChange={(event) =>
                setDetails((current) => ({
                  ...current,
                  meetingType: event.target
                    .value as MeetingDetails["meetingType"],
                  contact: "",
                }))
              }
            >
              <option value="video">Video call</option>
              <option value="phone">Phone call</option>
              <option value="in-person">In person</option>
            </select>
          </div>
          {details.meetingType === "video" ? (
            <details className="scheduler-busy">
              <summary>Have a video platform preference?</summary>
              <div className="scheduler-field">
                <label htmlFor="meeting-contact">{contactLabel}</label>
                <input
                  id="meeting-contact"
                  value={details.contact}
                  maxLength={500}
                  onChange={(event) =>
                    changeDetail("contact", event.target.value)
                  }
                />
              </div>
            </details>
          ) : (
            <div className="scheduler-field">
              <label htmlFor="meeting-contact">{contactLabel}</label>
              <input
                id="meeting-contact"
                type={details.meetingType === "phone" ? "tel" : "text"}
                required
                value={details.contact}
                maxLength={500}
                onChange={(event) =>
                  changeDetail("contact", event.target.value)
                }
                {...errorProps("contact")}
              />
              {fieldError("contact")}
            </div>
          )}
          <div className="scheduler-field">
            <label htmlFor="meeting-notes">
              Anything John should know? (optional)
            </label>
            <textarea
              id="meeting-notes"
              value={details.notes}
              maxLength={2000}
              rows={3}
              onChange={(event) => changeDetail("notes", event.target.value)}
            />
          </div>
          {requestingNewTime && booking?.status === "confirmed" && (
            <Notice>
              A new time needs approval and cancels your current confirmed
              invitation. You’ll review this before sending.
            </Notice>
          )}
          {!booking && (
            <p>
              Only your name, email, and meeting time are required for a video
              request. A private management code is generated automatically.
            </p>
          )}
          <div className="scheduler-actions">
            {onClose ? (
              <button
                type="button"
                className="scheduler-button secondary"
                onClick={() => {
                  clearDraft();
                  onClose();
                }}
              >
                {activeBooking ? "Keep current meeting" : "Back to meeting"}
              </button>
            ) : (
              <Link className="scheduler-button secondary" to="/calendar">
                Back to calendar
              </Link>
            )}
            <button className="scheduler-button" disabled={loading}>
              Review request
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
export default function SchedulerBooking() {
  const { date = localDate() } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  return (
    <SchedulerLayout
      title="Request a meeting"
      subtitle="Choose a time and share your details. John will confirm by email."
    >
      <MeetingEditor
        initialDate={date}
        initialStart={Number(params.get("start")) || 0}
        onSaved={(booking, accessCode) =>
          navigate(`/calendar/manage?requested=${booking.id}`, {
            replace: true,
            state: { accessCode },
          })
        }
      />
      <p className="scheduler-hint">
        Meeting details are private.{" "}
        <Link to="/calendar">View availability</Link> or{" "}
        <Link to="/contact#contact-form">contact John</Link>.
      </p>
    </SchedulerLayout>
  );
}
