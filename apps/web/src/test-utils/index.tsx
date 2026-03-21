import type { ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../messages/en.json'

/**
 * Wraps the component under test with all required providers.
 * Import this instead of @testing-library/react in component tests.
 *
 * Providers included:
 * - NextIntlClientProvider (locale: 'en') — satisfies useTranslations, useLocale
 *
 * Note: next-themes ThemeProvider is NOT included here because it reads
 * localStorage and causes inconsistent test state. Mock useTheme per-test instead.
 */
function AllProviders({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}

function renderWithProviders(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// Re-export everything from RTL so tests only need one import
export * from '@testing-library/react'
export { renderWithProviders as render }
