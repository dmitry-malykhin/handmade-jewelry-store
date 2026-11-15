import { buildOrderConfirmationEmail, OrderConfirmationData } from './order-confirmation.template'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const baseAddress: OrderConfirmationData['shippingAddress'] = {
  fullName: 'Jane Doe',
  addressLine1: '123 Main St',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'US',
}

const baseData: OrderConfirmationData = {
  orderId: 'order_abcdef1234567890',
  orderAccessToken: 'test-token',
  recipientEmail: 'jane@example.com',
  items: [{ title: 'Sterling Silver Ring', quantity: 1, price: 49.99 }],
  subtotal: 49.99,
  shippingCost: 5,
  total: 54.99,
  shippingAddress: baseAddress,
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/email')
  await $allureSubSuite('order-confirmation.template')
  await $allureSeverity('normal')
})

describe('buildOrderConfirmationEmail', () => {
  // TC-EMAIL-001 — happy path: subject and core fields render
  it('renders subject with last 8 chars of orderId uppercased', () => {
    const { subject } = buildOrderConfirmationEmail(baseData)
    expect(subject).toBe('Order confirmed: #34567890')
  })

  it('renders item title, quantity, and line total in the HTML', () => {
    const { html } = buildOrderConfirmationEmail({
      ...baseData,
      items: [{ title: 'Beaded Bracelet', quantity: 2, price: 30 }],
    })
    expect(html).toContain('Beaded Bracelet')
    expect(html).toContain('× 2')
    expect(html).toContain('$60.00')
  })

  // TC-EMAIL-001 — shipping cost displayed correctly
  it('renders paid shipping in default color (not green)', () => {
    const { html } = buildOrderConfirmationEmail({ ...baseData, shippingCost: 5 })
    expect(html).toContain('$5.00')
    expect(html).not.toMatch(/color: #22a722[^;]*;[^"]*">\s*FREE/)
  })

  it('renders FREE shipping in green when shippingCost is 0', () => {
    const { html } = buildOrderConfirmationEmail({ ...baseData, shippingCost: 0 })
    expect(html).toContain('#22a722')
    expect(html).toContain('FREE')
  })

  // TC-EMAIL-001 — address block
  it('includes full shipping address with state when provided', () => {
    const { html } = buildOrderConfirmationEmail(baseData)
    expect(html).toContain('Jane Doe')
    expect(html).toContain('123 Main St')
    expect(html).toContain('New York, NY 10001')
    expect(html).toContain('US')
  })

  it('omits addressLine2 from address block when absent (no empty line)', () => {
    const { html } = buildOrderConfirmationEmail(baseData)
    // After fullName "<br>", the next line should be addressLine1, not an empty line
    expect(html).not.toMatch(/Jane Doe<\/strong><br><br>/)
  })

  it('includes addressLine2 when provided', () => {
    const { html } = buildOrderConfirmationEmail({
      ...baseData,
      shippingAddress: { ...baseAddress, addressLine2: 'Apt 4B' },
    })
    expect(html).toContain('Apt 4B')
  })

  // TC-EMAIL-013 — Decimal precision: Intl.NumberFormat clips trailing fractions
  it('formats prices to two decimals without floating-point artifacts', () => {
    const { html } = buildOrderConfirmationEmail({
      ...baseData,
      items: [{ title: 'Pearl Earrings', quantity: 1, price: 33.333333333 }],
      subtotal: 33.333333333,
      shippingCost: 0,
      total: 33.333333333,
    })
    expect(html).toContain('$33.33')
    expect(html).not.toMatch(/\$33\.330\d/)
  })

  it('renders a View your order CTA with URL-encoded token for guest reaccess (#522)', () => {
    const { html } = buildOrderConfirmationEmail({
      ...baseData,
      orderAccessToken: 'eyJhbGciOi.payload.sig=',
    })
    expect(html).toContain('View your order')
    expect(html).toContain(
      `/checkout/confirmation/${baseData.orderId}?token=eyJhbGciOi.payload.sig%3D`,
    )
  })

  // EU Consumer Rights Directive (#560)

  describe('EU CRD required disclosures (#560)', () => {
    const ORIGINAL_ENV = {
      STORE_LEGAL_NAME: process.env.STORE_LEGAL_NAME,
      STORE_ADDRESS_LINE1: process.env.STORE_ADDRESS_LINE1,
      STORE_CITY: process.env.STORE_CITY,
      STORE_POSTAL_CODE: process.env.STORE_POSTAL_CODE,
      STORE_COUNTRY: process.env.STORE_COUNTRY,
      STORE_CONTACT_EMAIL: process.env.STORE_CONTACT_EMAIL,
    }

    beforeAll(() => {
      process.env.STORE_LEGAL_NAME = 'Senichka Jewelry OÜ'
      process.env.STORE_ADDRESS_LINE1 = '42 Handmade Street'
      process.env.STORE_CITY = 'Tallinn'
      process.env.STORE_POSTAL_CODE = '10111'
      process.env.STORE_COUNTRY = 'Estonia'
      process.env.STORE_CONTACT_EMAIL = 'hello@senichka.test'
    })

    afterAll(() => {
      for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
    })

    it('renders the trader identity block (CRD Art. 6(1)(b)-(c) + Art. 8(7))', () => {
      const { html } = buildOrderConfirmationEmail(baseData)
      expect(html).toContain('Senichka Jewelry OÜ')
      expect(html).toContain('42 Handmade Street')
      expect(html).toContain('10111 Tallinn')
      expect(html).toContain('Estonia')
      expect(html).toContain('hello@senichka.test')
    })

    it('always renders a VAT / Tax line, even when no VAT is collected (CRD Art. 6(1)(e))', () => {
      const { html } = buildOrderConfirmationEmail(baseData)
      expect(html).toContain('VAT / Tax')
      expect(html).toContain('Included where applicable')
    })

    it('shows the explicit VAT amount when vatAmount > 0', () => {
      const { html } = buildOrderConfirmationEmail({ ...baseData, vatAmount: 9.5 })
      expect(html).toContain('VAT / Tax')
      expect(html).toContain('$9.50')
      expect(html).not.toContain('Included where applicable')
    })

    it('renders an Expected delivery line when estimatedDeliveryText is provided (CRD Art. 6(1)(g))', () => {
      const { html } = buildOrderConfirmationEmail({
        ...baseData,
        estimatedDeliveryText: 'November 25, 2026',
      })
      expect(html).toContain('Expected delivery')
      expect(html).toContain('November 25, 2026')
    })

    it('omits the Expected delivery block when estimatedDeliveryText is undefined', () => {
      const { html } = buildOrderConfirmationEmail(baseData)
      expect(html).not.toContain('Expected delivery')
    })

    it('renders the right-of-withdrawal section linking to /refund-policy (CRD Art. 6(1)(h) + Annex I)', () => {
      const { html } = buildOrderConfirmationEmail(baseData)
      expect(html).toContain('Your right of withdrawal')
      expect(html).toContain('14 days')
      expect(html).toContain('/refund-policy')
    })

    it('renders complaint-handling contact (CRD Art. 6(1)(c)) + EU ODR link', () => {
      const { html } = buildOrderConfirmationEmail(baseData)
      expect(html).toContain('complaints')
      expect(html).toContain('ec.europa.eu/consumers/odr/')
      expect(html).toContain('/impressum')
    })
  })
})
