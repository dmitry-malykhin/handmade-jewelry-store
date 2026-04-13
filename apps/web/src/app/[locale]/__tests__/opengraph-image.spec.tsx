import { describe, it, expect, vi } from 'vitest'
import messages from '../../../../messages/en.json'
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

vi.mock('next-intl/server', () => ({
  getTranslations: async (arg: string | { namespace: string; locale?: string }) => {
    const namespace = typeof arg === 'string' ? arg : arg.namespace
    const ns = (messages as Record<string, Record<string, string>>)[namespace] ?? {}
    return (key: string) => ns[key] ?? key
  },
}))

describe('locale opengraph-image', () => {
  it('exports edge runtime', () => {
    expect(runtime).toBe('edge')
  })

  it('exports correct OG image dimensions — 1200×630', () => {
    expect(size).toEqual({ width: 1200, height: 630 })
  })

  it('exports png content type', () => {
    expect(contentType).toBe('image/png')
  })

  it('generateAlt returns localised site title', async () => {
    const { generateAlt } = await import('../opengraph-image')
    const altText = await generateAlt({ params: Promise.resolve({ locale: 'en' }) })
    expect(altText).toBe(messages.metadata.title)
  })

  it('default export returns an ImageResponse', async () => {
    const { default: LocaleOgImage } = await import('../opengraph-image')
    const { ImageResponse } = await import('next/og')
    const result = await LocaleOgImage({ params: Promise.resolve({ locale: 'en' }) })
    expect(result).toBeInstanceOf(ImageResponse)
  })

  it('ImageResponse is constructed with correct size options', async () => {
    const { default: LocaleOgImage } = await import('../opengraph-image')
    const result = (await LocaleOgImage({
      params: Promise.resolve({ locale: 'en' }),
    })) as { options: unknown }
    expect(result.options).toEqual({ width: 1200, height: 630 })
  })
})
