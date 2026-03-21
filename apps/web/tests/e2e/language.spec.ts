import { test, expect } from '@playwright/test'

test.describe('Language switching', () => {
  // Desktop language switcher is hidden on mobile (md:flex wrapper).
  // These tests interact with the dropdown in the header — force desktop viewport.
  test.use({ viewport: { width: 1280, height: 720 } })
  test('displays EN flag and code in the desktop language switcher', async ({ page }) => {
    await page.goto('/en')
    // Scope to the language button to avoid substring matches on "contENt", "English", etc.
    const languageBtn = page.getByRole('button', { name: /language/i })
    await expect(languageBtn.getByText('EN', { exact: true })).toBeVisible()
    await expect(languageBtn.getByText('🇺🇸')).toBeVisible()
  })

  test('displays RU flag and code when on the Russian locale', async ({ page }) => {
    await page.goto('/ru')
    const languageBtn = page.getByRole('button', { name: /language/i })
    await expect(languageBtn.getByText('RU', { exact: true })).toBeVisible()
    await expect(languageBtn.getByText('🇷🇺')).toBeVisible()
  })

  test('displays ES flag and code when on the Spanish locale', async ({ page }) => {
    await page.goto('/es')
    const languageBtn = page.getByRole('button', { name: /language/i })
    await expect(languageBtn.getByText('ES', { exact: true })).toBeVisible()
    await expect(languageBtn.getByText('🇪🇸')).toBeVisible()
  })

  test('navigates to /ru when Russian is selected from the dropdown', async ({ page }) => {
    await page.goto('/en')

    // Open the language dropdown
    await page.getByRole('button', { name: /language/i }).click()
    await page.getByRole('menuitem', { name: /русский/i }).click()

    await expect(page).toHaveURL(/\/ru/)
    // Note: html[lang] is set server-side in the root layout — it updates only on
    // full page loads (SSR), not on client-side router.replace() navigation.
    // The URL change is the authoritative signal that locale switching worked.
  })

  test('navigates to /es when Spanish is selected from the dropdown', async ({ page }) => {
    await page.goto('/en')

    await page.getByRole('button', { name: /language/i }).click()
    await page.getByRole('menuitem', { name: /español/i }).click()

    await expect(page).toHaveURL(/\/es/)
  })

  test('navigates back to /en when English is selected from RU', async ({ page }) => {
    await page.goto('/ru')

    await page.getByRole('button', { name: /language/i }).click()
    await page.getByRole('menuitem', { name: /english/i }).click()

    await expect(page).toHaveURL(/\/en/)
  })
})
