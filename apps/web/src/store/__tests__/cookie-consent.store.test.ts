import { describe, it, expect, beforeEach } from 'vitest'
import { useCookieConsentStore } from '../cookie-consent.store'

function getStore() {
  return useCookieConsentStore.getState()
}

function resetStore() {
  useCookieConsentStore.setState({
    hasDecided: false,
    preferences: { analytics: false, marketing: false },
  })
}

describe('useCookieConsentStore — initial state', () => {
  beforeEach(resetStore)

  it('starts with hasDecided = false', () => {
    expect(getStore().hasDecided).toBe(false)
  })

  it('starts with all preferences set to false', () => {
    expect(getStore().preferences).toEqual({ analytics: false, marketing: false })
  })
})

describe('useCookieConsentStore — acceptAll', () => {
  beforeEach(resetStore)

  it('sets hasDecided to true', () => {
    getStore().acceptAll()
    expect(getStore().hasDecided).toBe(true)
  })

  it('enables both analytics and marketing', () => {
    getStore().acceptAll()
    expect(getStore().preferences.analytics).toBe(true)
    expect(getStore().preferences.marketing).toBe(true)
  })
})

describe('useCookieConsentStore — rejectAll', () => {
  beforeEach(() => {
    // Start from an accepted state to verify rejectAll truly resets
    useCookieConsentStore.setState({
      hasDecided: true,
      preferences: { analytics: true, marketing: true },
    })
  })

  it('sets hasDecided to true', () => {
    getStore().rejectAll()
    expect(getStore().hasDecided).toBe(true)
  })

  it('disables both analytics and marketing', () => {
    getStore().rejectAll()
    expect(getStore().preferences.analytics).toBe(false)
    expect(getStore().preferences.marketing).toBe(false)
  })
})

describe('useCookieConsentStore — savePreferences', () => {
  beforeEach(resetStore)

  it('sets hasDecided to true after saving', () => {
    getStore().savePreferences({ analytics: true, marketing: false })
    expect(getStore().hasDecided).toBe(true)
  })

  it('saves analytics=true, marketing=false correctly', () => {
    getStore().savePreferences({ analytics: true, marketing: false })
    expect(getStore().preferences).toEqual({ analytics: true, marketing: false })
  })

  it('saves analytics=false, marketing=true correctly', () => {
    getStore().savePreferences({ analytics: false, marketing: true })
    expect(getStore().preferences).toEqual({ analytics: false, marketing: true })
  })

  it('saves both enabled correctly', () => {
    getStore().savePreferences({ analytics: true, marketing: true })
    expect(getStore().preferences).toEqual({ analytics: true, marketing: true })
  })
})

describe('useCookieConsentStore — manual state reset (re-open banner)', () => {
  beforeEach(() => {
    useCookieConsentStore.setState({
      hasDecided: true,
      preferences: { analytics: true, marketing: true },
    })
  })

  it('setting hasDecided=false re-shows the banner', () => {
    useCookieConsentStore.setState({ hasDecided: false })
    expect(getStore().hasDecided).toBe(false)
  })

  it('preferences are preserved after resetting hasDecided', () => {
    useCookieConsentStore.setState({ hasDecided: false })
    expect(getStore().preferences).toEqual({ analytics: true, marketing: true })
  })
})
