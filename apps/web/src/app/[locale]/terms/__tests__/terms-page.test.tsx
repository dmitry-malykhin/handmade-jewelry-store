import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import messages from '../../../../../messages/en.json'
import TermsPage from '../page'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

// next-intl/server: handles both string and { namespace, locale } call forms
vi.mock('next-intl/server', () => ({
  getTranslations: async (namespaceOrOptions: string | { namespace: string; locale?: string }) => {
    const namespace =
      typeof namespaceOrOptions === 'string' ? namespaceOrOptions : namespaceOrOptions.namespace
    const ns = (messages as unknown as Record<string, Record<string, string>>)[namespace] ?? {}
    return (key: string) => ns[key] ?? key
  },
  setRequestLocale: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

async function renderTermsPage() {
  const jsx = await TermsPage({ params: Promise.resolve({ locale: 'en' }) })
  return render(jsx)
}

const ORIGINAL_SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL
const ORIGINAL_LEGAL_EMAIL = process.env.NEXT_PUBLIC_LEGAL_EMAIL
const ORIGINAL_COMPANY_ADDRESS = process.env.NEXT_PUBLIC_COMPANY_ADDRESS
const TEST_SUPPORT_EMAIL = 'support@senichka.test'
const TEST_LEGAL_EMAIL = 'legal@senichka.test'
const TEST_COMPANY_ADDRESS = '123 Test Ave, Austin, TX, USA'

beforeEach(async () => {
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL = TEST_SUPPORT_EMAIL
  process.env.NEXT_PUBLIC_LEGAL_EMAIL = TEST_LEGAL_EMAIL
  process.env.NEXT_PUBLIC_COMPANY_ADDRESS = TEST_COMPANY_ADDRESS
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('terms-page')
  await $allureSeverity('normal')
})

afterEach(() => {
  if (ORIGINAL_SUPPORT_EMAIL === undefined) delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL
  else process.env.NEXT_PUBLIC_SUPPORT_EMAIL = ORIGINAL_SUPPORT_EMAIL
  if (ORIGINAL_LEGAL_EMAIL === undefined) delete process.env.NEXT_PUBLIC_LEGAL_EMAIL
  else process.env.NEXT_PUBLIC_LEGAL_EMAIL = ORIGINAL_LEGAL_EMAIL
  if (ORIGINAL_COMPANY_ADDRESS === undefined) delete process.env.NEXT_PUBLIC_COMPANY_ADDRESS
  else process.env.NEXT_PUBLIC_COMPANY_ADDRESS = ORIGINAL_COMPANY_ADDRESS
})

describe('TermsPage — metadata', () => {
  it('renders the page title heading', async () => {
    await renderTermsPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Terms of Service')
  })

  it('renders the last updated date', async () => {
    await renderTermsPage()
    expect(screen.getByText('Last updated: April 13, 2026')).toBeInTheDocument()
  })
})

describe('TermsPage — section structure', () => {
  it('renders all 12 section headings', async () => {
    await renderTermsPage()

    const expectedHeadings = [
      '1. Products and Orders',
      '2. Pricing and Payment',
      '3. Production and Shipping',
      '4. Returns and Refunds',
      '5. Intellectual Property',
      '6. User Accounts',
      '7. Prohibited Uses',
      '8. Disclaimer of Warranties',
      '9. Limitation of Liability',
      '10. Governing Law',
      '11. Changes to These Terms',
      '12. Contact Us',
    ]

    for (const heading of expectedHeadings) {
      expect(screen.getByRole('heading', { name: heading, level: 2 })).toBeInTheDocument()
    }
  })

  it('uses a <main> landmark as root element', async () => {
    await renderTermsPage()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})

describe('TermsPage — returns and refund policy', () => {
  it('states the 14-day return window', async () => {
    await renderTermsPage()
    expect(screen.getByText(/14 days/)).toBeInTheDocument()
  })

  it('states that custom/personalized pieces are exempt from the standard return policy', async () => {
    await renderTermsPage()
    // "non-refundable" is inside a <strong> tag — check the containing li text instead
    expect(screen.getByText(/custom or personalized pieces.*are exempt/i)).toBeInTheDocument()
  })

  it('renders the support email link for returns from NEXT_PUBLIC_SUPPORT_EMAIL', async () => {
    await renderTermsPage()
    const supportLink = screen.getByRole('link', { name: TEST_SUPPORT_EMAIL })
    expect(supportLink).toHaveAttribute('href', `mailto:${TEST_SUPPORT_EMAIL}`)
  })
})

describe('TermsPage — payment and legal', () => {
  it('mentions Stripe as the payment processor', async () => {
    await renderTermsPage()
    expect(screen.getByText(/Stripe/)).toBeInTheDocument()
  })

  it('mentions accepted payment methods including Apple Pay and Google Pay', async () => {
    await renderTermsPage()
    expect(screen.getByText(/Apple Pay/)).toBeInTheDocument()
    expect(screen.getByText(/Google Pay/)).toBeInTheDocument()
  })

  it('mentions buy-now-pay-later options (Klarna, Afterpay)', async () => {
    await renderTermsPage()
    expect(screen.getByText(/Klarna/)).toBeInTheDocument()
    expect(screen.getByText(/Afterpay/)).toBeInTheDocument()
  })

  it('renders the legal contact email from NEXT_PUBLIC_LEGAL_EMAIL', async () => {
    await renderTermsPage()
    const legalEmailLink = screen.getByRole('link', { name: TEST_LEGAL_EMAIL })
    expect(legalEmailLink).toHaveAttribute('href', `mailto:${TEST_LEGAL_EMAIL}`)
  })

  it('renders the physical postal address from NEXT_PUBLIC_COMPANY_ADDRESS', async () => {
    await renderTermsPage()
    expect(screen.getByText(TEST_COMPANY_ADDRESS)).toBeInTheDocument()
  })

  it('never emits an @example.com placeholder — that would invalidate the Terms', async () => {
    await renderTermsPage()
    expect(screen.queryByText(/@example\.com/i)).not.toBeInTheDocument()
  })
})

describe('TermsPage — cross-links', () => {
  it('links to the Privacy Policy page', async () => {
    await renderTermsPage()
    const privacyLink = screen.getByRole('link', { name: 'Privacy Policy' })
    expect(privacyLink).toHaveAttribute('href', '/privacy')
  })
})

describe('TermsPage — EU consumer protection carve-outs', () => {
  it('states that EU consumers retain statutory rights on custom/personalized items', async () => {
    await renderTermsPage()
    expect(screen.getByText(/EU consumers retain statutory rights/i)).toBeInTheDocument()
  })

  it('acknowledges the 2-year EU legal guarantee on physical goods in the warranties section', async () => {
    await renderTermsPage()
    expect(screen.getByText(/EU Sale of Goods Directive/i)).toBeInTheDocument()
    expect(screen.getByText(/2-year legal guarantee/i)).toBeInTheDocument()
  })

  it('excludes personal injury and negligence from liability limitations', async () => {
    await renderTermsPage()
    expect(
      screen.getByText(/death or personal injury caused by our negligence/i),
    ).toBeInTheDocument()
  })

  it('preserves EU consumer right to rely on laws of their country of residence', async () => {
    await renderTermsPage()
    expect(screen.getByText(/European Union.*mandatory protective provisions/i)).toBeInTheDocument()
  })

  it('states that lost-in-transit packages are resolved by the seller, not abandoned to the carrier', async () => {
    await renderTermsPage()
    expect(screen.getByText(/lost in transit.*we will work with the carrier/i)).toBeInTheDocument()
  })
})

describe('TermsPage — handmade-specific disclosures', () => {
  it('discloses that handmade products may have natural variations that are not defects', async () => {
    await renderTermsPage()
    // The "Products and Orders" section specifically states this policy
    expect(
      screen.getByText(/slight variations in color, texture, and dimensions/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/not considered defects/i)).toBeInTheDocument()
  })

  it('discloses production time of 5–10 business days before shipment', async () => {
    await renderTermsPage()
    // Unique string — only appears in the "Production and Shipping" section
    expect(screen.getByText(/production typically takes/i)).toBeInTheDocument()
  })

  it('discloses that import duties on international orders are the buyer responsibility', async () => {
    await renderTermsPage()
    // Unique phrase — only in the shipping section li about international orders
    expect(
      screen.getByText(/import duties and taxes levied by the destination country/i),
    ).toBeInTheDocument()
  })
})
