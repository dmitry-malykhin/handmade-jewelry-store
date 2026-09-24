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

  it('renders a persistent "You are opted out" label once opted out', () => {
    useCookieConsentStore.setState({ doNotSellOptedOut: true, hasDecided: true })
    render(<DoNotSellLink />)
    expect(screen.getByRole('button')).toHaveTextContent(/you are opted out/i)
  })
})
