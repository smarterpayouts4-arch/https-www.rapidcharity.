import assert from "node:assert/strict";
import test from "node:test";
import { resolveApplicationNow } from "../../lib/application/clock";

test("resolveApplicationNow uses RAPID_TEST_NOW when set", () => {
  const prev = process.env.RAPID_TEST_NOW;
  process.env.RAPID_TEST_NOW = "2026-10-10T07:00:00.000Z";
  try {
    assert.equal(resolveApplicationNow().toISOString(), "2026-10-10T07:00:00.000Z");
  } finally {
    if (prev === undefined) delete process.env.RAPID_TEST_NOW;
    else process.env.RAPID_TEST_NOW = prev;
  }
});
