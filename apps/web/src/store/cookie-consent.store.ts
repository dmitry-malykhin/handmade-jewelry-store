import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Granular consent categories.
 * - analytics: GA4, PostHog, Microsoft Clarity (session recordings)
 * - marketing: Facebook Pixel, Google Ads remarketing, Klaviyo tracking
 * Strictly necessary cookies (cart, session, security) never require consent.
 */
export interface CookieConsentPreferences {
  analytics: boolean
  marketing: boolean
}

interface CookieConsentStore {
  /** Whether the user has made a consent decision (accepted or customised). */
  hasDecided: boolean

  preferences: CookieConsentPreferences

  // California CPRA (Cal. Civ. Code §1798.135) opt-out. When true, both analytics
  // and marketing are forced OFF and further consent UIs must not re-enable them
  // without an explicit new opt-in from the user. Also set automatically when
  // navigator.globalPrivacyControl (GPC) is true, per CPRA regulations.
  doNotSellOptedOut: boolean

  /** Accept all optional cookie categories. */
  acceptAll: () => void

  /** Reject all optional cookie categories. */
  rejectAll: () => void

  /** Save a custom selection. */
  savePreferences: (preferences: CookieConsentPreferences) => void

  /** CCPA/CPRA "Do Not Sell or Share" opt-out. Forces both categories OFF. */
  doNotSellOptOut: () => void
}

export const useCookieConsentStore = create<CookieConsentStore>()(
  persist(
    (set, get) => ({
      hasDecided: false,
      preferences: { analytics: false, marketing: false },
      doNotSellOptedOut: false,

      acceptAll: () => {
        // A prior Do-Not-Sell opt-out (or GPC signal) blocks blanket accept:
        // both categories stay OFF until the user explicitly clears the opt-out.
        if (get().doNotSellOptedOut) {
          set({ hasDecided: true, preferences: { analytics: false, marketing: false } })
          return
        }
        set({
          hasDecided: true,
          preferences: { analytics: true, marketing: true },
        })
      },

      rejectAll: () =>
        set({
          hasDecided: true,
          preferences: { analytics: false, marketing: false },
        }),

      savePreferences: (preferences) => {
        // Same guard as acceptAll: an active Do-Not-Sell opt-out overrides a
        // marketing=true toggle so the two states can never disagree.
        if (get().doNotSellOptedOut) {
          set({
            hasDecided: true,
            preferences: { analytics: false, marketing: false },
          })
          return
        }
        set({
          hasDecided: true,
          preferences,
        })
      },

      doNotSellOptOut: () =>
        set({
          hasDecided: true,
          preferences: { analytics: false, marketing: false },
          doNotSellOptedOut: true,
        }),
    }),
    {
      name: 'cookie-consent',
      // skipHydration prevents SSR/client mismatch; consent is client-only state.
      skipHydration: true,
    },
  ),
)

export const useHasCookieDecision = () => useCookieConsentStore((state) => state.hasDecided)

export const useAnalyticsConsent = () =>
  useCookieConsentStore((state) => state.preferences.analytics)

export const useMarketingConsent = () =>
  useCookieConsentStore((state) => state.preferences.marketing)

export const useDoNotSellOptedOut = () => useCookieConsentStore((state) => state.doNotSellOptedOut)
