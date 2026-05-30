import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@/test-utils'
import { PostHogAnalytics } from '@/components/analytics/posthog'
import posthog from 'posthog-js'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

// Mutable hook return values — each test seeds the values via the mocked
// modules before rendering. Keeps imports clean and avoids per-test imports.
let mockConsent = false
let mockAccessToken: string | null = null
let mockPathname = '/en/shop'
let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}))

vi.mock('@/store/cookie-consent.store', () => ({
  useAnalyticsConsent: () => mockConsent,
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: mockAccessToken }),
}))

const initMock = vi.fn()
const captureMock = vi.fn()
const identifyMock = vi.fn()
const resetMock = vi.fn()
const optOutMock = vi.fn()
const optInMock = vi.fn()

vi.mock('posthog-js', () => {
  const instance = {
    __loaded: false,
    init: (...args: unknown[]) => {
      initMock(...args)
      // Simulate async SDK bootstrap completing immediately for tests
      const config = args[1] as { loaded?: (ph: typeof instance) => void } | undefined
      ;(instance as { __loaded: boolean }).__loaded = true
      config?.loaded?.(instance)
    },
    capture: (...args: unknown[]) => captureMock(...args),
    identify: (...args: unknown[]) => identifyMock(...args),
    reset: () => resetMock(),
    opt_out_capturing: () => optOutMock(),
    opt_in_capturing: () => optInMock(),
    debug: () => {},
  }
  return { default: instance }
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/analytics')
  await $allureSubSuite('posthog')
  await $allureSeverity('normal')
})

describe('PostHogAnalytics', () => {
  beforeEach(() => {
    initMock.mockClear()
    captureMock.mockClear()
    identifyMock.mockClear()
    resetMock.mockClear()
    optOutMock.mockClear()
    optInMock.mockClear()
    mockConsent = false
    mockAccessToken = null
    mockPathname = '/en/shop'
    mockSearchParams = new URLSearchParams()
    ;(posthog as unknown as { __loaded: boolean }).__loaded = false
  })

  afterEach(() => {
    ;(posthog as unknown as { __loaded: boolean }).__loaded = false
  })

  it('does not initialize PostHog without consent', () => {
    mockConsent = false
    const { container } = render(<PostHogAnalytics apiKey="phc_test" />)
    expect(initMock).not.toHaveBeenCalled()
    expect(container.firstChild).toBeNull()
  })

  it('initializes the SDK and captures the initial pageview when consent is granted', () => {
    mockConsent = true
    render(<PostHogAnalytics apiKey="phc_test" />)

    expect(initMock).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        capture_pageview: false,
        autocapture: false,
      }),
    )
    expect(captureMock).toHaveBeenCalledWith('$pageview', { $current_url: '/en/shop' })
  })

  it('includes search params in the captured pageview URL', () => {
    mockConsent = true
    mockSearchParams = new URLSearchParams('categorySlug=rings')
    render(<PostHogAnalytics apiKey="phc_test" />)

    expect(captureMock).toHaveBeenCalledWith('$pageview', {
      $current_url: '/en/shop?categorySlug=rings',
    })
  })

  it('identifies the user when a JWT access token is present', () => {
    mockConsent = true
    // header.payload.signature with sub/email/role
    const payload = btoa(JSON.stringify({ sub: 'user-7', email: 'a@b.com', role: 'USER' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    mockAccessToken = `header.${payload}.sig`

    render(<PostHogAnalytics apiKey="phc_test" />)

    expect(identifyMock).toHaveBeenCalledWith('user-7', { email: 'a@b.com', role: 'USER' })
  })

  it('calls reset when there is no access token (anonymous session)', () => {
    mockConsent = true
    mockAccessToken = null

    render(<PostHogAnalytics apiKey="phc_test" />)

    expect(resetMock).toHaveBeenCalled()
    expect(identifyMock).not.toHaveBeenCalled()
  })

  it('opts out and resets when consent is revoked after SDK was loaded', () => {
    mockConsent = true
    const { rerender } = render(<PostHogAnalytics apiKey="phc_test" />)
    expect(initMock).toHaveBeenCalledTimes(1)

    // Simulate user revoking analytics consent via the cookie banner
    mockConsent = false
    rerender(<PostHogAnalytics apiKey="phc_test" />)

    expect(optOutMock).toHaveBeenCalled()
    expect(resetMock).toHaveBeenCalled()
  })
})
