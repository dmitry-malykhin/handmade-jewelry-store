import { buildShippingNotificationEmail } from './shipping-notification.template'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const baseData = {
  recipientEmail: 'jane@example.com',
  orderId: 'order_abcdef1234567890',
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/email')
  await $allureSubSuite('shipping-notification.template')
  await $allureSeverity('normal')
})

describe('buildShippingNotificationEmail', () => {
  // TC-EMAIL-006 — with tracking number
  it('renders tracking number block when trackingNumber is provided', () => {
    const { html } = buildShippingNotificationEmail({
      ...baseData,
      trackingNumber: 'TRK123456789',
    })
    expect(html).toContain('Tracking number')
    expect(html).toContain('TRK123456789')
  })

  // TC-EMAIL-007 — without tracking number, block omitted (no empty box)
  it('omits the entire tracking block when trackingNumber is absent', () => {
    const { html } = buildShippingNotificationEmail(baseData)
    expect(html).not.toContain('Tracking number')
  })

  it('renders subject with last 8 chars of orderId uppercased', () => {
    const { subject } = buildShippingNotificationEmail(baseData)
    expect(subject).toBe('Your order is on its way! 📦 — #34567890')
  })

  it('renders order number in the body with last 8 chars uppercased', () => {
    const { html } = buildShippingNotificationEmail(baseData)
    expect(html).toContain('#34567890')
  })
})
