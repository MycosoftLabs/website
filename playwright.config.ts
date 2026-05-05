import { defineConfig, devices } from "@playwright/test"

/**
 * Fluid Search widget E2E — May 03 2026
 * Run: `npm run test:e2e:widgets` (expects dev on 3010 or set PW_NO_WEB_SERVER=1 if already running).
 */
export default defineConfig({
  testDir: "./e2e/widgets",
  /** May 03 2026 Fluid Search rebuild only — do not glob `01-*.ts` (conflicts with legacy `01-fungi.spec.ts`, etc.) */
  testMatch: [
    "**/00-search-suggestions.spec.ts",
    "**/01-cameras.spec.ts",
    "**/02-species.spec.ts",
    "**/03-chemistry.spec.ts",
    "**/04-genetics.spec.ts",
    "**/05-news.spec.ts",
    "**/06-weather.spec.ts",
    "**/07-devices.spec.ts",
  ],
  timeout: 120_000,
  /** Serial runs avoid Next dev chunk timeouts + FAB race when multiple browsers hammer one server (May 03 2026). */
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3010",
    trace: "on-first-retry",
    /** Fluid canvas + FAB use `sm:` breakpoints; stable viewport for E2E (May 03 2026). */
    viewport: { width: 1280, height: 800 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PW_NO_WEB_SERVER
    ? undefined
    : {
        command: "npm run dev:next-only",
        url: "http://127.0.0.1:3010",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
