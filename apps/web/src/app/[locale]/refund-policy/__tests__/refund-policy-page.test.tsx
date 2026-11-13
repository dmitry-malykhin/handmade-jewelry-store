import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  cloneElement,
  createElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'
import messages from '../../../../../messages/en.json'
import RefundPolicyPage from '../page'
import {
  severity as $allureSeverity,
  subSuite as $allureSubSuite,
  suite as $allureSuite,
} from 'allure-js-commons'

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespaceOrOptions: string | { namespace: string; locale?: string }) => {
    const namespace =
      typeof namespaceOrOptions === 'string' ? namespaceOrOptions : namespaceOrOptions.namespace
    const ns = (messages as unknown as Record<string, Record<string, string>>)[namespace] ?? {}
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

// Stubbed because the real client component calls window.print; irrelevant to
// the structural/contract assertions below.
vi.mock('../_components/print-withdrawal-form-button', () => ({
  PrintWithdrawalFormButton: () => null,
}))

async function renderRefundPolicyPage() {
  const jsx = await RefundPolicyPage({ params: Promise.resolve({ locale: 'en' }) })
  return render(jsx)
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale/refund-policy')
  await $allureSubSuite('refund-policy-page')
  await $allureSeverity('normal')
})

describe('RefundPolicyPage (#605)', () => {
  it('renders the H1 title and last-updated stamp', async () => {
    await renderRefundPolicyPage()
    expect(screen.getByRole('heading', { level: 1, name: /Refund Policy/i })).toBeInTheDocument()
    expect(screen.getByText(/Last updated/i)).toBeInTheDocument()
  })

  it('renders every mandated section heading (cooling-off, exceptions, how to, costs, timing, statutory, withdrawal form)', async () => {
    await renderRefundPolicyPage()
    expect(
      screen.getByRole('heading', { level: 2, name: /14-day cooling-off period/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /^2\. Exceptions/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: /How to initiate a return/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: /Return shipping costs/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Refund timing/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Statutory rights/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /Standard EU withdrawal form \(CRD Annex I\)/i,
      }),
    ).toBeInTheDocument()
  })

  it('includes the CRD Annex I withdrawal form fields', async () => {
    await renderRefundPolicyPage()
    // Spot-check the three must-have statutory fields from Annex I part B
    expect(screen.getByText(/hereby give notice that I\/We/i)).toBeInTheDocument()
    expect(screen.getByText(/Name of consumer/i)).toBeInTheDocument()
    expect(screen.getByText(/Address of consumer/i)).toBeInTheDocument()
    expect(screen.getByText(/Signature of consumer/i)).toBeInTheDocument()
  })
})
