const { DateTime } = require("luxon");
const { ADMIN_EMAIL, BASE_ZONE } = require("./domain");
const labels = {
  requested: "Meeting request received",
  "request-updated": "Meeting request updated",
  confirmed: "Meeting confirmed",
  updated: "Meeting updated",
  cancelled: "Meeting cancelled",
  "request-cancelled": "Meeting request cancelled",
  declined: "Meeting request declined",
  "access-updated": "Management code updated",
};
function notification(booking, event, audience, siteUrl, accessCode) {
  const admin = audience === "admin";
  const label = labels[event] || "Meeting update";
  const subject = `${label}: ${booking.name}${booking.company ? ` — ${booking.company}` : ""}`;
  const zones = [
    ...new Set([
      admin ? BASE_ZONE : booking.viewerTimeZone || BASE_ZONE,
      BASE_ZONE,
    ]),
  ];
  const times = zones
    .map(
      (zone) =>
        `${DateTime.fromMillis(booking.startMs, { zone }).toFormat("cccc, LLLL d, yyyy, h:mm a ZZZZ")} (${zone})`,
    )
    .join("\n");
  const url = `${siteUrl.replace(/\/$/, "")}/calendar/manage?booking=${encodeURIComponent(booking.id)}`;
  const contactUrl = `${siteUrl.replace(/\/$/, "")}/contact#contact-form`;
  const pending = ["requested", "request-updated"].includes(event);
  const nextStep =
    event === "declined"
      ? `${booking.declineReason || "John isn’t available for the requested time."}\nChoose another time from your meeting page.`
      : pending
        ? admin
          ? "Action needed: review this request and approve or decline it."
          : "Request sent—waiting for John’s confirmation. This is not a confirmed meeting. John will email you after reviewing it. If the time is close or you need a prompt response, contact John directly."
        : event === "confirmed"
          ? "Your meeting is confirmed. The calendar invitation is attached."
          : "View the latest meeting details using the link below.";
  const details = [
    `Requester: ${booking.name} <${booking.email}>`,
    booking.company && `Company: ${booking.company}`,
    booking.opportunity && `Opportunity: ${booking.opportunity}`,
    `Meeting type: ${booking.meetingType}`,
    booking.contact && `Contact / location: ${booking.contact}`,
    booking.notes && `Notes: ${booking.notes}`,
  ]
    .filter(Boolean)
    .join("\n");
  const code = !admin
    ? accessCode
      ? `Management code: ${accessCode}\nKeep it private. Save this email to return to your meeting.`
      : "Use the management code from your request email to open your meeting. Lost it? Contact John for a reset."
    : "Use your admin access code to review this meeting.";
  return {
    subject,
    text: `${label}\n\n${nextStep}\n\n${times}\nDuration: 30 minutes\n\n${details}\n\n${admin ? "Review this request" : "Return to your meeting"}:\n${url}\n\n${code}\n\nContact John for help:\n${contactUrl}`,
    replyTo: admin ? booking.email : ADMIN_EMAIL,
  };
}
module.exports = { notification, labels };
