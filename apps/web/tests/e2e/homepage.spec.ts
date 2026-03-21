import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('redirects root path to /en by default', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/en/)
  })

  test('renders the EN homepage with correct lang attribute', async ({ page }) => {
    await page.goto('/en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('renders the RU homepage with correct lang attribute', async ({ page }) => {
    await page.goto('/ru')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  })

  test('renders the ES homepage with correct lang attribute', async ({ page }) => {
    await page.goto('/es')
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  })

  test('displays the site logo', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByRole('link', { name: /handmade jewelry store/i })).toBeVisible()
  })

  test('displays the main navigation links on desktop', async ({ page }) => {
    // NavLinks is hidden md:flex — must use a desktop viewport to see it
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/en')
    await expect(page.getByRole('navigation').first()).toBeVisible()
  })

  test('has a skip to main content link for accessibility', async ({ page }) => {
    await page.goto('/en')
    // The skip link is visually hidden but exists in DOM
    const skipLink = page.getByText('Skip to main content')
    await expect(skipLink).toBeAttached()
  })

  test('displays main content area', async ({ page }) => {
    await page.goto('/en')
    await expect(page.locator('#main-content')).toBeVisible()
  })

  test('returns 200 status for all three locales', async ({ request }) => {
    const enResponse = await request.get('/en')
    const ruResponse = await request.get('/ru')
    const esResponse = await request.get('/es')

    expect(enResponse.status()).toBe(200)
    expect(ruResponse.status()).toBe(200)
    expect(esResponse.status()).toBe(200)
  })
})
