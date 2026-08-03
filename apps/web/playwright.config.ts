import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI
// PLAYWRIGHT_BASE_URL: target a stack already running elsewhere (e.g. a prod
// build served on :3100 during a smoke sweep). When set, skip the built-in
// webServer so Playwright doesn't try to spawn a second Next.js.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const useExternalStack = !!process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI
    ? [['github'], ['allure-playwright', { outputFolder: './allure-results', detail: true }]]
    : 'html',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Mobile viewport is set per spec via test.use — a WebKit project would
    // only duplicate the runs. Add one back if a Safari-only bug ships.
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: useExternalStack
    ? undefined
    : {
        // CI uses production build (more stable than dev server).
        command: isCI ? 'pnpm build && pnpm start' : 'pnpm dev',
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
      },
})
