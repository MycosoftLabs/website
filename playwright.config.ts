/**
 * Playwright config for website e2e (smoke, search, world view).
 * Run: npx playwright test (dev server on 3010 recommended).
 * Created: March 14, 2026
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3010',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.CI
    ? { command: 'npm run dev:next-only', url: 'http://localhost:3010', reuseExistingServer: false }
    : undefined,
})
