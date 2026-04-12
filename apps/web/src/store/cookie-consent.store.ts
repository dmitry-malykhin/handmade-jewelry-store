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

  /** Accept all optional cookie categories. */
  acceptAll: () => void

  /** Reject all optional cookie categories. */
  rejectAll: () => void

  /** Save a custom selection. */
  savePreferences: (preferences: CookieConsentPreferences) => void
}

export const useCookieConsentStore = create<CookieConsentStore>()(
  persist(
    (set) => ({
      hasDecided: false,
      preferences: { analytics: false, marketing: false },

      acceptAll: () =>
        set({
          hasDecided: true,
          preferences: { analytics: true, marketing: true },
        }),

      rejectAll: () =>
        set({
          hasDecided: true,
          preferences: { analytics: false, marketing: false },
        }),

      savePreferences: (preferences) =>
        set({
          hasDecided: true,
          preferences,
        }),
    }),
    {
      name: 'cookie-consent',
      // skipHydration prevents SSR/client mismatch — consent is client-only state
      skipHydration: true,
    },
  ),
)

// ── Selector hooks ─────────────────────────────────────────────────────────────

export const useHasCookieDecision = () => useCookieConsentStore((state) => state.hasDecided)

export const useAnalyticsConsent = () =>
  useCookieConsentStore((state) => state.preferences.analytics)

export const useMarketingConsent = () =>
  useCookieConsentStore((state) => state.preferences.marketing)
