import type { ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import messages from '../../messages/en.json'

/**
 * Wraps the component under test with all required providers.
 * Import this instead of @testing-library/react in component tests.
 *
 * Providers included:
 * - NextIntlClientProvider (locale: 'en') — satisfies useTranslations, useLocale
 * - QueryClientProvider — satisfies useQuery, useMutation, useQueryClient
 *
 * Note: next-themes ThemeProvider is NOT included here because it reads
 * localStorage and causes inconsistent test state. Mock useTheme per-test instead.
 */
function AllProviders({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  )
}

function renderWithProviders(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// Re-export everything from RTL so tests only need one import
export * from '@testing-library/react'
export { renderWithProviders as render }
