import { describe, it, expect } from 'vitest'
import { buildPageUrl } from '../build-page-url'

describe('buildPageUrl()', () => {
  it('returns /shop with no query string when page is 1 and no filters', () => {
    expect(buildPageUrl({}, 1)).toBe('/shop')
  })

  it('omits the page param on page 1 to keep /shop as the canonical URL', () => {
    // SEO: /shop and /shop?page=1 must not be two separate indexed URLs
    const urlWithPage1 = buildPageUrl({}, 1)
    expect(urlWithPage1).not.toContain('page=')
  })

  it('adds page=2 when target page is 2', () => {
    expect(buildPageUrl({}, 2)).toBe('/shop?page=2')
  })

  it('adds page=5 when target page is 5', () => {
    expect(buildPageUrl({}, 5)).toBe('/shop?page=5')
  })

  it('preserves existing filter params alongside the page number', () => {
    const activeFilters = { categorySlug: 'rings', minPrice: '10' }

    const result = buildPageUrl(activeFilters, 3)

    expect(result).toContain('categorySlug=rings')
    expect(result).toContain('minPrice=10')
    expect(result).toContain('page=3')
  })

  it('removes page param when navigating back to page 1 with active filters', () => {
    const activeFilters = { categorySlug: 'earrings', page: '3' }

    const result = buildPageUrl(activeFilters, 1)

    expect(result).toContain('categorySlug=earrings')
    expect(result).not.toContain('page=')
  })

  it('replaces existing page param when navigating to a different page', () => {
    const activeFilters = { categorySlug: 'necklaces', page: '2' }

    const result = buildPageUrl(activeFilters, 4)

    expect(result).toContain('page=4')
    expect(result).not.toContain('page=2')
  })

  it('handles multiple active filters correctly on page 2', () => {
    const activeFilters = { categorySlug: 'bracelets', minPrice: '20', maxPrice: '100' }

    const result = buildPageUrl(activeFilters, 2)

    expect(result).toContain('categorySlug=bracelets')
    expect(result).toContain('minPrice=20')
    expect(result).toContain('maxPrice=100')
    expect(result).toContain('page=2')
  })
})
