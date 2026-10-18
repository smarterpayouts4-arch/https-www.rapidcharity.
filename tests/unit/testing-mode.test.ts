import assert from "node:assert/strict";
import test from "node:test";
import { TESTING_BANNER_TEXT, TESTING_SUBMIT_TEXT, testingModeFromEnv } from "../../lib/application/testingMode";
import { mockApplicationsEnabled, sampleModeAllowed } from "../../lib/application/mockGate";

test("testing banner and submit text have no em dash and say nothing was sent", () => {
  assert.equal(TESTING_BANNER_TEXT, "Testing mode: you can move through the form without filling anything in.");
  assert.match(TESTING_SUBMIT_TEXT, /Nothing was sent/);
  assert.ok(!TESTING_BANNER_TEXT.includes("—") && !TESTING_SUBMIT_TEXT.includes("—"));
});

test("testing mode env gate follows NODE_ENV and the mock flag", () => {
  const saved = { ...process.env };
  try {
    delete process.env.NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS;
    delete process.env.ENABLE_MOCK_APPLICATIONS;
    (process.env as Record<string,string>).NODE_ENV = "development";
    assert.equal(testingModeFromEnv(), true);
    (process.env as Record<string,string>).NODE_ENV = "production";
    assert.equal(testingModeFromEnv(), false);
    process.env.NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS = "1";
    assert.equal(testingModeFromEnv(), true);
  } finally {
    Object.assign(process.env, saved);
  }
});

test("production Vercel gate: no unlock means sample mode stays off", () => {
  const saved = { ...process.env };
  try {
    (process.env as Record<string,string>).NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    delete process.env.NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS;
    assert.equal(mockApplicationsEnabled(), false);
    assert.equal(sampleModeAllowed(undefined), false);
    assert.equal(sampleModeAllowed("rapid2027"), true);
    assert.equal(sampleModeAllowed("off"), false);
    assert.equal(sampleModeAllowed("wrong"), false);
  } finally {
    Object.assign(process.env, saved);
  }
});
