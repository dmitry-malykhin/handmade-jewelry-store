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
    const { subject } = buildWelcomeEmail({ recipientEmail: 'jane@example.com' })
    expect(subject).toBe('Welcome to ✦ Jewelry — handmade with love')
  })

  // CTA button URL respects FRONTEND_URL — confirms the welcome email points to
  // the right environment (prod vs preview vs local).
  it('uses FRONTEND_URL for the Explore CTA when set', () => {
    process.env.FRONTEND_URL = 'https://senichka.com'
    const { html } = buildWelcomeEmail({ recipientEmail: 'jane@example.com' })
    expect(html).toContain('href="https://senichka.com/shop"')
  })

  it('falls back to the local dev URL when FRONTEND_URL is absent', () => {
    delete process.env.FRONTEND_URL
    const { html } = buildWelcomeEmail({ recipientEmail: 'jane@example.com' })
    expect(html).toContain('href="http://localhost:3001/shop"')
  })
})
