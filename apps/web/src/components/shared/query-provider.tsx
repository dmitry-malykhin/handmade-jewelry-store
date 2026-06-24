'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1_000,
        gcTime: 10 * 60 * 1_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // Per-instance client (not module singleton) so SSR requests don't leak
  // cached data between users in App Router.
  const [queryClient] = useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
