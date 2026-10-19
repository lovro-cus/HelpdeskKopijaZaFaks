import { defineConfig } from "@playwright/test";

// A dedicated server and database keep destructive test seeding away from dev.db.
export const functionalEnv = {
  DATABASE_URL: "file:./naloga2-e2e.db",
  UPLOAD_DIR: "./uploads-sandbox/naloga2-e2e",
  DEMO_PASSWORD: "Kroj-Demo-2026",
  NEXT_TELEMETRY_DISABLED: "1",
};

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: "http://localhost:3100",
    channel: "chrome",
    locale: "sl-SI",
    viewport: { width: 1440, height: 1000 },
    screenshot: "on",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run dev --port 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: functionalEnv,
  },
});
