import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isDisplayCurrency, type DisplayCurrency } from '@jewelry/shared'

interface CurrencyStore {
  /** What the visitor sees prices in. Storage stays USD; this is display-only. */
  displayCurrency: DisplayCurrency
  setDisplayCurrency: (currency: DisplayCurrency) => void
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      // Primary market is US; visitors from CA/UK opt in via the header toggle.
      displayCurrency: 'USD',
      setDisplayCurrency: (displayCurrency) => set({ displayCurrency }),
    }),
    {
      name: 'display-currency',
      // skipHydration mirrors measurement.store — prevents SSR/client mismatch.
      skipHydration: true,
      // Guard against tampered localStorage. A user-supplied "EUR" would
      // otherwise crash Intl.NumberFormat in the formatter; resetting to USD
      // is silent and correct.
      partialize: (state) => state,
      merge: (persisted, current) => {
        const incoming = persisted as Partial<CurrencyStore> | undefined
        const candidate = incoming?.displayCurrency
        return {
          ...current,
          displayCurrency:
            typeof candidate === 'string' && isDisplayCurrency(candidate)
              ? candidate
              : current.displayCurrency,
        }
      },
    },
  ),
)
