import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // Fail the build on CI if test.only is accidentally left in source
  forbidOnly: isCI,
  // Retry failed tests on CI to reduce flakiness
  retries: isCI ? 2 : 0,
  // Limit workers on CI to avoid resource contention
  workers: isCI ? 1 : undefined,
  reporter: isCI ? 'github' : 'html',

  use: {
    baseURL: 'http://localhost:3000',
    // Capture trace on first retry — helps debug CI failures
    trace: 'on-first-retry',
    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile iPhone',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    // Use dev server locally, production build on CI (more stable)
    command: isCI ? 'pnpm build && pnpm start' : 'pnpm dev',
    url: 'http://localhost:3000',
    // Reuse already-running dev server locally to speed up iteration
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
