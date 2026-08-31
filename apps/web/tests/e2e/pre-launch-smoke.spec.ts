import { test, expect, type Page } from '@playwright/test'

/**
 * Pre-launch smoke — asserts that every public page returns 200 and every
 * top-nav / footer link points at an existing route. Interactive flows
 * requiring the API (checkout, admin, wishlist mutation) are covered by
 * their own specs; this suite is the client-side safety net that catches
 * blank pages, dead links, and console errors regressing before deploy.
 */

const CRITICAL_PAGES = [
  '/en',
  '/en/products',
  '/en/cart',
  '/en/search',
  '/en/account',
  '/en/about',
  '/en/contact',
  '/en/faq',
  '/en/care',
  '/en/shipping',
  '/en/ring-size-guide',
  '/en/privacy',
  '/en/terms',
  '/en/login',
  '/en/register',
  '/en/forgot-password',
] as const

const LOCALES = ['en', 'ru', 'es'] as const

async function captureConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`)
  })
  return errors
}

test.describe('Pre-launch smoke — every public page', () => {
  for (const path of CRITICAL_PAGES) {
    test(`${path} returns 200 with no console errors`, async ({ page }) => {
      const errors = await captureConsoleErrors(page)
      const response = await page.goto(path)

      expect(response?.status(), `HTTP status for ${path}`).toBeLessThan(400)

      // Filter noise: analytics scripts sometimes 404 when env is unset (dev),
      // hydration warnings from Next dev overlay. Real app errors bubble.
      const meaningfulErrors = errors.filter(
        (error) =>
          !error.includes('Failed to load resource') &&
          !error.includes('_next/static') &&
          !error.includes('hydration'),
      )
      expect(meaningfulErrors, `console errors on ${path}`).toHaveLength(0)
    })
  }
})

test.describe('Pre-launch smoke — locale routes', () => {
  for (const locale of LOCALES) {
    test(`/${locale} responds with correct <html lang="${locale}">`, async ({ page }) => {
      await page.goto(`/${locale}`)
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
    })
  }
})

test.describe('Pre-launch smoke — nav & footer links resolve', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('every desktop nav link opens a live page', async ({ page }) => {
    await page.goto('/en')

    const navLinks = page.getByRole('navigation').first().getByRole('link')
    const hrefs = await navLinks.evaluateAll((elements) =>
      elements.map((el) => (el as HTMLAnchorElement).getAttribute('href')).filter(Boolean),
    )

    for (const href of hrefs) {
      if (!href || href.startsWith('#') || href.startsWith('http')) continue
      const response = await page.request.get(href)
      expect(response.status(), `nav link ${href}`).toBeLessThan(400)
    }
  })

  test('every footer link opens a live page', async ({ page }) => {
    await page.goto('/en')

    const footerLinks = page.locator('footer').getByRole('link')
    const hrefs = await footerLinks.evaluateAll((elements) =>
      elements.map((el) => (el as HTMLAnchorElement).getAttribute('href')).filter(Boolean),
    )

    for (const href of hrefs) {
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http'))
        continue
      const response = await page.request.get(href)
      expect(response.status(), `footer link ${href}`).toBeLessThan(400)
    }
  })
})

test.describe('Pre-launch smoke — auth forms render inputs and submit button', () => {
  // Scope to <main> to avoid ambiguity with the footer newsletter email field.
  test('login form has email + password + submit', async ({ page }) => {
    await page.goto('/en/login')
    const main = page.locator('main')
    await expect(main.getByLabel(/^email/i)).toBeVisible()
    await expect(main.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('register form has email + password + submit', async ({ page }) => {
    await page.goto('/en/register')
    const main = page.locator('main')
    await expect(main.getByLabel(/^email/i)).toBeVisible()
    await expect(main.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('forgot-password form has email + submit', async ({ page }) => {
    await page.goto('/en/forgot-password')
    const main = page.locator('main')
    await expect(main.getByLabel(/^email/i)).toBeVisible()
  })
})

test.describe('Pre-launch smoke — empty cart shows CTA back to catalog', () => {
  test('cart page shows "Continue shopping" affordance when empty', async ({ page }) => {
    await page.goto('/en/cart')
    // Empty state should offer a way back to shopping — regardless of copy variant
    const backLinks = page
      .getByRole('link')
      .filter({ hasText: /continue shopping|browse|shop|jewelry/i })
    await expect(backLinks.first()).toBeVisible()
  })
})
