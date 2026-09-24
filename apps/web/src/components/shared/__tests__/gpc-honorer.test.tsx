import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '@/test-utils'
import { GpcHonorer } from '../gpc-honorer'
import { useCookieConsentStore } from '@/store/cookie-consent.store'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/shared')
  await $allureSubSuite('gpc-honorer')
  await $allureSeverity('critical')
})

function resetStore() {
  useCookieConsentStore.setState({
    hasDecided: false,
    preferences: { analytics: false, marketing: false },
    doNotSellOptedOut: false,
  })
}

interface NavigatorWithGpc extends Navigator {
  globalPrivacyControl?: boolean
}

describe('GpcHonorer', () => {
  beforeEach(resetStore)
  afterEach(() => {
    delete (navigator as NavigatorWithGpc).globalPrivacyControl
  })

  it('forces Do-Not-Sell opt-out when navigator.globalPrivacyControl is true', () => {
    ;(navigator as NavigatorWithGpc).globalPrivacyControl = true

    render(<GpcHonorer />)

    const state = useCookieConsentStore.getState()
    expect(state.doNotSellOptedOut).toBe(true)
    expect(state.preferences).toEqual({ analytics: false, marketing: false })
  })

  it('does nothing when GPC is absent or false', () => {
    ;(navigator as NavigatorWithGpc).globalPrivacyControl = false

    render(<GpcHonorer />)

    expect(useCookieConsentStore.getState().doNotSellOptedOut).toBe(false)
  })

  it('does not overwrite an existing opt-out (idempotent on repeat renders)', () => {
    ;(navigator as NavigatorWithGpc).globalPrivacyControl = true
    useCookieConsentStore.setState({
      doNotSellOptedOut: true,
      hasDecided: true,
      preferences: { analytics: false, marketing: false },
    })

    render(<GpcHonorer />)

    expect(useCookieConsentStore.getState().doNotSellOptedOut).toBe(true)
  })
})
