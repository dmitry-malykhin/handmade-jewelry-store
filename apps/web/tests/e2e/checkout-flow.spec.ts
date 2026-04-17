import { test, expect } from '@playwright/test'

test.describe('Add to cart → Checkout flow', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test.beforeEach(async ({ page }) => {
    // Clear localStorage cart before each test
    await page.goto('/en')
    await page.evaluate(() => localStorage.removeItem('jewelry-cart'))
  })

  test('can browse shop and see product cards', async ({ page }) => {
    await page.goto('/en/shop')

    const productGrid = page.getByRole('list', { name: /product/i })
    await expect(productGrid).toBeVisible()

    const productCards = page.locator('article')
    await expect(productCards.first()).toBeVisible()
  })

  test('can add a product to cart from the shop page', async ({ page }) => {
    await page.goto('/en/shop')

    const addToCartButton = page.getByRole('button', { name: /add to cart/i }).first()
    await expect(addToCartButton).toBeVisible()
    await addToCartButton.click()

    // Button should change to "Added" state
    await expect(page.getByRole('button', { name: /added/i }).first()).toBeVisible()
  })

  test('cart page shows added items', async ({ page }) => {
    await page.goto('/en/shop')

    // Add first product
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click()

    // Navigate to cart
    await page.goto('/en/cart')

    const cartItems = page.getByRole('list', { name: /items/i })
    await expect(cartItems).toBeVisible()
    await expect(cartItems.locator('li').first()).toBeVisible()
  })

  test('can increase and decrease item quantity in cart', async ({ page }) => {
    await page.goto('/en/shop')
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click()
    await page.goto('/en/cart')

    // Increase quantity
    const increaseButton = page.getByRole('button', { name: /increase/i }).first()
    await increaseButton.click()

    // Quantity should be 2
    const quantityGroup = page.getByRole('group', { name: /quantity/i }).first()
    await expect(quantityGroup).toContainText('2')

    // Decrease quantity
    const decreaseButton = page.getByRole('button', { name: /decrease/i }).first()
    await decreaseButton.click()

    await expect(quantityGroup).toContainText('1')
  })

  test('can remove item from cart', async ({ page }) => {
    await page.goto('/en/shop')
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click()
    await page.goto('/en/cart')

    // Verify item exists
    const cartList = page.getByRole('list', { name: /items/i })
    await expect(cartList.locator('li').first()).toBeVisible()

    // Remove item
    const removeButton = page.getByRole('button', { name: /remove/i }).first()
    await removeButton.click()

    // Cart should show empty state
    await expect(cartList).not.toBeVisible()
  })

  test('cart summary shows subtotal and checkout button', async ({ page }) => {
    await page.goto('/en/shop')
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click()
    await page.goto('/en/cart')

    const summary = page.getByRole('complementary', { name: /summary/i })
    await expect(summary).toBeVisible()

    // Checkout button exists
    const checkoutLink = summary.getByRole('link', { name: /checkout/i })
    await expect(checkoutLink).toBeVisible()
  })

  test('proceeds to checkout and shows guest/sign-in options', async ({ page }) => {
    await page.goto('/en/shop')
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click()
    await page.goto('/en/cart')

    // Click proceed to checkout
    await page.getByRole('link', { name: /checkout/i }).click()

    await expect(page).toHaveURL(/\/checkout/)

    // Guest checkout option should be visible
    const guestButton = page.getByRole('button', { name: /guest/i })
    await expect(guestButton).toBeVisible()
  })

  test('guest checkout shows address form with all required fields', async ({ page }) => {
    await page.goto('/en/shop')
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click()
    await page.goto('/en/checkout')

    // Choose guest checkout
    await page.getByRole('button', { name: /guest/i }).click()

    // Verify step 1 fields are visible
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/full name/i)).toBeVisible()
    await expect(page.getByLabel(/address/i).first()).toBeVisible()
    await expect(page.getByLabel(/city/i)).toBeVisible()
    await expect(page.getByLabel(/postal/i)).toBeVisible()
  })

  test('address form validates required fields on submit', async ({ page }) => {
    await page.goto('/en/shop')
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click()
    await page.goto('/en/checkout')

    await page.getByRole('button', { name: /guest/i }).click()

    // Try to submit empty form
    await page.getByRole('button', { name: /continue.*shipping/i }).click()

    // Should stay on step 1 — form should not proceed
    await expect(page.getByLabel(/email/i)).toBeVisible()
  })

  test('can fill address form and proceed to shipping method', async ({ page }) => {
    await page.goto('/en/shop')
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click()
    await page.goto('/en/checkout')

    await page.getByRole('button', { name: /guest/i }).click()

    // Fill address form
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/full name/i).fill('Jane Doe')
    await page.getByLabel(/address line 1/i).fill('123 Main St')
    await page.getByLabel(/city/i).fill('New York')
    await page.getByLabel(/postal/i).fill('10001')

    // Submit address form
    await page.getByRole('button', { name: /continue.*shipping/i }).click()

    // Should see shipping method options (step 2)
    const shippingRadio = page.locator('input[type="radio"]').first()
    await expect(shippingRadio).toBeVisible({ timeout: 5000 })
  })

  test('order summary sidebar is visible during checkout', async ({ page }) => {
    await page.goto('/en/shop')
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click()
    await page.goto('/en/checkout')

    await page.getByRole('button', { name: /guest/i }).click()

    // Order summary sidebar should show cart items
    const orderSummary = page.getByRole('complementary', { name: /order.*summary/i })
    await expect(orderSummary).toBeVisible()
  })
})
