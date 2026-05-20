import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../client'
import { downloadCsv } from '../csv-download'

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL
const originalFetch = global.fetch

describe('downloadCsv', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    global.fetch = originalFetch
  })

  it('calls fetch with the Bearer token and triggers a download', async () => {
    const blob = new Blob(['id,title\r\n1,Ring'], { type: 'text/csv' })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(blob),
    }) as typeof fetch

    await downloadCsv({
      path: '/api/admin/orders/export',
      accessToken: 'jwt-token',
      filename: 'orders-export',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/orders/export'),
      expect.objectContaining({ headers: { Authorization: 'Bearer jwt-token' } }),
    )
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    // Always revoke — leaked ObjectURLs hold the blob in memory.
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('appends .csv to the filename when missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob([''])),
    }) as typeof fetch

    const appendSpy = vi.spyOn(document.body, 'appendChild')

    await downloadCsv({
      path: '/api/admin/products/export',
      accessToken: 'jwt-token',
      filename: 'products-export',
    })

    const appendedAnchor = appendSpy.mock.calls[0]?.[0] as HTMLAnchorElement | undefined
    expect(appendedAnchor?.download).toBe('products-export.csv')

    appendSpy.mockRestore()
  })

  it('preserves the .csv extension when already present', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob([''])),
    }) as typeof fetch
    const appendSpy = vi.spyOn(document.body, 'appendChild')

    await downloadCsv({
      path: '/api/admin/orders/export',
      accessToken: 'jwt-token',
      filename: 'orders-2026.csv',
    })

    const appendedAnchor = appendSpy.mock.calls[0]?.[0] as HTMLAnchorElement | undefined
    expect(appendedAnchor?.download).toBe('orders-2026.csv')

    appendSpy.mockRestore()
  })

  it('throws ApiError when the server returns non-OK', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    }) as typeof fetch

    await expect(
      downloadCsv({ path: '/api/admin/orders/export', accessToken: 'bad', filename: 'x' }),
    ).rejects.toBeInstanceOf(ApiError)
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})
