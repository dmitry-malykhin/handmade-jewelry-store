import { buildWelcomeEmail } from './welcome.template'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const ORIGINAL_FRONTEND_URL = process.env.FRONTEND_URL

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/email')
  await $allureSubSuite('welcome.template')
  await $allureSeverity('normal')
})

describe('buildWelcomeEmail', () => {
  afterEach(() => {
    if (ORIGINAL_FRONTEND_URL === undefined) {
      delete process.env.FRONTEND_URL
    } else {
      process.env.FRONTEND_URL = ORIGINAL_FRONTEND_URL
    }
  })

  it('renders the brand-aligned welcome subject', () => {
    const { subject } = buildWelcomeEmail({
      recipientEmail: 'jane@example.com',
      unsubscribeUrl: 'http://localhost/unsub',
    })
    expect(subject).toBe('Welcome to ✦ Jewelry, handmade with love')
  })

  // CTA button URL respects FRONTEND_URL — confirms the welcome email points to
  // the right environment (prod vs preview vs local).
  it('uses FRONTEND_URL for the Explore CTA when set', () => {
    process.env.FRONTEND_URL = 'https://senichka.com'
    const { html } = buildWelcomeEmail({
      recipientEmail: 'jane@example.com',
      unsubscribeUrl: 'http://localhost/unsub',
    })
    expect(html).toContain('href="https://senichka.com/"')
  })

  it('falls back to the local dev URL when FRONTEND_URL is absent', () => {
    delete process.env.FRONTEND_URL
    const { html } = buildWelcomeEmail({
      recipientEmail: 'jane@example.com',
      unsubscribeUrl: 'http://localhost/unsub',
    })
    expect(html).toContain('href="http://localhost:3000/"')
  })

  // ── Welcome discount code (#525) ─────────────────────────────────────────

  it('renders the discount code block when welcomeCode + discountPercent are provided', () => {
    const { html, subject } = buildWelcomeEmail({
      recipientEmail: 'jane@example.com',
      unsubscribeUrl: 'http://localhost/unsub',
      welcomeCode: 'WELCOME15',
      discountPercent: 15,
    })
    expect(html).toContain('WELCOME15')
    expect(html).toContain('15% off your first order')
    expect(subject).toBe('Welcome to ✦ Jewelry — 15% off your first order inside')
  })

  it('omits the discount block entirely when welcomeCode is missing', () => {
    const { html, subject } = buildWelcomeEmail({
      recipientEmail: 'jane@example.com',
      unsubscribeUrl: 'http://localhost/unsub',
    })
    expect(html).not.toContain('WELCOME15')
    expect(html).not.toContain('off your first order')
    expect(subject).toBe('Welcome to ✦ Jewelry, handmade with love')
  })

  it('omits the discount block when discountPercent is 0 or absent', () => {
    const { html } = buildWelcomeEmail({
      recipientEmail: 'jane@example.com',
      unsubscribeUrl: 'http://localhost/unsub',
      welcomeCode: 'WELCOME15',
      discountPercent: 0,
    })
    expect(html).not.toContain('WELCOME15')
  })
})
