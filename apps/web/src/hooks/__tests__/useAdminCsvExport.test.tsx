import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { toast } from 'sonner'
import { useAdminCsvExport } from '../useAdminCsvExport'
import { useAuthStore } from '@/store/auth.store'
import { ApiError } from '@/lib/api/client'
import messages from '../../../messages/en.json'

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockUseAuthStore = vi.mocked(useAuthStore)
const mockToast = vi.mocked(toast)

function wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAdminCsvExport()', () => {
  it('runs the download with accessToken and toasts success on resolve', async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ accessToken: 'token-abc' } as Parameters<typeof selector>[0]),
    )
    const download = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() => useAdminCsvExport({ download }), { wrapper })

    expect(result.current.isExporting).toBe(false)
    expect(result.current.isExportDisabled).toBe(false)

    await act(async () => {
      await result.current.handleExport()
    })

    expect(download).toHaveBeenCalledWith('token-abc')
    expect(mockToast.success).toHaveBeenCalled()
    expect(result.current.isExporting).toBe(false)
  })

  it('flips isExporting true while the download is in flight', async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ accessToken: 'token-abc' } as Parameters<typeof selector>[0]),
    )
    let resolveDownload: () => void = () => {}
    const download = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDownload = resolve
        }),
    )

    const { result } = renderHook(() => useAdminCsvExport({ download }), { wrapper })

    let exportPromise: Promise<void>
    act(() => {
      exportPromise = result.current.handleExport()
    })

    await waitFor(() => expect(result.current.isExporting).toBe(true))

    await act(async () => {
      resolveDownload()
      await exportPromise
    })

    expect(result.current.isExporting).toBe(false)
  })

  it('toasts ApiError.message on failure and clears isExporting', async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ accessToken: 'token-abc' } as Parameters<typeof selector>[0]),
    )
    const download = vi.fn().mockRejectedValue(new ApiError(429, 'Quota exceeded'))

    const { result } = renderHook(() => useAdminCsvExport({ download }), { wrapper })

    await act(async () => {
      await result.current.handleExport()
    })

    expect(mockToast.error).toHaveBeenCalledWith('Quota exceeded')
    expect(result.current.isExporting).toBe(false)
  })

  it('falls back to localized error message for non-ApiError throws', async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ accessToken: 'token-abc' } as Parameters<typeof selector>[0]),
    )
    const download = vi.fn().mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useAdminCsvExport({ download }), { wrapper })

    await act(async () => {
      await result.current.handleExport()
    })

    const errorMock = vi.mocked(mockToast.error)
    expect(errorMock).toHaveBeenCalled()
    expect(errorMock.mock.calls[0]?.[0]).not.toBe('network down')
  })

  it('blocks export and reports disabled when accessToken is null', async () => {
    mockUseAuthStore.mockImplementation((selector) =>
      selector({ accessToken: null } as Parameters<typeof selector>[0]),
    )
    const download = vi.fn()

    const { result } = renderHook(() => useAdminCsvExport({ download }), { wrapper })

    expect(result.current.isExportDisabled).toBe(true)

    await act(async () => {
      await result.current.handleExport()
    })

    expect(download).not.toHaveBeenCalled()
    expect(mockToast.success).not.toHaveBeenCalled()
  })
})
