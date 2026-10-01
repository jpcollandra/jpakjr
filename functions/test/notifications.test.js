const { test } = require("node:test");
const assert = require("node:assert/strict");
const { notification } = require("../notifications");
const D = require("../domain");
const booking = {
  id: "local-test",
  name: "Test Visitor",
  email: "visitor@example.test",
  company: "",
  opportunity: "",
  meetingType: "video",
  contact: "",
  notes: "",
  viewerTimeZone: "Asia/Tokyo",
  startMs: Date.parse("2026-10-01T19:00:00Z"),
  endMs: Date.parse("2026-10-01T19:30:00Z"),
};
test("video requests need only name and email; phone and location still require contact", () => {
  assert.equal(D.validateDetails(booking).contact, "");
  assert.equal(
    D.validateDetails({
      ...booking,
      company: undefined,
      opportunity: undefined,
    }).company,
    "",
  );
  assert.throws(
    () => D.validateDetails({ ...booking, meetingType: "phone" }),
    /phone/,
  );
  assert.throws(
    () => D.validateDetails({ ...booking, meetingType: "in-person" }),
    /location/,
  );
  assert.throws(() => D.validateDetails(booking, true), /video/);
  assert.throws(
    () =>
      D.validateDetails({ ...booking, contact: "http://example.test" }, true),
    /HTTPS/,
  );
  assert.equal(
    D.validateDetails(
      { ...booking, contact: "https://example.test/call" },
      true,
    ).contact,
    "https://example.test/call",
  );
});
test("visitor request email leads with pending state and local date, carries code and direct return link", () => {
  const mail = notification(
    booking,
    "requested",
    "visitor",
    "https://example.test/",
    "ABC23456",
  );
  assert.match(mail.text, /waiting for John’s confirmation/);
  assert.match(mail.text, /Friday, October 2, 2026/);
  assert.ok(
    mail.text.indexOf("Asia/Tokyo") < mail.text.indexOf("Pacific/Honolulu"),
  );
  assert.match(mail.text, /Management code: ABC23456/);
  assert.match(
    mail.text,
    /https:\/\/example.test\/calendar\/manage\?booking=local-test/,
  );
  assert.equal(mail.replyTo, D.ADMIN_EMAIL);
  assert.match(mail.text, /Contact John for help:\nhttps:\/\/example.test\/contact#contact-form/);
});
test("admin email identifies requester and review action without disclosing visitor code", () => {
  const mail = notification(
    booking,
    "requested",
    "admin",
    "https://example.test",
    "ABC23456",
  );
  assert.match(mail.subject, /Test Visitor/);
  assert.match(mail.text, /Requester: Test Visitor <visitor@example.test>/);
  assert.match(mail.text, /Review this request/);
  assert.ok(!mail.text.includes("ABC23456"));
  assert.equal(mail.replyTo, booking.email);
});
test("decline email supplies explanation and recovery action", () => {
  const mail = notification(
    { ...booking, declineReason: "Away that day. Please try Friday." },
    "declined",
    "visitor",
    "https://example.test",
  );
  assert.match(mail.text, /Away that day/);
  assert.match(mail.text, /Choose another time/);
});
