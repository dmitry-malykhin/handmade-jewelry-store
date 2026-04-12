import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import messages from '../../../../../messages/en.json'
import PrivacyPage from '../page'

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespaceOrOptions: string | { namespace: string; locale?: string }) => {
    const namespace =
      typeof namespaceOrOptions === 'string' ? namespaceOrOptions : namespaceOrOptions.namespace
    const ns = (messages as Record<string, Record<string, string>>)[namespace] ?? {}
    return (key: string) => ns[key] ?? key
  },
  setRequestLocale: vi.fn(),
}))

async function renderPrivacyPage() {
  const jsx = await PrivacyPage({ params: Promise.resolve({ locale: 'en' }) })
  return render(jsx)
}

describe('PrivacyPage — structure', () => {
  it('renders the page title heading', async () => {
    await renderPrivacyPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy Policy')
  })

  it('renders the last updated date', async () => {
    await renderPrivacyPage()
    expect(screen.getByText('Last updated: April 12, 2026')).toBeInTheDocument()
  })

  it('renders all 11 section headings', async () => {
    await renderPrivacyPage()
    expect(
      screen.getByRole('heading', { name: '1. Information We Collect', level: 2 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '2. How We Use Your Information', level: 2 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '3. Sharing Your Information', level: 2 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '4. Analytics and Tracking', level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '5. Cookies', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '6. Data Retention', level: 2 })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '7. Your Rights (GDPR / CCPA)', level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '8. Security', level: 2 })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: "9. Children's Privacy", level: 2 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '10. Changes to This Policy', level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '11. Contact Us', level: 2 })).toBeInTheDocument()
  })

  it('renders the Stripe privacy policy link', async () => {
    await renderPrivacyPage()
    const stripeLink = screen.getByRole('link', { name: "Stripe's Privacy Policy" })
    expect(stripeLink).toHaveAttribute('href', 'https://stripe.com/privacy')
    expect(stripeLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders third-party analytics services', async () => {
    await renderPrivacyPage()
    expect(screen.getByText(/Google Analytics 4/)).toBeInTheDocument()
    expect(screen.getByText(/PostHog/)).toBeInTheDocument()
    expect(screen.getByText(/Microsoft Clarity/)).toBeInTheDocument()
    expect(screen.getByText(/Facebook Pixel/)).toBeInTheDocument()
  })

  it('renders the GDPR/CCPA rights list', async () => {
    await renderPrivacyPage()
    expect(screen.getByText(/right to be forgotten/)).toBeInTheDocument()
  })

  it('renders contact email links', async () => {
    await renderPrivacyPage()
    const emailLinks = screen.getAllByRole('link', { name: 'privacy@example.com' })
    expect(emailLinks.length).toBeGreaterThanOrEqual(1)
    expect(emailLinks[0]).toHaveAttribute('href', 'mailto:privacy@example.com')
  })

  it('uses a <main> landmark as root element', async () => {
    await renderPrivacyPage()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
