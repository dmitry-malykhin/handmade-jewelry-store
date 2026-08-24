import path from 'node:path'
import { test } from '@playwright/test'

/**
 * UX walkthrough capture — writes a fresh screenshot per (page × breakpoint
 * × theme) combo to a local directory for human review. Not a regression
 * gate — the test always passes as long as the page loads.
 *
 * Skipped by default. To enable:
 *   RUN_UX_SCREENSHOTS=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 \
 *     pnpm --filter web exec playwright test ux-screenshots.spec.ts
 *
 * Output: apps/web/test-results/ux-screenshots/{page}-{width}-{theme}.png
 */

const isEnabled = process.env.RUN_UX_SCREENSHOTS === '1'
const OUTPUT_DIR = path.join(process.cwd(), 'test-results', 'ux-screenshots')

const BREAKPOINTS = [
  { width: 320, height: 720, label: '320' },
  { width: 375, height: 812, label: '375' },
  { width: 768, height: 1024, label: '768' },
  { width: 1024, height: 768, label: '1024' },
  { width: 1440, height: 900, label: '1440' },
] as const

const PAGES = [
  { path: '/en', label: 'home' },
  { path: '/en/products', label: 'catalog' },
  { path: '/en/cart', label: 'cart' },
  { path: '/en/account', label: 'account' },
  { path: '/en/search', label: 'search' },
  { path: '/en/about', label: 'about' },
  { path: '/en/contact', label: 'contact' },
  { path: '/en/faq', label: 'faq' },
  { path: '/en/ring-size-guide', label: 'ring-size-guide' },
] as const

const THEMES = ['light', 'dark'] as const

test.describe('UX screenshot capture', () => {
  test.skip(!isEnabled, 'Opt-in — set RUN_UX_SCREENSHOTS=1 to enable')

  for (const theme of THEMES) {
    for (const breakpoint of BREAKPOINTS) {
      for (const page of PAGES) {
        test(`${page.label} @ ${breakpoint.label}px / ${theme}`, async ({
          page: playwrightPage,
        }) => {
          await playwrightPage.setViewportSize({
            width: breakpoint.width,
            height: breakpoint.height,
          })
          await playwrightPage.addInitScript(
            ({ chosenTheme }) => {
              window.localStorage.setItem('jewelry-theme', chosenTheme)
            },
            { chosenTheme: theme },
          )

          await playwrightPage.goto(page.path)
          await playwrightPage.waitForLoadState('networkidle')

          const fileName = `${page.label}-${breakpoint.label}-${theme}.png`
          await playwrightPage.screenshot({
            path: path.join(OUTPUT_DIR, fileName),
            fullPage: true,
          })
        })
      }
    }
  }
})
