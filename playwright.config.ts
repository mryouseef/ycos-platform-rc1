import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "artifacts/m02/playwright-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3002",
    browserName: "chromium",
    headless: true,
    launchOptions: { executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "YCOS_E2E_HARNESS_ENABLED=true pnpm exec next dev --hostname 0.0.0.0 --port 3002",
    env: { NODE_ENV: "development", YCOS_E2E_HARNESS_ENABLED: "true" },
    url: "http://127.0.0.1:3002/ar",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
