import { test, expect } from '@playwright/test'

test.describe('Theme switching', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start from system default each time
    await page.goto('/en')
    await page.evaluate(() => localStorage.removeItem('jewelry-theme'))
  })

  test('renders in light mode by default', async ({ page }) => {
    await page.goto('/en')
    // next-themes sets class="light" or class="dark" on <html>
    const htmlClass = await page.locator('html').getAttribute('class')
    // Default is system — on CI (headless) this resolves to light
    expect(htmlClass).not.toContain('dark')
  })

  test('theme toggle button is visible in the header', async ({ page }) => {
    await page.goto('/en')
    // Target by explicit aria-label to distinguish from the mobile sidebar's text-based button.
    // ThemeToggle has aria-label="Dark mode" (in light mode) or aria-label="Light mode" (in dark mode).
    await expect(
      page.locator('button[aria-label="Dark mode"], button[aria-label="Light mode"]'),
    ).toBeVisible()
  })

  test('switches to dark mode when toggle is clicked', async ({ page }) => {
    await page.goto('/en')

    // The ThemeToggle has aria-label="Dark mode" in light mode; mobile sidebar button has no aria-label
    await page.locator('button[aria-label="Dark mode"]').click()

    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('switches back to light mode on second click', async ({ page }) => {
    await page.goto('/en')

    // Click to dark
    await page.locator('button[aria-label="Dark mode"]').click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // Click back to light
    await page.locator('button[aria-label="Light mode"]').click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('persists dark mode preference after page reload', async ({ page }) => {
    await page.goto('/en')

    await page.locator('button[aria-label="Dark mode"]').click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.reload()

    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('theme preference is stored in localStorage', async ({ page }) => {
    await page.goto('/en')
    await page.locator('button[aria-label="Dark mode"]').click()

    const storedTheme = await page.evaluate(() => localStorage.getItem('jewelry-theme'))
    expect(storedTheme).toBe('dark')
  })
})
