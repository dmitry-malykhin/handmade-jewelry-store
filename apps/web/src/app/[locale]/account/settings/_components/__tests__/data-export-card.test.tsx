import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '../../../../../../../messages/en.json'

const mockDownloadDataExport = vi.fn()
vi.mock('@/lib/api/users', () => ({
  downloadDataExport: (...args: unknown[]) => mockDownloadDataExport(...args),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string | null }) => unknown) =>
    selector({ accessToken: 'test-access-token' }),
}))

import { toast } from 'sonner'
import { DataExportCard } from '../data-export-card'
import {
  severity as $allureSeverity,
  subSuite as $allureSubSuite,
  suite as $allureSuite,
} from 'allure-js-commons'

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('data-export-card')
  await $allureSeverity('normal')
})

describe('DataExportCard (#559 GDPR Art. 15)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the heading, body copy, and download button', () => {
    renderWithIntl(<DataExportCard />)

    expect(screen.getByRole('heading', { name: /download your data/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download json/i })).toBeInTheDocument()
  })

  it('calls downloadDataExport with the access token and triggers an anchor click to save the blob', async () => {
    const blob = new Blob([JSON.stringify({ exportedAt: 'x' })], { type: 'application/json' })
    mockDownloadDataExport.mockResolvedValueOnce({
      blob,
      filename: 'senichka-data-export-u1-2026-11-02.json',
    })
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    renderWithIntl(<DataExportCard />)
    fireEvent.click(screen.getByRole('button', { name: /download json/i }))

    await waitFor(() => expect(mockDownloadDataExport).toHaveBeenCalledWith('test-access-token'))
    expect(createObjectUrlSpy).toHaveBeenCalledWith(blob)
    expect(anchorClickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:fake')
    expect(toast.success).toHaveBeenCalled()

    createObjectUrlSpy.mockRestore()
    revokeObjectUrlSpy.mockRestore()
    anchorClickSpy.mockRestore()
  })

  it('surfaces an error toast when the download fails', async () => {
    mockDownloadDataExport.mockRejectedValueOnce(new Error('offline'))

    renderWithIntl(<DataExportCard />)
    fireEvent.click(screen.getByRole('button', { name: /download json/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
  })
})
