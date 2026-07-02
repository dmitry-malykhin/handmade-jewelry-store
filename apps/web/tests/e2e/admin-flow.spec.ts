import { test, expect, type Page } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })
test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, 'Admin panel is desktop-only in MVP scope.')
})

// Signature is fake — all API calls are mocked so no signature check runs.
// The payload segment decodes to { role: 'ADMIN' } for AdminAuthGuard.
const FAKE_ADMIN_JWT =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbi0xIiwiZW1haWwiOiJhZG1pbkBqZXdlbHJ5LmRldiIsInJvbGUiOiJBRE1JTiJ9.fake'

const ADMIN_STATS = { productCount: 42, orderCount: 108, totalRevenueCents: 254900 }

const ADMIN_REVENUE = {
  totalRevenueCents: 254900,
  orderCount: 108,
  avgOrderValueCents: 2360,
  chartData: [
    { date: '2026-06-01', revenueCents: 12000 },
    { date: '2026-06-02', revenueCents: 15400 },
  ],
}

const ADMIN_PRODUCTS_PAGE = {
  data: [
    {
      id: 'p1',
      title: 'Sterling Silver Ring',
      slug: 'sterling-silver-ring',
      status: 'ACTIVE',
      price: '49.99',
      stock: 1,
      sku: 'SKU-100',
      images: ['/placeholder-product.jpg'],
      material: 'Sterling silver',
      description: '',
      weight: null,
      avgRating: 0,
      reviewCount: 0,
      stockType: 'IN_STOCK',
      productionDays: 0,
      lengthCm: null,
      widthCm: null,
      heightCm: null,
      diameterCm: null,
      weightGrams: null,
      beadSizeMm: null,
      categoryId: 'c1',
      category: { name: 'Rings', slug: 'rings' },
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    },
    {
      id: 'p2',
      title: 'Gold Necklace',
      slug: 'gold-necklace',
      status: 'DRAFT',
      price: '129.99',
      stock: 0,
      sku: 'SKU-101',
      images: ['/placeholder-product.jpg'],
      material: 'Gold',
      description: '',
      weight: null,
      avgRating: 0,
      reviewCount: 0,
      stockType: 'MADE_TO_ORDER',
      productionDays: 7,
      lengthCm: null,
      widthCm: null,
      heightCm: null,
      diameterCm: null,
      weightGrams: null,
      beadSizeMm: null,
      categoryId: 'c2',
      category: { name: 'Necklaces', slug: 'necklaces' },
      createdAt: '2026-06-02T00:00:00.000Z',
      updatedAt: '2026-06-02T00:00:00.000Z',
    },
  ],
  meta: { totalCount: 2, page: 1, limit: 20, totalPages: 1 },
}

const ADMIN_ORDERS_PAGE = {
  data: [
    {
      id: 'order-abc12345',
      status: 'PAID',
      guestEmail: 'buyer@example.com',
      subtotal: 100,
      shippingCost: 5,
      total: 105,
      shippingAddress: {
        fullName: 'Jane Doe',
        addressLine1: '123 Main St',
        city: 'New York',
        postalCode: '10001',
        country: 'US',
      },
      items: [
        {
          id: 'item-1',
          productId: 'p1',
          quantity: 1,
          price: 100,
          productSnapshot: { title: 'Sterling Silver Ring', slug: 'sterling-silver-ring' },
        },
      ],
      createdAt: '2026-06-15T10:00:00.000Z',
      updatedAt: '2026-06-15T10:00:00.000Z',
    },
  ],
  meta: { totalCount: 1, page: 1, limit: 20, totalPages: 1 },
}

const ADMIN_ORDER_DETAIL = {
  ...ADMIN_ORDERS_PAGE.data[0],
  shippingCarrier: null,
  trackingNumber: null,
  shippedAt: null,
  estimatedDeliveryAt: null,
  deliveredAt: null,
  cancelReason: null,
  cancelNote: null,
  refundedAt: null,
  refundAmount: null,
  refundReason: null,
  refundNote: null,
  productionStatus: 'QUEUED',
  productionNotes: null,
  source: 'web',
  statusHistory: [
    {
      id: 'h1',
      fromStatus: null,
      toStatus: 'PENDING',
      note: null,
      createdBy: 'guest',
      createdAt: '2026-06-15T09:59:00.000Z',
    },
    {
      id: 'h2',
      fromStatus: 'PENDING',
      toStatus: 'PAID',
      note: 'Stripe webhook',
      createdBy: 'system',
      createdAt: '2026-06-15T10:00:00.000Z',
    },
  ],
  payment: {
    id: 'pay-1',
    status: 'SUCCEEDED',
    amount: 105,
    currency: 'usd',
    stripePaymentIntentId: 'pi_test',
  },
  easypostShipmentId: null,
  easypostTrackerId: null,
  labelUrl: null,
  shippingInsuranceCents: 0,
}

// Must run before any page script so StoreHydration reads the token during
// its first useEffect — otherwise AdminAuthGuard redirects on first paint.
async function authenticateAsAdmin(page: Page): Promise<void> {
  await page.addInitScript((token) => {
    window.localStorage.setItem(
      'auth-store',
      JSON.stringify({
        state: { accessToken: token, refreshToken: token },
        version: 0,
      }),
    )
  }, FAKE_ADMIN_JWT)
}

async function mockAdminApi(page: Page): Promise<void> {
  await page.route('**/api/admin/stats', (route) => route.fulfill({ json: ADMIN_STATS }))

  await page.route('**/api/admin/stats/revenue**', (route) =>
    route.fulfill({ json: ADMIN_REVENUE }),
  )

  await page.route('**/api/admin/analytics/**', (route) => route.fulfill({ json: [] }))

  await page.route('**/api/admin/products**', (route) => {
    if (route.request().method() === 'PATCH') {
      route.fulfill({ json: { affectedCount: 2 } })
      return
    }
    if (route.request().method() === 'DELETE') {
      route.fulfill({ status: 204, body: '' })
      return
    }
    route.fulfill({ json: ADMIN_PRODUCTS_PAGE })
  })

  await page.route('**/api/admin/orders/order-abc12345', (route) =>
    route.fulfill({ json: ADMIN_ORDER_DETAIL }),
  )

  await page.route('**/api/admin/orders**', (route) => {
    if (route.request().method() === 'PATCH') {
      route.fulfill({ json: { ...ADMIN_ORDER_DETAIL, status: 'PROCESSING' } })
      return
    }
    route.fulfill({ json: ADMIN_ORDERS_PAGE })
  })
}

test.describe('Admin flow — authentication', () => {
  test('unauthenticated user visiting /admin is redirected to home', async ({ page }) => {
    await page.goto('/en/admin')

    await page.waitForURL(/\/en\/?$/, { timeout: 5000 })
    expect(page.url()).toMatch(/\/en\/?$/)
  })

  test('logging in as ADMIN via the form stores tokens and unlocks /admin', async ({ page }) => {
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        json: { accessToken: FAKE_ADMIN_JWT, refreshToken: FAKE_ADMIN_JWT },
      }),
    )
    await mockAdminApi(page)

    await page.goto('/en/login')
    await page.getByRole('textbox', { name: /email/i }).fill('admin@jewelry.dev')
    await page.getByLabel(/^password$/i).fill('admin123')
    await page.getByRole('button', { name: /^sign in$/i }).click()

    await page.waitForURL(/\/en\/?$/, { timeout: 5000 })
    await page.goto('/en/admin')

    await expect(page.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeVisible()
  })
})

test.describe('Admin flow — dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAsAdmin(page)
    await mockAdminApi(page)
  })

  test('renders stats cards with values from /api/admin/stats', async ({ page }) => {
    await page.goto('/en/admin')

    await expect(page.getByText(/42/).first()).toBeVisible()
    await expect(page.getByText(/108/).first()).toBeVisible()
  })
})

test.describe('Admin flow — products list', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAsAdmin(page)
    await mockAdminApi(page)
  })

  test('renders both products from the mocked page response', async ({ page }) => {
    await page.goto('/en/admin/products')

    await expect(page.getByText('Sterling Silver Ring')).toBeVisible()
    await expect(page.getByText('Gold Necklace')).toBeVisible()
  })

  test('shows product status badge for each row', async ({ page }) => {
    await page.goto('/en/admin/products')

    // case-insensitive to survive i18n key changes for the badge text.
    await expect(page.getByText(/active/i).first()).toBeVisible()
    await expect(page.getByText(/draft/i).first()).toBeVisible()
  })

  test('selecting rows enables the bulk actions bar', async ({ page }) => {
    await page.goto('/en/admin/products')

    const rowCheckboxes = page.getByRole('checkbox', { name: /select row/i })
    await rowCheckboxes.first().click()

    await expect(page.getByRole('region', { name: /selected/i })).toBeVisible()
  })
})

test.describe('Admin flow — orders list + detail', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAsAdmin(page)
    await mockAdminApi(page)
  })

  test('renders the orders table with the mocked row', async ({ page }) => {
    await page.goto('/en/admin/orders')

    await expect(page.getByText('buyer@example.com')).toBeVisible()
    await expect(page.getByText('abc12345')).toBeVisible()
  })

  test('order detail page renders items, address and timeline', async ({ page }) => {
    await page.goto('/en/admin/orders/order-abc12345')

    await expect(page.getByText('Sterling Silver Ring')).toBeVisible()
    await expect(page.getByText('Jane Doe')).toBeVisible()
    await expect(page.getByText('123 Main St')).toBeVisible()
    await expect(page.getByText(/stripe webhook/i)).toBeVisible()
  })

  test('order detail shows allowed next-status buttons based on current status', async ({
    page,
  }) => {
    await page.goto('/en/admin/orders/order-abc12345')

    // Fixture pins status to PAID → whitelist is PROCESSING + CANCELLED per state machine.
    await expect(page.getByRole('button', { name: /processing/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /cancelled/i })).toBeVisible()
  })
})
