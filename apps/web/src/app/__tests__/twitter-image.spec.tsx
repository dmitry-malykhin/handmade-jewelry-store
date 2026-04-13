import { describe, it, expect, vi } from 'vitest'
import { size, contentType, runtime, alt } from '../twitter-image'

vi.mock('next/og', () => ({
  ImageResponse: class MockImageResponse {
    body = null
    constructor(
      public element: unknown,
      public options: unknown,
    ) {}
  },
}))

describe('twitter-image', () => {
  it('exports edge runtime', () => {
    expect(runtime).toBe('edge')
  })

  it('exports Twitter-optimised dimensions — 1200×628', () => {
    // Twitter cards require 628px height (not the OG standard 630px)
    expect(size).toEqual({ width: 1200, height: 628 })
  })

  it('exports png content type', () => {
    expect(contentType).toBe('image/png')
  })

  it('exports a descriptive alt text', () => {
    expect(typeof alt).toBe('string')
    expect(alt.length).toBeGreaterThan(10)
  })

  it('default export returns an ImageResponse', async () => {
    const { default: TwitterImage } = await import('../twitter-image')
    const { ImageResponse } = await import('next/og')
    const result = TwitterImage()
    expect(result).toBeInstanceOf(ImageResponse)
  })

  it('ImageResponse is constructed with the correct size options', async () => {
    const { default: TwitterImage } = await import('../twitter-image')
    const result = TwitterImage() as { options: unknown }
    expect(result.options).toEqual({ width: 1200, height: 628 })
  })
})
