import { defineConfig } from "@playwright/test";

/** Mobile form simulations (tests/sims). Uses `next start` with local sample mode so storage stays in data/. */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4731";

export default defineConfig({
  testDir: "./tests/sims",
  fullyParallel: true,
  workers: Number(process.env.SIM_WORKERS ?? 4),
  retries: 0,
  reporter: [["list"]],
  use: { baseURL, trace: "off", screenshot: "off", actionTimeout: 20_000, navigationTimeout: 120_000 },
  expect: { timeout: 15_000 },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npx next start -H 127.0.0.1 -p 4731",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          ...process.env,
          NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS: "1",
          ADMIN_LOCAL_PASSWORD: process.env.ADMIN_LOCAL_PASSWORD ?? "playwright-local",
          ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET ?? "playwright-session-secret-32",
        },
      },
});
