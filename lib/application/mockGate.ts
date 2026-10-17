/**
 * Test-only sample applications (the "Test with a sample applicant" chips).
 *
 * Sample mode is on when any of these is true:
 *
 * 1. `next dev` (NODE_ENV is not production).
 * 2. A production build started with NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS=1
 *    (or ENABLE_MOCK_APPLICATIONS=1), but never on a Vercel production
 *    deployment, even if the variable is set there by mistake.
 * 3. The private unlock: the browser visited an apply URL with
 *    `?demo=rapid2027`. The key is remembered in localStorage for that browser
 *    and sent back to the server, which compares it with DEMO_UNLOCK_KEY.
 *    `?demo=off` forgets it. This works on Vercel without any env var.
 *
 * The unlock is security by obscurity only. All sample data is fake, but
 * submitting a sample still creates a real application, so the form asks for
 * confirmation before submitting while a sample is loaded.
 *
 * The key is only compared on the server (pages, /api/dev/mock-applications and
 * /api/dev/sample-documents), so it is not in the client bundle.
 */
export const DEMO_UNLOCK_KEY = "rapid2027";
export { DEMO_HEADER, DEMO_OFF, DEMO_PARAM, DEMO_STORAGE_KEY } from "./demoMode";

/** Environment gate only: dev, or the opt-in flag outside Vercel production. */
export function mockApplicationsEnabled(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS === "1" || process.env.ENABLE_MOCK_APPLICATIONS === "1";
}

/** True when a value (query parameter or header) matches the private unlock key. */
export function demoKeyMatches(value: string | string[] | null | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw === DEMO_UNLOCK_KEY;
}

/** Environment gate, or a matching unlock key from the request. */
export function sampleModeAllowed(key?: string | string[] | null): boolean {
  return mockApplicationsEnabled() || demoKeyMatches(key);
}
