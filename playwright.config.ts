import { defineConfig, type ReporterDescription } from "@playwright/test";

// A dedicated server and database keep destructive test seeding away from dev.db.
export const functionalEnv = {
  DATABASE_URL: "file:./naloga2-e2e.db",
  UPLOAD_DIR: "./uploads-sandbox/naloga2-e2e",
  DEMO_PASSWORD: "Kroj-Demo-2026",
  NEXT_TELEMETRY_DISABLED: "1",
};

// GitHub Actions sets CI=true. There the tests run against a production build
// and the bundled Chromium; locally they keep using the dev server and Chrome.
const isCI = !!process.env.CI;

const reporter: ReporterDescription[] = [
  ["list"],
  ["html", { open: "never" }],
  ["json", { outputFile: "test-results/results.json" }],
  ["junit", { outputFile: "test-results/junit.xml" }],
];
if (isCI) reporter.push(["github"]);

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter,
  use: {
    baseURL: "http://localhost:3100",
    channel: isCI ? undefined : "chrome",
    locale: "sl-SI",
    viewport: { width: 1440, height: 1000 },
    screenshot: "on",
    trace: "retain-on-failure",
  },
  webServer: {
    command: isCI
      ? "bun run db:push && bun run build && bun run start --port 3100"
      : "bun run dev --port 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
    timeout: isCI ? 300_000 : 120_000,
    env: functionalEnv,
  },
});
