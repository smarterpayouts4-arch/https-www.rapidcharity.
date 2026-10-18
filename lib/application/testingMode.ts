/**
 * Testing mode for the public application form.
 *
 * On when any of these is true:
 * 1. NODE_ENV is not production (local dev and previews built as dev).
 * 2. NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS=1 (or ENABLE_MOCK_APPLICATIONS=1)
 *    was set for the build. This is an explicit opt-in, so it is honoured
 *    even on Vercel; it is not set on the production deployment.
 * 3. The private demo unlock (?demo=rapid2027) is active in that browser.
 *    That path is decided by mockGate.sampleModeAllowed and passed in by
 *    the page, so on Vercel production the empty walk is available only
 *    with the unlock. ?demo=off turns it off again in that browser.
 *
 * When on, the form bypasses per-step validation for navigation, shows no
 * required errors, and Submit never stores a real application: it shows
 * the testing receipt instead. Server validation in /api/applications is
 * unchanged, so a direct POST still has to pass the real Zod rules.
 */
export const TESTING_BANNER_TEXT =
  "Testing mode: you can move through the form without filling anything in.";

export const TESTING_SUBMIT_TEXT = "<Testing mode> This would submit now. Nothing was sent.";

/** Environment part of testing mode (no request or browser unlock involved). */
export function testingModeFromEnv(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return (
    process.env.NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS === "1" ||
    process.env.ENABLE_MOCK_APPLICATIONS === "1"
  );
}
