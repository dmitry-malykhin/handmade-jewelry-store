import { describe, it, expect, vi } from 'vitest'
import { size, contentType, runtime } from '../apple-icon'

vi.mock('next/og', () => ({
  ImageResponse: class MockImageResponse {
    body = null
    constructor(
      public element: unknown,
      public options: unknown,
    ) {}
  },
}))

describe('apple-icon', () => {
  it('exports edge runtime', () => {
    expect(runtime).toBe('edge')
  })

  it('exports Apple touch icon dimensions — 180×180', () => {
    // Apple requires exactly 180×180 for home screen icons
    expect(size).toEqual({ width: 180, height: 180 })
  })

  it('exports png content type', () => {
    expect(contentType).toBe('image/png')
  })

  it('default export returns an ImageResponse', async () => {
    const { default: AppleIcon } = await import('../apple-icon')
    const { ImageResponse } = await import('next/og')
    const result = AppleIcon()
    expect(result).toBeInstanceOf(ImageResponse)
  })

  it('ImageResponse is constructed with the correct 180×180 size options', async () => {
    const { default: AppleIcon } = await import('../apple-icon')
    const result = AppleIcon() as { options: unknown }
    expect(result.options).toEqual({ width: 180, height: 180 })
  })
})
