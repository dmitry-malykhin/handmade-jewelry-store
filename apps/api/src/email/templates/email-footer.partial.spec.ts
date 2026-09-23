import { renderEmailFooter } from './email-footer.partial'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('api/email')
  await $allureSubSuite('email-footer.partial')
  await $allureSeverity('critical')
})

describe('renderEmailFooter', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    process.env.STORE_LEGAL_NAME = 'Handmade Jewelry Ltd'
    process.env.STORE_ADDRESS_LINE1 = '5 Test Street'
    process.env.STORE_CITY = 'Berlin'
    process.env.STORE_POSTAL_CODE = '10115'
    process.env.STORE_COUNTRY = 'Germany'
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('renders legal name + full postal address in every variant (CAN-SPAM §7704(a)(5))', () => {
    const marketing = renderEmailFooter({
      variant: 'marketing',
      unsubscribeUrl: 'https://example.com/unsub',
    })
    const transactional = renderEmailFooter({ variant: 'transactional' })

    for (const html of [marketing, transactional]) {
      expect(html).toContain('Handmade Jewelry Ltd')
      expect(html).toContain('5 Test Street')
      expect(html).toContain('10115 Berlin')
      expect(html).toContain('Germany')
    }
  })

  it('marketing variant renders a working unsubscribe link', () => {
    const html = renderEmailFooter({
      variant: 'marketing',
      unsubscribeUrl: 'https://example.com/unsub?token=abc&email=a%40b.com',
    })
    expect(html).toContain('href="https://example.com/unsub?token=abc&amp;email=a%40b.com"')
    expect(html).toContain('Unsubscribe')
  })

  it('transactional variant omits any unsubscribe link', () => {
    const html = renderEmailFooter({ variant: 'transactional' })
    expect(html).not.toContain('Unsubscribe')
    expect(html).not.toContain('unsub')
  })

  it('throws if marketing variant is asked for without unsubscribeUrl', () => {
    expect(() => renderEmailFooter({ variant: 'marketing' })).toThrow(/unsubscribeUrl/)
  })

  it('escapes HTML in the legal name to prevent injection via env misconfig', () => {
    process.env.STORE_LEGAL_NAME = 'Evil <script>alert(1)</script> Corp'
    const html = renderEmailFooter({ variant: 'transactional' })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
