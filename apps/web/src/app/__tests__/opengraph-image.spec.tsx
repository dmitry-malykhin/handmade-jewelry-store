import { describe, it, expect, vi } from 'vitest'
import { size, contentType, runtime } from '../opengraph-image'

vi.mock('next/og', () => ({
  ImageResponse: class MockImageResponse {
    body = null
    constructor(
      public element: unknown,
      public options: unknown,
    ) {}
  },
}))

describe('opengraph-image', () => {
  it('exports edge runtime', () => {
    expect(runtime).toBe('edge')
  })

  it('exports correct OG image dimensions — 1200×630', () => {
    expect(size).toEqual({ width: 1200, height: 630 })
  })

  it('exports png content type', () => {
    expect(contentType).toBe('image/png')
  })

  it('default export returns an ImageResponse', async () => {
    const { default: OgImage } = await import('../opengraph-image')
    const { ImageResponse: MockImageResponse } = await import('next/og')
    const result = OgImage()
    expect(result).toBeInstanceOf(MockImageResponse)
  })

  it('ImageResponse is constructed with the correct size options', async () => {
    const { default: OgImage } = await import('../opengraph-image')
    const result = OgImage() as { options: unknown }
    expect(result.options).toEqual({ width: 1200, height: 630 })
  })
})
