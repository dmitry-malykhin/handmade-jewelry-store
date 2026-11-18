import {
  buildProductionStartedEmail,
  type ProductionStartedData,
} from './production-started.template'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const baseData: ProductionStartedData = {
  orderId: 'order_abcdef1234567890',
  recipientEmail: 'jane@example.com',
  items: [{ title: 'Sterling Silver Moonstone Ring' }],
  expectedShipByText: 'November 25, 2026',
  orderAccessToken: 'test-token',
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/email')
  await $allureSubSuite('production-started.template')
  await $allureSeverity('normal')
})

describe('buildProductionStartedEmail', () => {
  it('renders subject with last 8 chars of orderId uppercased', () => {
    const { subject } = buildProductionStartedEmail(baseData)
    expect(subject).toBe("We've started crafting your order ✦ #34567890")
  })

  it('lists each handmade item under the "Now crafting" section', () => {
    const { html } = buildProductionStartedEmail({
      ...baseData,
      items: [{ title: 'Moonstone Ring' }, { title: 'Pearl Bracelet' }],
    })
    expect(html).toContain('Moonstone Ring')
    expect(html).toContain('Pearl Bracelet')
    expect(html).toContain('Now crafting')
  })

  it('renders an expected ship-by block when expectedShipByText is provided', () => {
    const { html } = buildProductionStartedEmail(baseData)
    expect(html).toContain('Expected to ship by')
    expect(html).toContain('November 25, 2026')
  })

  it('omits the ship-by block entirely when expectedShipByText is null', () => {
    const { html } = buildProductionStartedEmail({ ...baseData, expectedShipByText: null })
    expect(html).not.toContain('Expected to ship by')
  })

  it('URL-encodes the order access token in the view-order link', () => {
    const { html } = buildProductionStartedEmail({
      ...baseData,
      orderAccessToken: 'eyJhbGciOi.payload.sig=',
    })
    expect(html).toContain(
      `/checkout/confirmation/${baseData.orderId}?token=eyJhbGciOi.payload.sig%3D`,
    )
  })
})
