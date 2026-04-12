import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import messages from '../../../../../messages/en.json'
import TermsPage from '../page'

// next-intl/server: handles both string and { namespace, locale } call forms
vi.mock('next-intl/server', () => ({
  getTranslations: async (namespaceOrOptions: string | { namespace: string; locale?: string }) => {
    const namespace =
      typeof namespaceOrOptions === 'string' ? namespaceOrOptions : namespaceOrOptions.namespace
    const ns = (messages as Record<string, Record<string, string>>)[namespace] ?? {}
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

  it('states that custom/personalized pieces are non-refundable', async () => {
    await renderTermsPage()
    expect(screen.getByText(/non-refundable/)).toBeInTheDocument()
  })

  it('renders the support email link for returns', async () => {
    await renderTermsPage()
    const supportLink = screen.getByRole('link', { name: 'support@example.com' })
    expect(supportLink).toHaveAttribute('href', 'mailto:support@example.com')
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

  it('renders the legal@example.com contact email in the contact section', async () => {
    await renderTermsPage()
    const legalEmailLink = screen.getByRole('link', { name: 'legal@example.com' })
    expect(legalEmailLink).toHaveAttribute('href', 'mailto:legal@example.com')
  })
})

describe('TermsPage — cross-links', () => {
  it('links to the Privacy Policy page', async () => {
    await renderTermsPage()
    const privacyLink = screen.getByRole('link', { name: 'Privacy Policy' })
    expect(privacyLink).toHaveAttribute('href', '/privacy')
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
