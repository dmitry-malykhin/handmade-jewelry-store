import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Fragment, cloneElement, createElement, isValidElement } from 'react'
import type { ReactNode, ReactElement } from 'react'
import messages from '../../../../../messages/en.json'
import PrivacyPage from '../page'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespaceOrOptions: string | { namespace: string; locale?: string }) => {
    const namespace =
      typeof namespaceOrOptions === 'string' ? namespaceOrOptions : namespaceOrOptions.namespace
    const ns = (messages as unknown as Record<string, Record<string, string>>)[namespace] ?? {}
    // Mock t + t.rich — real next-intl returns React nodes, but tests only
    // read text content, so string-substituting the tag/parameter markers is enough.
    const t = (key: string) => ns[key] ?? key
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(t as any).rich = (key: string, tags?: Record<string, unknown>) => {
      let raw = ns[key] ?? key
      if (tags) {
        for (const [name, val] of Object.entries(tags)) {
          if (typeof val !== 'function') {
            raw = raw.replace(new RegExp(`\\{${name}\\}`, 'g'), String(val))
          }
        }
      }
      // Split around <tag>content</tag> markers and call the matching tag fn
      // so tests can query real <a>/<strong> nodes via getByRole('link'), etc.
      const parts: ReactNode[] = []
      let remaining = raw
      let key_i = 0
      const tagRegex = /<(\w+)>([^<]*)<\/\1>/
      while (remaining) {
        const m = tagRegex.exec(remaining)
        if (!m) {
          parts.push(remaining)
          break
        }
        if (m.index > 0) parts.push(remaining.slice(0, m.index))
        const tagName = m[1]!
        const content = m[2]!
        const fn = tags?.[tagName]
        if (typeof fn === 'function') {
          const rendered = (fn as (chunks: ReactNode) => ReactNode)(content)
          parts.push(isValidElement(rendered) ? cloneElement(rendered, { key: key_i++ }) : rendered)
        } else {
          parts.push(content)
        }
        remaining = remaining.slice(m.index + m[0].length)
      }
      return createElement(Fragment, null, ...parts) as ReactElement
    }
    return t
  },
  setRequestLocale: vi.fn(),
}))

async function renderPrivacyPage() {
  const jsx = await PrivacyPage({ params: Promise.resolve({ locale: 'en' }) })
  return render(jsx)
}

const ORIGINAL_PRIVACY_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL
const ORIGINAL_COMPANY_ADDRESS = process.env.NEXT_PUBLIC_COMPANY_ADDRESS
const TEST_PRIVACY_EMAIL = 'privacy@senichka.test'
const TEST_COMPANY_ADDRESS = '123 Test Ave, Austin, TX, USA'

beforeEach(async () => {
  process.env.NEXT_PUBLIC_PRIVACY_EMAIL = TEST_PRIVACY_EMAIL
  process.env.NEXT_PUBLIC_COMPANY_ADDRESS = TEST_COMPANY_ADDRESS
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('privacy-page')
  await $allureSeverity('normal')
})

afterEach(() => {
  if (ORIGINAL_PRIVACY_EMAIL === undefined) delete process.env.NEXT_PUBLIC_PRIVACY_EMAIL
  else process.env.NEXT_PUBLIC_PRIVACY_EMAIL = ORIGINAL_PRIVACY_EMAIL
  if (ORIGINAL_COMPANY_ADDRESS === undefined) delete process.env.NEXT_PUBLIC_COMPANY_ADDRESS
  else process.env.NEXT_PUBLIC_COMPANY_ADDRESS = ORIGINAL_COMPANY_ADDRESS
})

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

  it('renders contact email links from NEXT_PUBLIC_PRIVACY_EMAIL', async () => {
    await renderPrivacyPage()
    const emailLinks = screen.getAllByRole('link', { name: TEST_PRIVACY_EMAIL })
    expect(emailLinks.length).toBeGreaterThanOrEqual(1)
    expect(emailLinks[0]).toHaveAttribute('href', `mailto:${TEST_PRIVACY_EMAIL}`)
  })

  it('renders the physical postal address from NEXT_PUBLIC_COMPANY_ADDRESS', async () => {
    await renderPrivacyPage()
    expect(screen.getByText(TEST_COMPANY_ADDRESS)).toBeInTheDocument()
  })

  it('never emits an @example.com placeholder — that would invalidate the policy', async () => {
    await renderPrivacyPage()
    expect(screen.queryByText(/@example\.com/i)).not.toBeInTheDocument()
  })

  it('uses a <main> landmark as root element', async () => {
    await renderPrivacyPage()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
