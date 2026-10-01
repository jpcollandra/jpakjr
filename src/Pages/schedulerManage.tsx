import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  Booking,
  Day,
  errorMessage,
  schedulerApi,
  Session,
} from "../scheduler/api";
import {
  addDays,
  BASE_ZONE,
  dateLabel,
  downloadInvite,
  localDate,
  timeLabel,
} from "../scheduler/time";
import {
  ConfirmDialog,
  ManagementCode,
  MeetingTimes,
  Notice,
  SchedulerLayout,
  ZoneSelect,
} from "../scheduler/components";
import { MeetingEditor } from "./schedulerBooking";
import { managementCode, useSchedulerTimezone } from "../scheduler/preferences";
import AvatarLoader from "../components/AvatarLoader";

const mailLabel = (event: string) =>
  (
    ({
      requested: "Request received",
      "request-updated": "Request updated",
      confirmed: "Confirmation",
      updated: "Meeting updated",
      cancelled: "Cancellation",
      "request-cancelled": "Request cancelled",
      declined: "Request declined",
      "access-updated": "Management code reset",
    }) as Record<string, string>
  )[event] || "Meeting update";

const statusLabel = (status: Booking["status"]) =>
  ({
    requested: "Awaiting approval",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    declined: "Declined",
  })[status];

function AvailabilityEditor({ onSaved }: { onSaved: () => void }) {
  const [date, setDate] = useState(localDate());
  const [zone, setZone] = useState(BASE_ZONE);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<"save" | "reset" | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setNotice("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setLoading(false);
      return;
    }
    schedulerApi<Day>("day", { date })
      .then((day) => {
        if (active) {
          setZone(day.timeZone);
          setStartTime(day.startTime);
          setEndTime(day.endTime);
          setClosed(day.closed);
        }
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
  }, [date]);
  async function save() {
    setSaving(true);
    setError("");
    try {
      await schedulerApi(
        confirm === "reset" ? "clearAvailability" : "availability",
        { date, timeZone: zone, startTime, endTime, closed },
      );
      const day = await schedulerApi<Day>("day", { date });
      setZone(day.timeZone);
      setStartTime(day.startTime);
      setEndTime(day.endTime);
      setClosed(day.closed);
      setNotice(
        "Availability saved. Existing meetings kept their original times.",
      );
      setConfirm(null);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="scheduler-card">
      <h2>Availability for a specific date</h2>
      <p>
        Change hours or timezone, or close a date. Existing meetings will keep
        their original times.
      </p>
      {notice && <Notice>{notice}</Notice>}
      {error && !confirm && <Notice error>{error}</Notice>}
      {loading && (
        <AvatarLoader variant="compact" label="Loading availability…" />
      )}
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          setConfirm("save");
          setError("");
        }}
      >
        <div className="scheduler-form-grid">
          <div className="scheduler-field">
            <label htmlFor="availability-date">Date</label>
            <input
              id="availability-date"
              type="date"
              required
              value={date}
              min={localDate()}
              max={addDays(localDate(), 60)}
              onInput={(e) => setDate(e.currentTarget.value)}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <ZoneSelect
            value={zone}
            onChange={setZone}
            id="availability-zone"
            label="Calendar timezone for this date"
            disabled={loading}
          />
        </div>
        <fieldset disabled={loading}>
          <legend className="visually-hidden">Available hours</legend>
          <div className="scheduler-form-grid">
            <div className="scheduler-field">
              <label htmlFor="availability-start">Start time</label>
              <input
                id="availability-start"
                required
                type="time"
                step={1800}
                value={startTime}
                onInput={(e) => setStartTime(e.currentTarget.value)}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="scheduler-field">
              <label htmlFor="availability-end">End time</label>
              <input
                id="availability-end"
                required
                type="time"
                step={1800}
                value={endTime}
                onInput={(e) => setEndTime(e.currentTarget.value)}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <label className="scheduler-check">
            <input
              type="checkbox"
              checked={closed}
              onChange={(e) => setClosed(e.target.checked)}
            />
            Close this date to new bookings
          </label>
        </fieldset>
        <div className="scheduler-actions">
          <button className="scheduler-button" disabled={loading} type="submit">
            Review availability
          </button>
          <button
            className="scheduler-button secondary"
            disabled={loading}
            type="button"
            onClick={() => {
              setError("");
              setConfirm("reset");
            }}
          >
            Restore default hours
          </button>
        </div>
      </form>
      {confirm && (
        <ConfirmDialog
          title={
            confirm === "reset"
              ? "Restore default availability?"
              : "Save this availability?"
          }
          onCancel={() => setConfirm(null)}
          onConfirm={save}
          busy={saving}
          error={error}
          confirmLabel={
            confirm === "reset" ? "Restore defaults" : "Save availability"
          }
        >
          <p>{dateLabel(date)}</p>
          <p>
            {confirm === "reset"
              ? "Use the default weekday schedule, 9 AM–5 PM HST. Weekends are unavailable by default."
              : `${closed ? "Closed to new bookings" : `${startTime}–${endTime}`} · ${zone.replace(/_/g, " ")}`}
          </p>
          <p>
            Existing meetings will keep their original times. Unbooked times
            will use the new schedule.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}

export default function SchedulerManage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const [session, setSession] = useState<Session>({ role: null });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [checkingMessages, setCheckingMessages] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<
    "approve" | "decline" | "cancel" | "delete" | "resetPin" | null
  >(null);
  const [newPin, setNewPin] = useState("");
  const [approvalLink, setApprovalLink] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [retryUntil, setRetryUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [zone, setZone] = useSchedulerTimezone();
  const [messages, setMessages] = useState<
    {
      id: string;
      event: string;
      status: string;
      recipient: string;
      createdAt: number;
      sentAt?: number;
    }[]
  >([]);
  const [filter, setFilter] = useState("all");
  const [revision, setRevision] = useState(0);
  const visibleBookings = bookings
    .filter((item) => filter === "all" || item.status === filter)
    .sort(
      (a, b) =>
        Number(b.status === "requested") - Number(a.status === "requested") ||
        a.startMs - b.startMs,
    );
  const booking = visibleBookings.find((item) => item.id === selectedId);
  const refresh = useCallback(async (preferred?: string) => {
    setError("");
    const current = await schedulerApi<Session>("session");
    setSession(current);
    const items =
      current.role === "admin"
        ? (await schedulerApi<{ bookings: Booking[] }>("list")).bookings
        : current.booking
          ? [current.booking]
          : [];
    items.sort(
      (a, b) =>
        Number(b.status === "requested") - Number(a.status === "requested") ||
        a.startMs - b.startMs,
    );
    setBookings(items);
    setSelectedId((previous) =>
      preferred && items.some((item) => item.id === preferred)
        ? preferred
        : items.some((item) => item.id === previous)
          ? previous
          : items[0]?.id || "",
    );
    setRevision((value) => value + 1);
  }, []);
  useEffect(() => {
    refresh(params.get("requested") || params.get("booking") || undefined)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [params, refresh]);
  useEffect(() => {
    if (!retryUntil) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= retryUntil) {
        setRetryUntil(0);
        setError("");
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let checks = 0;
    setMessages([]);
    if (!booking) return;
    setCheckingMessages(true);
    function checkMail() {
      schedulerApi<{
        messages: {
          id: string;
          event: string;
          status: string;
          recipient: string;
          createdAt: number;
          sentAt?: number;
        }[];
      }>("mailStatus", { id: booking!.id })
        .then((value) => {
          if (!active) return;
          setMessages(value.messages);
          if (
            ++checks < 10 &&
            value.messages.some((message) =>
              ["queued", "sending"].includes(message.status),
            )
          )
            timer = setTimeout(checkMail, 3000);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setCheckingMessages(false);
        });
    }
    checkMail();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [booking, revision]);
  async function unlock(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await schedulerApi<Session>("unlock", { pin });
      setPin("");
      setNotice("");
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
      const retryDetails = (
        err as { details?: { retryAt?: number; retryAfterSeconds?: number } }
      ).details;
      const retryAt = retryDetails?.retryAfterSeconds
        ? Date.now() + retryDetails.retryAfterSeconds * 1000
        : retryDetails?.retryAt;
      if (retryAt) {
        setRetryUntil(retryAt);
        setNow(Date.now());
      }
      document.getElementById("access-pin")?.focus();
    } finally {
      setSaving(false);
    }
  }
  async function logout() {
    setSaving(true);
    setSigningOut(true);
    try {
      await schedulerApi("logout");
      setSession({ role: null });
      setBookings([]);
      setSelectedId("");
      setEditing(false);
      setNotice(
        "You are signed out. Enter an access code to manage a meeting.",
      );
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
      setSigningOut(false);
    }
  }
  async function mutate() {
    if (!booking || !dialog) return;
    if (dialog === "approve" && booking.meetingType === "video") {
      try {
        if (new URL(approvalLink).protocol !== "https:") throw new Error();
      } catch {
        setError("Enter a valid HTTPS video meeting link.");
        return;
      }
    }
    if (dialog === "resetPin" && !/^[a-zA-Z0-9]{8,16}$/.test(newPin)) {
      setError("Choose an access code with 8–16 letters and numbers.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await schedulerApi(dialog, {
        id: booking.id,
        version: booking.version,
        pin: dialog === "resetPin" ? newPin : undefined,
        contact:
          dialog === "approve" && booking.meetingType === "video"
            ? approvalLink
            : undefined,
        reason: dialog === "decline" ? declineReason : undefined,
      });
      setNotice(
        dialog === "delete"
          ? "Booking and stored personal details deleted."
          : dialog === "approve"
            ? "Meeting approved. Calendar invitations are queued."
            : dialog === "decline"
              ? "Meeting request declined. The requested time is available again."
              : dialog === "cancel"
                ? "Meeting cancelled. The time is available again."
                : "Access code reset. The previous code can no longer access this meeting.",
      );
      setNewPin("");
      setDialog(null);
      setFilter("all");
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  function saved(updated: Booking) {
    setEditing(false);
    setNotice(
      updated.status === "requested"
        ? "Request saved. John will review the preferred time before it is confirmed."
        : "Meeting saved. Updated email notifications are queued.",
    );
    refresh(updated.id).catch((err) => setError(errorMessage(err)));
  }
  return (
    <SchedulerLayout
      title={
        session.role === "admin" ? "Manage your calendar" : "Manage a meeting"
      }
      subtitle={
        session.role === "admin"
          ? "Review meetings, manage availability, and help visitors with their bookings."
          : session.role === "recruiter"
            ? "View your request, choose a new time, or delete your stored details."
            : "Enter your access code to view, update, reschedule, cancel, or delete your request."
      }
    >
      {loading ? (
        <AvatarLoader label="Checking your access…" />
      ) : (
        <>
          {notice && <Notice>{notice}</Notice>}
          {error && !dialog && session.role && (
            <Notice error focus>
              {error}
            </Notice>
          )}
          {!session.role ? (
            <section className="scheduler-card scheduler-access">
              <h2>Enter your management code</h2>
              <form onSubmit={unlock}>
                <div className="scheduler-field">
                  <label htmlFor="access-pin">
                    Management code (from your email)
                  </label>
                  <input
                    id="access-pin"
                    type="password"
                    required
                    autoComplete="current-password"
                    maxLength={100}
                    value={pin}
                    aria-invalid={!!error}
                    aria-describedby={error ? "access-error" : undefined}
                    onChange={(e) => {
                      setPin(e.target.value);
                      if (!retryUntil) setError("");
                    }}
                  />
                  {error && (
                    <p
                      className="scheduler-field-error"
                      role={retryUntil ? undefined : "alert"}
                      aria-live={retryUntil ? "off" : undefined}
                      id="access-error"
                    >
                      {retryUntil
                        ? `Too many incorrect codes. Try again in ${Math.floor(Math.max(0, Math.ceil((retryUntil - now) / 1000)) / 60)}m ${Math.max(0, Math.ceil((retryUntil - now) / 1000)) % 60}s.`
                        : error}
                    </p>
                  )}
                </div>
                <button
                  className="scheduler-button"
                  disabled={saving || retryUntil > now}
                >
                  {saving ? (
                    <AvatarLoader variant="inline" label="Checking…" />
                  ) : (
                    "Open meeting"
                  )}
                </button>
              </form>
              <p>
                Lost your access code?{" "}
                <Link to="/contact#contact-form">
                  Contact John for a reset.
                </Link>
              </p>
            </section>
          ) : (
            <>
              <div className="scheduler-toolbar">
                <p className="scheduler-badge">
                  {session.role === "admin" ? "Admin access" : "Your meeting"} ·
                  Access lasts 30 minutes
                </p>
                <div className="scheduler-actions">
                  <button
                    className="scheduler-button secondary"
                    disabled={refreshing || saving}
                    onClick={() => {
                      setRefreshing(true);
                      refresh()
                        .catch((err) => setError(errorMessage(err)))
                        .finally(() => setRefreshing(false));
                    }}
                  >
                    {refreshing ? (
                      <AvatarLoader
                        variant="inline"
                        label="Refreshing meetings…"
                      />
                    ) : (
                      "Refresh meetings"
                    )}
                  </button>
                  <button
                    className="scheduler-button secondary"
                    disabled={saving || refreshing}
                    onClick={logout}
                  >
                    {signingOut ? (
                      <AvatarLoader variant="inline" label="Signing out…" />
                    ) : (
                      "Sign out"
                    )}
                  </button>
                </div>
              </div>
              {params.get("requested") === booking?.id &&
                session.role !== "admin" &&
                booking?.status === "requested" &&
                !notice && (
                  <Notice>
                    <strong>
                      Request sent—waiting for John’s confirmation.
                    </strong>
                    <p>
                      Your time is reserved, but the meeting is not confirmed
                      yet. John will email you after reviewing it. A response
                      before a short-notice meeting isn’t guaranteed; contact
                      John directly if it’s urgent.
                    </p>
                  </Notice>
                )}
              {session.role !== "admin" &&
                params.get("requested") === booking?.id &&
                location.state?.accessCode && (
                  <ManagementCode code={location.state.accessCode} />
                )}
              {session.role === "admin" && (
                <>
                  <div className="scheduler-toolbar">
                    <h2>Meeting requests and meetings ({bookings.length})</h2>
                    <Link
                      className="scheduler-button"
                      to={`/calendar/book/${localDate(Date.now(), zone)}`}
                    >
                      Create a meeting
                    </Link>
                  </div>
                  <div className="scheduler-field">
                    <label htmlFor="booking-filter">Show meetings</label>
                    <select
                      id="booking-filter"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All meetings</option>
                      <option value="confirmed">Confirmed meetings</option>
                      <option value="requested">
                        Requests awaiting approval
                      </option>
                      <option value="cancelled">Cancelled meetings</option>
                      <option value="declined">Declined requests</option>
                    </select>
                  </div>
                  <div className="scheduler-booking-list">
                    {visibleBookings.length ? (
                      visibleBookings.map((item) => (
                        <button
                          key={item.id}
                          className={`scheduler-booking-choice ${item.id === selectedId ? "selected" : ""}`}
                          onClick={() => {
                            setSelectedId(item.id);
                            setEditing(false);
                          }}
                          aria-pressed={item.id === selectedId}
                        >
                          <strong>
                            {item.name}
                            {item.company ? ` · ${item.company}` : ""}
                          </strong>
                          <span>
                            {timeLabel(item.startMs, zone)} ·{" "}
                            {statusLabel(item.status)}
                            {item.shortNotice &&
                            item.status !== "cancelled" &&
                            item.status !== "declined"
                              ? " · ⚠ Short notice"
                              : ""}
                          </span>
                        </button>
                      ))
                    ) : (
                      <Notice>No meetings to show.</Notice>
                    )}
                  </div>
                </>
              )}
              {booking &&
                (editing ? (
                  <MeetingEditor
                    key={booking.id}
                    initialDate={booking.date}
                    booking={booking}
                    onSaved={saved}
                    onClose={() => setEditing(false)}
                    admin={session.role === "admin"}
                  />
                ) : (
                  <section className="scheduler-card">
                    <div className="scheduler-toolbar">
                      <h2>
                        {booking.company || booking.name}
                        {booking.opportunity ? ` · ${booking.opportunity}` : ""}
                      </h2>
                      <span
                        className={`scheduler-badge ${booking.status === "cancelled" || booking.status === "declined" ? "cancelled" : ""}`}
                      >
                        {statusLabel(booking.status)}
                      </span>
                    </div>
                    <ZoneSelect value={zone} onChange={setZone} />
                    <MeetingTimes
                      startMs={booking.startMs}
                      endMs={booking.endMs}
                      zones={[zone]}
                    />
                    {booking.status === "declined" && (
                      <Notice>
                        <strong>John couldn’t confirm this time.</strong>
                        <p>
                          {booking.declineReason ||
                            "The requested time isn’t available for this conversation. You can choose another time below."}
                        </p>
                      </Notice>
                    )}
                    {booking.status === "requested" &&
                      params.get("requested") !== booking.id && (
                        <p>
                          This request is awaiting John’s confirmation. You’ll
                          receive an email after it’s reviewed.
                        </p>
                      )}
                    {booking.shortNotice &&
                      booking.status !== "cancelled" &&
                      booking.status !== "declined" && (
                        <div className="scheduler-warning">
                          ⚠ Short-notice meeting: this was booked less than 24
                          hours ahead.
                        </div>
                      )}
                    <dl className="scheduler-details">
                      <dt>Name</dt>
                      <dd>{booking.name}</dd>
                      <dt>Email</dt>
                      <dd>{booking.email}</dd>
                      <dt>Meeting type</dt>
                      <dd>
                        {booking.meetingType === "in-person"
                          ? "In person"
                          : booking.meetingType === "video"
                            ? "Video call"
                            : "Phone call"}
                      </dd>
                      <dt>
                        {booking.meetingType === "in-person"
                          ? "Location"
                          : booking.meetingType === "video"
                            ? booking.status === "confirmed"
                              ? "Meeting link"
                              : booking.status === "requested"
                                ? "Video preference"
                                : "Previous video link"
                            : "Phone number"}
                      </dt>
                      <dd>
                        {booking.meetingType === "video" &&
                        booking.status === "confirmed" &&
                        /^https?:\/\//i.test(booking.contact) ? (
                          <a
                            href={booking.contact}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {booking.contact}
                          </a>
                        ) : (
                          booking.contact ||
                          "John will provide a video link when confirming."
                        )}
                      </dd>
                      {booking.notes && (
                        <>
                          <dt>Notes</dt>
                          <dd>{booking.notes}</dd>
                        </>
                      )}
                    </dl>
                    <div className="scheduler-actions">
                      <button
                        className="scheduler-button"
                        onClick={() => setEditing(true)}
                      >
                        {booking.status === "cancelled" ||
                        booking.status === "declined"
                          ? "Choose another time"
                          : "Edit or reschedule"}
                      </button>
                      {(booking.status === "confirmed" ||
                        booking.status === "cancelled") && (
                        <button
                          className="scheduler-button secondary"
                          onClick={() => downloadInvite(booking)}
                        >
                          {booking.status === "cancelled"
                            ? "Download cancellation"
                            : "Download calendar invite"}
                        </button>
                      )}
                      {(booking.status === "confirmed" ||
                        booking.status === "requested") && (
                        <button
                          className="scheduler-button secondary"
                          onClick={() => {
                            setError("");
                            setDialog("cancel");
                          }}
                        >
                          {booking.status === "requested"
                            ? "Cancel request"
                            : "Cancel meeting"}
                        </button>
                      )}
                      {session.role === "admin" && (
                        <>
                          {booking.status === "requested" && (
                            <>
                              <button
                                className="scheduler-button"
                                onClick={() => {
                                  setError("");
                                  setApprovalLink(
                                    /^https:\/\//i.test(booking.contact)
                                      ? booking.contact
                                      : "",
                                  );
                                  setDialog("approve");
                                }}
                              >
                                Approve meeting
                              </button>
                              <button
                                className="scheduler-button danger"
                                onClick={() => {
                                  setError("");
                                  setDeclineReason("");
                                  setDialog("decline");
                                }}
                              >
                                Decline request
                              </button>
                            </>
                          )}
                          <button
                            className="scheduler-button secondary"
                            onClick={() => {
                              setNewPin(managementCode());
                              setError("");
                              setDialog("resetPin");
                            }}
                          >
                            Reset access code
                          </button>
                        </>
                      )}
                    </div>
                    <details className="scheduler-busy">
                      <summary>Privacy and permanent deletion</summary>
                      <p>
                        Permanently removes this booking and its stored personal
                        details. This cannot be undone. Cancel an active meeting
                        first so everyone is notified.
                      </p>
                      <button
                        className="scheduler-button danger"
                        disabled={
                          booking.status === "confirmed" ||
                          booking.status === "requested"
                        }
                        onClick={() => {
                          setError("");
                          setDialog("delete");
                        }}
                      >
                        Delete booking and data
                      </button>
                    </details>
                    <details className="scheduler-busy">
                      <summary>Email delivery status</summary>
                      {checkingMessages ? (
                        <AvatarLoader
                          variant="compact"
                          label="Checking notifications…"
                        />
                      ) : messages.length ? (
                        messages
                          .sort((a, b) => b.createdAt - a.createdAt)
                          .map((message, index) => (
                            <p key={message.id || index}>
                              <strong>{mailLabel(message.event)}</strong> ·{" "}
                              {message.recipient} ·{" "}
                              {message.status === "not-configured"
                                ? "Email service needs configuration"
                                : message.status === "sent"
                                  ? "Sent"
                                  : message.status === "failed"
                                    ? "Delivery failed; contact John for help"
                                    : "Delivery pending"}
                              <br />
                              <time
                                dateTime={new Date(
                                  message.sentAt || message.createdAt,
                                ).toISOString()}
                              >
                                {message.sentAt ? "Sent " : "Queued "}
                                {timeLabel(
                                  message.sentAt || message.createdAt,
                                  zone,
                                )}
                              </time>
                            </p>
                          ))
                      ) : (
                        <p>
                          No delivery updates yet. Use “Refresh meetings” to
                          check again.
                        </p>
                      )}
                    </details>
                  </section>
                ))}
              {session.role === "admin" && (
                <details className="scheduler-card">
                  <summary>Availability settings</summary>
                  <AvailabilityEditor
                    onSaved={() => setRevision((value) => value + 1)}
                  />
                </details>
              )}
            </>
          )}
        </>
      )}
      {dialog && booking && (
        <ConfirmDialog
          title={
            dialog === "approve"
              ? "Approve this meeting?"
              : dialog === "decline"
                ? "Decline this request?"
                : dialog === "cancel"
                  ? booking.status === "requested"
                    ? "Cancel this request?"
                    : "Cancel this meeting?"
                  : dialog === "delete"
                    ? "Permanently delete this booking?"
                    : "Reset this meeting’s access code?"
          }
          confirmLabel={
            dialog === "approve"
              ? "Approve and send invitations"
              : dialog === "decline"
                ? "Decline request"
                : dialog === "cancel"
                  ? booking.status === "requested"
                    ? "Yes, cancel request"
                    : "Yes, cancel meeting"
                  : dialog === "delete"
                    ? "Delete booking permanently"
                    : "Reset access code"
          }
          busy={saving}
          danger={dialog !== "resetPin" && dialog !== "approve"}
          error={error}
          onCancel={() => {
            setDialog(null);
            setError("");
          }}
          onConfirm={mutate}
        >
          <p>
            {booking.name} · {booking.company}
          </p>
          <MeetingTimes
            startMs={booking.startMs}
            endMs={booking.endMs}
            zones={[zone]}
          />
          {dialog === "approve" ? (
            <>
              <p>
                This confirms the meeting and emails a calendar invitation to
                both attendees.
              </p>
              {booking.meetingType === "video" && (
                <div className="scheduler-field">
                  <label htmlFor="approval-link">Video meeting link</label>
                  <input
                    id="approval-link"
                    type="url"
                    placeholder="https://meet.google.com/…"
                    value={approvalLink}
                    maxLength={500}
                    required
                    aria-invalid={!!error}
                    onChange={(event) => {
                      setApprovalLink(event.target.value);
                      setError("");
                    }}
                  />
                  <p>
                    John’s video link will be included in the confirmation and
                    calendar invitation.
                  </p>
                </div>
              )}
            </>
          ) : dialog === "decline" ? (
            <>
              <p>
                The visitor will be notified and can choose another time. This
                time will become available again.
              </p>
              <div className="scheduler-field">
                <label htmlFor="decline-reason">
                  Explanation for the visitor (optional)
                </label>
                <textarea
                  id="decline-reason"
                  rows={3}
                  maxLength={1000}
                  value={declineReason}
                  onChange={(event) => setDeclineReason(event.target.value)}
                />
                <p>
                  If left blank, the email explains that John isn’t available
                  for this time.
                </p>
              </div>
            </>
          ) : dialog === "cancel" ? (
            <p>
              This cancels the meeting and notifies both attendees by email.
              Your management code still works, so you can choose another time
              or delete your stored information.
            </p>
          ) : dialog === "delete" ? (
            <p>
              This removes the booking, personal details, queued email records,
              and reserved access codes. This cannot be undone. Download any
              invitation you need first. To notify attendees that a confirmed
              meeting is cancelled, cancel it before deleting its data.
            </p>
          ) : (
            <>
              <p>
                The previous management code will stop working. A new code is
                generated automatically and will be emailed to the visitor.
              </p>
              <div className="scheduler-field">
                <p>
                  New management code: <code>{newPin}</code>
                </p>
              </div>
            </>
          )}
        </ConfirmDialog>
      )}
    </SchedulerLayout>
  );
}
