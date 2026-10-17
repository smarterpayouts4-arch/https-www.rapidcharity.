/**
 * Test-only sample applications ("Fill with sample data").
 *
 * On by default in `next dev`. In a production build (`next build && next start`,
 * for example the localhost:5000 preview) set this in .env.local and rebuild:
 *
 *   NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS=1
 *
 * Never set it on Vercel. As a second guard it is always off on a Vercel
 * production deployment, even if the variable is set there by mistake.
 * Read on the server only; the client receives mock data as props only when
 * this returns true, so the public bundle never contains it.
 */
export function mockApplicationsEnabled(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS === "1" || process.env.ENABLE_MOCK_APPLICATIONS === "1";
}
