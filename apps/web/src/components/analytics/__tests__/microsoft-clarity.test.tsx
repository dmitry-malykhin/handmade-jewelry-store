import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@/test-utils'
import { MicrosoftClarity } from '@/components/analytics/microsoft-clarity'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

let mockConsent = false

vi.mock('@/store/cookie-consent.store', () => ({
  useAnalyticsConsent: () => mockConsent,
}))

// next/script renders a real <script id="..."> in tests so we can inspect it
vi.mock('next/script', () => ({
  default: ({ id, children, strategy }: { id: string; children: string; strategy: string }) => (
    <script id={id} data-strategy={strategy}>
      {children}
    </script>
  ),
}))

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/analytics')
  await $allureSubSuite('microsoft-clarity')
  await $allureSeverity('normal')
})

describe('MicrosoftClarity', () => {
  beforeEach(() => {
    mockConsent = false
  })

  it('renders nothing without analytics consent', () => {
    mockConsent = false
    const { container } = render(<MicrosoftClarity projectId="abc1234xyz" />)
    expect(container.firstChild).toBeNull()
  })

  it('injects the Clarity loader script when consent is granted', () => {
    mockConsent = true
    render(<MicrosoftClarity projectId="abc1234xyz" />)

    const clarityScript = document.getElementById('microsoft-clarity')
    expect(clarityScript).not.toBeNull()
    expect(clarityScript?.textContent).toContain('clarity.ms/tag/')
    expect(clarityScript?.textContent).toContain('abc1234xyz')
  })

  it('loads the script with afterInteractive strategy (not blocking page load)', () => {
    mockConsent = true
    render(<MicrosoftClarity projectId="abc1234xyz" />)

    const clarityScript = document.getElementById('microsoft-clarity')
    expect(clarityScript).toHaveAttribute('data-strategy', 'afterInteractive')
  })

  it('embeds the exact projectId so swapping projects does not require a code change', () => {
    mockConsent = true
    const { rerender } = render(<MicrosoftClarity projectId="project-one" />)
    expect(document.getElementById('microsoft-clarity')?.textContent).toContain('project-one')

    rerender(<MicrosoftClarity projectId="project-two" />)
    expect(document.getElementById('microsoft-clarity')?.textContent).toContain('project-two')
  })
})
