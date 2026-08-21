import { test, expect, type Page } from '@playwright/test'

/**
 * Consent-gate verification. Guards against a regression where a script
 * tag or event dispatch bypasses the consent store — a GDPR liability.
 *
 * All third-party analytics hosts should return zero requests on a fresh
 * session (no consent decided yet); after the user rejects, they must
 * still be zero; only after accept-all can they fire.
 *
 * Runs against `PLAYWRIGHT_BASE_URL` (or auto-boot Next dev). No API needed —
 * consent-gate lives entirely in the browser via `cookie-consent.store` +
 * `<GoogleAnalytics>`/`<FacebookPixel>` client components in root layout.
 */

const THIRD_PARTY_HOSTS = [
  /google-analytics\.com/,
  /googletagmanager\.com/,
  /connect\.facebook\.net/,
  /facebook\.com\/tr/,
  /klaviyo\.com/,
  /pintrk|pinimg\.com|ct\.pinterest\.com/,
  /clarity\.ms/,
  /posthog\.com/,
]

async function captureThirdPartyRequests(page: Page): Promise<string[]> {
  const captured: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (THIRD_PARTY_HOSTS.some((pattern) => pattern.test(url))) {
      captured.push(url)
    }
  })
  return captured
}

test.describe('Cookie-consent gate blocks third-party analytics until accepted', () => {
  test('no third-party requests on fresh visit — decision not yet made', async ({ page }) => {
    const requests = await captureThirdPartyRequests(page)
    await page.goto('/en')
    // Give lazy-loaded scripts (fbq, pintrk use lazyOnload strategy) a fair chance to fire.
    await page.waitForLoadState('networkidle')

    expect(
      requests,
      `Fresh session leaked ${requests.length} third-party requests:\n${requests.slice(0, 5).join('\n')}`,
    ).toHaveLength(0)
  })

  test('no third-party requests after "reject all"', async ({ page }) => {
    // Seed the consent store to "rejected" before any page script runs.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'cookie-consent',
        JSON.stringify({
          state: {
            hasDecided: true,
            preferences: { analytics: false, marketing: false },
          },
          version: 0,
        }),
      )
    })

    const requests = await captureThirdPartyRequests(page)
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    expect(
      requests,
      `Rejected consent leaked ${requests.length} third-party requests:\n${requests.slice(0, 5).join('\n')}`,
    ).toHaveLength(0)
  })

  // This test does NOT assert that requests DO fire on accept — third-party env
  // vars (NEXT_PUBLIC_GA_MEASUREMENT_ID etc.) may be absent in local/dev, in
  // which case the script tags don't render at all. The positive path lives
  // in the dashboard-verify checklist attached to #433 (GA4 Realtime, FB Test
  // Events, Klaviyo Metrics) — a live sanity-check that only the operator can
  // run.
})
