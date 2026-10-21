import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4721";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never", outputFolder: "qa/playwright-report" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npx next start -H 127.0.0.1 -p 4721",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          ADMIN_LOCAL_PASSWORD: process.env.ADMIN_LOCAL_PASSWORD ?? "playwright-local",
          ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET ?? "playwright-session-secret-32",
          // Mid-window Karachi date for follow-intake / API checks; unset in production deploys.
          RAPID_TEST_NOW: process.env.RAPID_TEST_NOW ?? "2026-10-10T12:00:00+05:00",
        },
      },
});
