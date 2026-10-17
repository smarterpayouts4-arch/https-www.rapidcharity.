import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_INTAKES,
  applicationStatus,
  deadlineStatusSentence,
  fillIntakeTokens,
  formatIntakeDate,
} from "../../lib/application/intakes";

const cfg = DEFAULT_INTAKES;

test("formats a config date without a hardcoded display string", () => {
  assert.equal(formatIntakeDate("2026-10-15"), "15 October 2026");
  assert.equal(formatIntakeDate("2027-04-15"), "15 April 2027");
});

test("open well before the deadline", () => {
  const status = applicationStatus(cfg, new Date("2026-08-01T12:00:00+05:00"));
  assert.equal(status.state, "open");
  assert.equal(status.title, "Spring Semester 2027 Applications Open");
  assert.equal(status.deadlineValue, "15 October 2026");
});

test("closing soon inside the window, through the end of 15 October Karachi time", () => {
  const status = applicationStatus(cfg, new Date("2026-10-15T23:30:00+05:00"));
  assert.equal(status.state, "closing-soon");
  assert.equal(status.title, "Spring Semester 2027 Applications Closing Soon");
  assert.equal(status.daysLeft, 0);
});

test("16 October 2026 in Karachi is closed and names the next intake", () => {
  const now = new Date("2026-10-16T00:05:00+05:00");
  const status = applicationStatus(cfg, now);
  assert.equal(status.state, "closed");
  assert.equal(status.title, "Applications closed");
  assert.equal(status.deadlineLabel, "Next intake");
  assert.equal(status.deadlineValue, "Fall Semester 2027, 15 April 2027");
  assert.equal(deadlineStatusSentence(cfg, now), "Applications closed. Next intake: Fall Semester 2027, 15 April 2027.");
});

test("upcoming when the next intake has a future opens date", () => {
  const config = { ...cfg, items: [{ ...cfg.items[1], opens: "2026-11-01" }] } as typeof cfg;
  const status = applicationStatus(config, new Date("2026-10-20T12:00:00+05:00"));
  assert.equal(status.state, "upcoming");
  assert.equal(status.title, "Fall Semester 2027 Applications Open Soon");
});

test("per-scholarship intakes filter by id", () => {
  const config = {
    ...cfg,
    items: [
      { id: "a", name: "Spring Semester 2027", opens: "2026-01-01", deadline: "2026-12-01", scholarships: ["robert-mathias" as const] },
      { id: "b", name: "Fall Semester 2027", opens: "", deadline: "2027-04-15", scholarships: [] },
    ],
  };
  const now = new Date("2026-06-01T12:00:00+05:00");
  assert.equal(applicationStatus(config, now, "robert-mathias").state, "open");
  assert.equal(applicationStatus(config, now, "ivy-azariah").state, "closed");
});

test("tokens render the deadline summary", () => {
  assert.equal(fillIntakeTokens("(x {deadlines})", cfg), "(x Spring 2027: 15 October 2026; Fall 2027: 15 April 2027)");
});
