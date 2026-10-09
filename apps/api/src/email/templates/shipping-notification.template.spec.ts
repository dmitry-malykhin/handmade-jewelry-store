import { buildShippingNotificationEmail, buildTrackingUrl } from './shipping-notification.template'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const baseData = {
  recipientEmail: 'jane@example.com',
  orderId: 'order_abcdef1234567890',
  orderAccessToken: 'test-token',
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
    expect(subject).toBe('Your order is on its way! 📦 #34567890')
  })

  it('renders order number in the body with last 8 chars uppercased', () => {
    const { html } = buildShippingNotificationEmail(baseData)
    expect(html).toContain('#34567890')
  })

  it('renders a View your order link with URL-encoded token for guest reaccess (#522)', () => {
    const { html } = buildShippingNotificationEmail({
      ...baseData,
      orderAccessToken: 'tok=abc',
    })
    expect(html).toContain('View your order')
    expect(html).toContain(`/checkout/confirmation/${baseData.orderId}?token=tok%3Dabc`)
  })

  it('renders a clickable Track your package CTA when carrier + tracking are present', () => {
    const { html } = buildShippingNotificationEmail({
      ...baseData,
      trackingNumber: '9400111899223197428496',
      shippingCarrier: 'USPS',
    })
    expect(html).toContain('Track your package')
    expect(html).toContain(
      'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223197428496',
    )
    expect(html).toContain('USPS')
  })

  it('shows tracking number without the CTA when carrier is missing', () => {
    const { html } = buildShippingNotificationEmail({
      ...baseData,
      trackingNumber: 'TRK123',
    })
    expect(html).toContain('TRK123')
    expect(html).not.toContain('Track your package')
  })

  it('shows tracking number without the CTA for an unknown carrier', () => {
    const { html } = buildShippingNotificationEmail({
      ...baseData,
      trackingNumber: 'TRK123',
      shippingCarrier: 'NightOwl Express',
    })
    expect(html).toContain('TRK123')
    expect(html).not.toContain('Track your package')
  })
})

describe('buildTrackingUrl', () => {
  it.each([
    ['usps', 'TRK1', 'tools.usps.com'],
    ['FedEx', 'TRK2', 'fedex.com/fedextrack'],
    ['UPS', 'TRK3', 'ups.com/track'],
    ['dhl', 'TRK4', 'dhl.com'],
  ])('maps %s to its carrier tracking page', (carrier, trackingNumber, expectedHost) => {
    const url = buildTrackingUrl(trackingNumber, carrier)
    expect(url).toContain(expectedHost)
    expect(url).toContain(trackingNumber)
  })

  it('url-encodes special characters in the tracking number', () => {
    const url = buildTrackingUrl('A B/C', 'usps')
    expect(url).toContain('A%20B%2FC')
  })

  it('returns null when carrier is unknown', () => {
    expect(buildTrackingUrl('TRK1', 'MysteryCarrier')).toBeNull()
  })

  it('returns null when either input is missing', () => {
    expect(buildTrackingUrl(undefined, 'usps')).toBeNull()
    expect(buildTrackingUrl('TRK1', undefined)).toBeNull()
  })
})
