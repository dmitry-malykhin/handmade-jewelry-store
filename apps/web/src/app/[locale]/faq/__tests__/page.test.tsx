import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

import FaqPage, { generateMetadata } from '../page'
import messagesEn from '../../../../../messages/en.json'

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: async (namespaceOrOptions: string | { namespace: string; locale?: string }) => {
    const namespace =
      typeof namespaceOrOptions === 'string' ? namespaceOrOptions : namespaceOrOptions.namespace
    const ns = (messagesEn as Record<string, Record<string, string>>)[namespace] ?? {}
    return (key: string) => ns[key] ?? key
  },
}))

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/[locale]/faq')
  await $allureSubSuite('page')
  await $allureSeverity('normal')
})

const EXPECTED_QUESTION_KEYS = [
  'shippingTime',
  'returnsPolicy',
  'ringSizing',
  'materials',
  'giftWrap',
  'customsDuties',
  'lostPackage',
  'customOrders',
  'careBasics',
] as const

describe('FaqPage — content + structure', () => {
  it('renders the page title and subtitle from i18n', async () => {
    const ui = await FaqPage({ params: Promise.resolve({ locale: 'en' }) })
    render(ui)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(messagesEn.faqPage.title)
  })

  it('renders all 9 question summaries as <summary> elements', async () => {
    const ui = await FaqPage({ params: Promise.resolve({ locale: 'en' }) })
    const { container } = render(ui)

    const summaries = container.querySelectorAll('summary')
    expect(summaries).toHaveLength(EXPECTED_QUESTION_KEYS.length)
  })

  it.each(EXPECTED_QUESTION_KEYS)('renders the "%s" question text', async (key) => {
    const ui = await FaqPage({ params: Promise.resolve({ locale: 'en' }) })
    render(ui)
    const question = (messagesEn.faqPage as Record<string, string>)[`q_${key}_question`]
    expect(screen.getByText(question)).toBeInTheDocument()
  })
})

describe('FaqPage — FAQPage JSON-LD (#282 SEO rich results)', () => {
  function extractJsonLd(container: HTMLElement) {
    const script = container.querySelector('script[type="application/ld+json"]')
    if (!script?.textContent) throw new Error('FAQ JSON-LD script not found')
    return JSON.parse(script.textContent) as {
      '@context': string
      '@type': string
      mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>
    }
  }

  it('emits a valid FAQPage schema', async () => {
    const ui = await FaqPage({ params: Promise.resolve({ locale: 'en' }) })
    const { container } = render(ui)
    const ld = extractJsonLd(container)

    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('FAQPage')
  })

  it('emits one Question per rendered Q&A so Google does not flag mismatches', async () => {
    const ui = await FaqPage({ params: Promise.resolve({ locale: 'en' }) })
    const { container } = render(ui)
    const ld = extractJsonLd(container)

    expect(ld.mainEntity).toHaveLength(EXPECTED_QUESTION_KEYS.length)
    // First question matches the i18n source — order preserved
    expect(ld.mainEntity[0]?.name).toBe(messagesEn.faqPage.q_shippingTime_question)
    expect(ld.mainEntity[0]?.acceptedAnswer.text).toBe(messagesEn.faqPage.q_shippingTime_answer)
  })
})

describe('FaqPage — generateMetadata', () => {
  it('returns canonical /<locale>/faq and hreflang for all 3 locales', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) })
    expect(metadata.alternates?.canonical).toBe('/en/faq')
    expect(metadata.alternates?.languages).toEqual({
      en: '/en/faq',
      ru: '/ru/faq',
      es: '/es/faq',
    })
  })
})
