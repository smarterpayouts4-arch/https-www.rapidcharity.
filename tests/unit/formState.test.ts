import assert from "node:assert/strict";
import test from "node:test";
import { resolveFormState } from "../../lib/application/formState";
import { DEFAULT_APPLICATION_FORM, DEFAULT_INTAKES, applicationFormSchema } from "../../lib/content/schema/schedule";

const now = new Date("2026-10-17T12:00:00+05:00");

test("default stays always open under spring-2027", () => {
  const state = resolveFormState(DEFAULT_APPLICATION_FORM, DEFAULT_INTAKES, now);
  assert.equal(state.open, true);
  assert.equal(state.cycleId, "spring-2027");
  assert.equal(state.cycleName, "Spring Semester 2027");
});

test("closed names the next intake", () => {
  const state = resolveFormState({ ...DEFAULT_APPLICATION_FORM, availability: "closed" }, DEFAULT_INTAKES, now);
  assert.equal(state.open, false);
  assert.match(state.closedMessage, /Fall Semester 2027, with a deadline of 15 April 2027/);
});

test("follow-intake is open only inside the intake window", () => {
  const follow = { ...DEFAULT_APPLICATION_FORM, availability: "follow-intake" as const };
  assert.equal(resolveFormState(follow, DEFAULT_INTAKES, now).open, false);
  assert.equal(resolveFormState(follow, DEFAULT_INTAKES, new Date("2026-09-01T12:00:00+05:00")).open, true);
});

test("follow-intake covers before, during, deadline day, and after", () => {
  const follow = { ...DEFAULT_APPLICATION_FORM, availability: "follow-intake" as const };
  assert.equal(resolveFormState(follow, DEFAULT_INTAKES, new Date("2026-04-15T12:00:00+05:00")).open, false);
  assert.equal(resolveFormState(follow, DEFAULT_INTAKES, new Date("2026-04-16T12:00:00+05:00")).open, true);
  assert.equal(resolveFormState(follow, DEFAULT_INTAKES, new Date("2026-10-10T12:00:00+05:00")).open, true);
  assert.equal(resolveFormState(follow, DEFAULT_INTAKES, new Date("2026-10-15T12:00:00+05:00")).open, true);
  assert.equal(resolveFormState(follow, DEFAULT_INTAKES, new Date("2026-10-16T12:00:00+05:00")).open, false);
});

test("cycle id must be a batch id", () => {
  assert.equal(applicationFormSchema.safeParse({ ...DEFAULT_APPLICATION_FORM, cycleId: "../x" }).success, false);
  assert.equal(applicationFormSchema.safeParse({ ...DEFAULT_APPLICATION_FORM, cycleId: "fall-2099" }).success, true);
});
