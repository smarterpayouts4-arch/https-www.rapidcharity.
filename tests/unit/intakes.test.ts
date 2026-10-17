import assert from "node:assert/strict";
import test from "node:test";
import { applicationStatus, deadlineStatusSentence, formatIntakeDate } from "../../lib/application/intakes";

test("formats a config date without a hardcoded display string", () => {
  assert.equal(formatIntakeDate("2026-10-15"), "15 October 2026");
  assert.equal(formatIntakeDate("2027-04-15"), "15 April 2027");
});

test("spring 2027 stays open through 15 October 2026", () => {
  const status = applicationStatus(new Date("2026-10-15T23:00:00-04:00"));
  assert.equal(status.state, "open");
  assert.equal(status.title, "Spring Semester 2027 Applications Open");
  assert.equal(status.deadlineLabel, "Deadline");
  assert.equal(status.deadlineValue, "15 October 2026");
});

test("16 October 2026 is closed and names the next intake from config", () => {
  const status = applicationStatus(new Date("2026-10-16T09:00:00-04:00"));
  assert.equal(status.state, "closed");
  assert.equal(status.title, "Applications closed");
  assert.equal(status.deadlineLabel, "Next intake");
  assert.equal(status.deadlineValue, "Fall Semester 2027, 15 April 2027");
  assert.equal(deadlineStatusSentence(new Date("2026-10-16T09:00:00-04:00")), "Applications closed. Next intake: Fall Semester 2027, 15 April 2027.");
});
