import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { DoNotSellLink } from '../do-not-sell-link'
import { useCookieConsentStore } from '@/store/cookie-consent.store'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockAddBreadcrumb = vi.fn()
vi.mock('@sentry/nextjs', () => ({
  addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
}))

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/shared')
  await $allureSubSuite('do-not-sell-link')
  await $allureSeverity('critical')
})

function resetStore() {
  useCookieConsentStore.setState({
    hasDecided: false,
    preferences: { analytics: false, marketing: false },
    doNotSellOptedOut: false,
  })
}

describe('DoNotSellLink', () => {
  beforeEach(resetStore)

  it('renders the CPRA-required link text', () => {
    render(<DoNotSellLink />)
    expect(
      screen.getByRole('button', {
        name: /opt out of the sale or sharing of your personal information/i,
      }),
    ).toBeInTheDocument()
  })

  it('opts the user out of sale/share on click (forces both categories OFF)', async () => {
    const user = userEvent.setup()
    // Start with marketing consent enabled to prove the opt-out flips it OFF.
    useCookieConsentStore.setState({
      hasDecided: true,
      preferences: { analytics: true, marketing: true },
      doNotSellOptedOut: false,
    })

    render(<DoNotSellLink />)
    await user.click(screen.getByRole('button'))

    const state = useCookieConsentStore.getState()
    expect(state.doNotSellOptedOut).toBe(true)
    expect(state.preferences).toEqual({ analytics: false, marketing: false })
  })

  it('renders a Restore control once opted out (#614)', () => {
    useCookieConsentStore.setState({ doNotSellOptedOut: true, hasDecided: true })
    render(<DoNotSellLink />)
    expect(screen.getByRole('button')).toHaveTextContent(/Restore marketing preferences/i)
  })

  describe('restore flow (#614 CPRA opt-back-in)', () => {
    beforeEach(() => {
      mockAddBreadcrumb.mockClear()
    })

    it('clears the opt-out flag and resets hasDecided so the banner re-opens', async () => {
      const user = userEvent.setup()
      useCookieConsentStore.setState({
        hasDecided: true,
        preferences: { analytics: false, marketing: false },
        doNotSellOptedOut: true,
      })

      render(<DoNotSellLink />)
      await user.click(screen.getByRole('button'))

      const state = useCookieConsentStore.getState()
      expect(state.doNotSellOptedOut).toBe(false)
      expect(state.hasDecided).toBe(false)
      // Preferences stay OFF until the user records a fresh choice via the banner
      expect(state.preferences).toEqual({ analytics: false, marketing: false })
    })

    it('emits a Sentry breadcrumb for the audit trail', async () => {
      const user = userEvent.setup()
      useCookieConsentStore.setState({ doNotSellOptedOut: true, hasDecided: true })

      render(<DoNotSellLink />)
      await user.click(screen.getByRole('button'))

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'consent',
          message: 'cpra.opt-back-in',
        }),
      )
    })
  })
})
