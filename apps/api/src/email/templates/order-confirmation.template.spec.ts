import { buildOrderConfirmationEmail, OrderConfirmationData } from './order-confirmation.template'

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
  recipientEmail: 'jane@example.com',
  items: [{ title: 'Sterling Silver Ring', quantity: 1, price: 49.99 }],
  subtotal: 49.99,
  shippingCost: 5,
  total: 54.99,
  shippingAddress: baseAddress,
}

describe('buildOrderConfirmationEmail', () => {
  // TC-EMAIL-001 — happy path: subject and core fields render
  it('renders subject with last 8 chars of orderId uppercased', () => {
    const { subject } = buildOrderConfirmationEmail(baseData)
    expect(subject).toBe('Order confirmed — #34567890')
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
})
