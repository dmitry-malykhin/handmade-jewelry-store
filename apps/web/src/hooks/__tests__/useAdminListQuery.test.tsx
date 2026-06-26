import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminListQuery } from '../useAdminListQuery'
import { useAuthStore } from '@/store/auth.store'

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}))

const mockUseAuthStore = vi.mocked(useAuthStore)

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAdminListQuery()', () => {
  it('invokes fetcher with queryParams and accessToken when token is present', async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ accessToken: 'token-abc' } as Parameters<typeof selector>[0]),
    )
    const fetcher = vi.fn().mockResolvedValue({ data: [{ id: '1' }], meta: { totalCount: 1 } })

    const { result } = renderHook(
      () =>
        useAdminListQuery({
          queryKey: ['admin', 'widgets'],
          queryParams: { page: 2, status: 'ACTIVE' },
          fetcher,
        }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetcher).toHaveBeenCalledWith({ page: 2, status: 'ACTIVE' }, 'token-abc')
    expect(result.current.data).toEqual({ data: [{ id: '1' }], meta: { totalCount: 1 } })
  })

  it('disables the query when accessToken is null', () => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ accessToken: null } as Parameters<typeof selector>[0]),
    )
    const fetcher = vi.fn()

    const { result } = renderHook(
      () => useAdminListQuery({ queryKey: ['admin', 'x'], queryParams: {}, fetcher }),
      { wrapper },
    )

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.current.isPending).toBe(true)
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('includes queryParams in the cache key so different filters fetch independently', async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ accessToken: 'token-abc' } as Parameters<typeof selector>[0]),
    )
    const fetcher = vi.fn().mockResolvedValue({ data: [], meta: { totalCount: 0 } })

    const { rerender, result } = renderHook(
      ({ status }: { status: string }) =>
        useAdminListQuery({
          queryKey: ['admin', 'widgets'],
          queryParams: { status },
          fetcher,
        }),
      { wrapper, initialProps: { status: 'A' } },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    rerender({ status: 'B' })
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))

    expect(fetcher.mock.calls[0]).toEqual([{ status: 'A' }, 'token-abc'])
    expect(fetcher.mock.calls[1]).toEqual([{ status: 'B' }, 'token-abc'])
  })
})
