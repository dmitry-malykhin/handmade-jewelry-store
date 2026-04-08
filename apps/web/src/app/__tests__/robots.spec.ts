import { describe, it, expect } from 'vitest'
import robots from '../robots'

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

  it('disallows admin, checkout, and cart paths', () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const wildcardRule = rules.find((rule) => rule.userAgent === '*')
    const disallowed = wildcardRule?.disallow ?? []
    const disallowedList = Array.isArray(disallowed) ? disallowed : [disallowed]

    expect(disallowedList).toContain('/admin/')
    expect(disallowedList).toContain('/checkout/')
    expect(disallowedList).toContain('/cart/')
  })

  it('includes sitemap URL pointing to /sitemap.xml', () => {
    const result = robots()
    expect(result.sitemap).toBeDefined()
    expect(String(result.sitemap)).toContain('/sitemap.xml')
  })
})
