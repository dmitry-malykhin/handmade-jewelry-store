import { describe, it, expect } from 'vitest'
import robots from '../robots'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/__tests__')
  await $allureSubSuite('robots')
  await $allureSeverity('normal')
})

describe('robots', () => {
  it('allows all user agents', () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    expect(rules.some((rule) => rule.userAgent === '*')).toBe(true)
  })

  it('allows root path', () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const wildcardRule = rules.find((rule) => rule.userAgent === '*')
    expect(wildcardRule?.allow).toContain('/')
  })

  it('disallows admin and API prefixes at root', () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const wildcardRule = rules.find((rule) => rule.userAgent === '*')
    const disallowed = wildcardRule?.disallow ?? []
    const disallowedList = Array.isArray(disallowed) ? disallowed : [disallowed]

    expect(disallowedList).toContain('/admin/')
    expect(disallowedList).toContain('/api/')
  })

  it('disallows locale-prefixed cart/checkout/account for every supported locale (#458)', () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const wildcardRule = rules.find((rule) => rule.userAgent === '*')
    const disallowed = wildcardRule?.disallow ?? []
    const disallowedList = Array.isArray(disallowed) ? disallowed : [disallowed]

    for (const locale of ['en', 'ru', 'es']) {
      expect(disallowedList).toContain(`/${locale}/cart/`)
      expect(disallowedList).toContain(`/${locale}/checkout/`)
      expect(disallowedList).toContain(`/${locale}/account/`)
    }
    expect(disallowedList).not.toContain('/cart/')
    expect(disallowedList).not.toContain('/checkout/')
    expect(disallowedList).not.toContain('/account/')
  })

  it('excludes crawl-budget-wasting sort and page query variants', () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const wildcardRule = rules.find((rule) => rule.userAgent === '*')
    const disallowed = wildcardRule?.disallow ?? []
    const disallowedList = Array.isArray(disallowed) ? disallowed : [disallowed]

    expect(disallowedList).toContain('/*?*sort=')
    expect(disallowedList).toContain('/*?*page=')
  })

  it('includes sitemap URL pointing to /sitemap.xml', () => {
    const result = robots()
    expect(result.sitemap).toBeDefined()
    expect(String(result.sitemap)).toContain('/sitemap.xml')
  })
})
