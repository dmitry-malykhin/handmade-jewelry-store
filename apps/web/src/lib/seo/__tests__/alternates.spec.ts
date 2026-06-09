import { describe, it, expect } from 'vitest'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { buildLocaleAlternates } from '../alternates'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/seo')
  await $allureSubSuite('alternates')
  await $allureSeverity('normal')
})

describe('buildLocaleAlternates', () => {
  it('returns canonical and 4 alternates for a static page', () => {
    const result = buildLocaleAlternates('en', '/contact')

    expect(result.canonical).toBe('/en/contact')
    expect(result.languages).toEqual({
      en: '/en/contact',
      ru: '/ru/contact',
      es: '/es/contact',
      'x-default': '/en/contact',
    })
  })

  it('handles the locale root (empty path)', () => {
    const result = buildLocaleAlternates('ru', '')

    expect(result.canonical).toBe('/ru')
    expect(result.languages).toEqual({
      en: '/en',
      ru: '/ru',
      es: '/es',
      'x-default': '/en',
    })
  })

  it('interpolates a dynamic slug into all alternates', () => {
    const result = buildLocaleAlternates('es', '/products/silver-ring')

    expect(result.canonical).toBe('/es/products/silver-ring')
    expect(result.languages['x-default']).toBe('/en/products/silver-ring')
    expect(result.languages.es).toBe('/es/products/silver-ring')
  })

  it('omits canonical when locale is undefined (root layout default metadata)', () => {
    const result = buildLocaleAlternates(undefined, '')

    expect(result.canonical).toBeUndefined()
    expect(result.languages).toEqual({
      en: '/en',
      ru: '/ru',
      es: '/es',
      'x-default': '/en',
    })
  })

  it('x-default ALWAYS points to the default locale (en), not the current locale', () => {
    // Visiting Spanish page → x-default still points to /en
    const fromEs = buildLocaleAlternates('es', '/faq')
    expect(fromEs.languages['x-default']).toBe('/en/faq')

    // Visiting Russian page → x-default still points to /en
    const fromRu = buildLocaleAlternates('ru', '/faq')
    expect(fromRu.languages['x-default']).toBe('/en/faq')
  })

  it('emits exactly 4 language keys (3 locales + x-default)', () => {
    const result = buildLocaleAlternates('en', '/about')
    expect(Object.keys(result.languages).sort()).toEqual(['en', 'es', 'ru', 'x-default'])
  })
})
