/**
 * Authoritative "now" for server-side application availability (`loadFormState`).
 * Production uses real time. E2E/local servers may set `RAPID_TEST_NOW` (ISO-8601).
 */
export function resolveApplicationNow(): Date {
  const iso = process.env.RAPID_TEST_NOW?.trim();
  if (iso) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}
