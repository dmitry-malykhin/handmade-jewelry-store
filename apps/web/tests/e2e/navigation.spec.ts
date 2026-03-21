import { test, expect } from '@playwright/test'

test.describe('Desktop navigation', () => {
  // Force desktop viewport so md: breakpoint nav links are visible (not md:hidden)
  test.use({ viewport: { width: 1280, height: 720 } })

  test('renders the nav links on desktop viewport', async ({ page }) => {
    await page.goto('/en')

    const navigation = page.getByRole('navigation').first()
    await expect(navigation.getByRole('link', { name: /shop/i })).toBeVisible()
    await expect(navigation.getByRole('link', { name: /collections/i })).toBeVisible()
    await expect(navigation.getByRole('link', { name: /about/i })).toBeVisible()
    await expect(navigation.getByRole('link', { name: /contact/i })).toBeVisible()
  })

  test('renders the footer with all link groups', async ({ page }) => {
    await page.goto('/en')

    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    await expect(footer.getByRole('link', { name: /privacy policy/i })).toBeVisible()
    await expect(footer.getByRole('link', { name: /terms of service/i })).toBeVisible()
  })
})

test.describe('Mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } }) // iPhone 14 size

  test('hamburger button is visible on mobile', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByRole('button', { name: /open menu/i })).toBeVisible()
  })

  test('opens the mobile sidebar when hamburger is clicked', async ({ page }) => {
    await page.goto('/en')

    await page.getByRole('button', { name: /open menu/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('shows all nav links in the mobile sidebar', async ({ page }) => {
    await page.goto('/en')
    await page.getByRole('button', { name: /open menu/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('link', { name: /shop/i })).toBeVisible()
    await expect(dialog.getByRole('link', { name: /collections/i })).toBeVisible()
    await expect(dialog.getByRole('link', { name: /about/i })).toBeVisible()
    await expect(dialog.getByRole('link', { name: /contact/i })).toBeVisible()
  })

  test('closes the sidebar when the close button is clicked', async ({ page }) => {
    await page.goto('/en')

    await page.getByRole('button', { name: /open menu/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('button', { name: /close menu/i }).click()
    // translate-x-full moves the panel off-screen but doesn't set display:none —
    // verify closure via the toggle button's aria-expanded state instead
    await expect(page.getByRole('button', { name: /open menu/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  test('shows the language accordion in the mobile sidebar', async ({ page }) => {
    await page.goto('/en')
    await page.getByRole('button', { name: /open menu/i }).click()

    // Target the accordion trigger inside the sidebar by id to avoid strict mode violations.
    // The hamburger (outside #mobile-menu) has aria-expanded="true" once open, so
    // the only aria-expanded button inside #mobile-menu is the language accordion trigger.
    const accordionTrigger = page.locator('#mobile-menu button[aria-expanded]')
    await expect(accordionTrigger).toBeVisible()
    await expect(accordionTrigger).toContainText('English')
    await expect(accordionTrigger).toContainText('🇺🇸')
  })
})
