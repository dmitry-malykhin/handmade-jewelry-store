import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCatalogFilters } from '../hooks/use-catalog-filters'

const mockRouterPush = vi.fn()
let mockSearchParamsStore: Record<string, string> = {}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsStore[key] ?? null,
    toString: () => new URLSearchParams(mockSearchParamsStore).toString(),
  }),
  usePathname: () => '/en/shop',
}))

beforeEach(() => {
  mockRouterPush.mockClear()
  mockSearchParamsStore = {}
})

describe('useCatalogFilters — derived state from URL params', () => {
  it('returns empty strings when no search params are set', () => {
    const { result } = renderHook(() => useCatalogFilters())

    expect(result.current.selectedCategory).toBe('')
    expect(result.current.minPrice).toBe('')
    expect(result.current.maxPrice).toBe('')
  })

  it('reads selectedCategory from the categorySlug param', () => {
    mockSearchParamsStore = { categorySlug: 'rings' }

    const { result } = renderHook(() => useCatalogFilters())

    expect(result.current.selectedCategory).toBe('rings')
  })

  it('reads minPrice and maxPrice from URL params', () => {
    mockSearchParamsStore = { minPrice: '10', maxPrice: '200' }

    const { result } = renderHook(() => useCatalogFilters())

    expect(result.current.minPrice).toBe('10')
    expect(result.current.maxPrice).toBe('200')
  })

  it('builds sortValue as sortBy_sortOrder string', () => {
    mockSearchParamsStore = { sortBy: 'price', sortOrder: 'asc' }

    const { result } = renderHook(() => useCatalogFilters())

    expect(result.current.sortValue).toBe('price_asc')
  })

  it('defaults sortValue to createdAt_desc when no sort params are set', () => {
    const { result } = renderHook(() => useCatalogFilters())

    expect(result.current.sortValue).toBe('createdAt_desc')
  })
})

describe('useCatalogFilters — hasActiveFilters', () => {
  it('returns false when no filters are set', () => {
    const { result } = renderHook(() => useCatalogFilters())

    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('returns true when categorySlug is set', () => {
    mockSearchParamsStore = { categorySlug: 'earrings' }

    const { result } = renderHook(() => useCatalogFilters())

    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('returns true when minPrice is set', () => {
    mockSearchParamsStore = { minPrice: '50' }

    const { result } = renderHook(() => useCatalogFilters())

    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('returns true when maxPrice is set', () => {
    mockSearchParamsStore = { maxPrice: '300' }

    const { result } = renderHook(() => useCatalogFilters())

    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('returns false when only sort params are set (sort is not a filter)', () => {
    mockSearchParamsStore = { sortBy: 'price', sortOrder: 'asc' }

    const { result } = renderHook(() => useCatalogFilters())

    expect(result.current.hasActiveFilters).toBe(false)
  })
})

describe('useCatalogFilters — updateFilter()', () => {
  it('calls router.push with the new filter param added', () => {
    const { result } = renderHook(() => useCatalogFilters())

    act(() => {
      result.current.updateFilter('categorySlug', 'bracelets')
    })

    expect(mockRouterPush).toHaveBeenCalledOnce()
    const pushedUrl = mockRouterPush.mock.calls[0][0] as string
    expect(pushedUrl).toContain('categorySlug=bracelets')
  })

  it('removes the filter param from the URL when value is empty string', () => {
    mockSearchParamsStore = { categorySlug: 'rings' }

    const { result } = renderHook(() => useCatalogFilters())

    act(() => {
      result.current.updateFilter('categorySlug', '')
    })

    const pushedUrl = mockRouterPush.mock.calls[0][0] as string
    expect(pushedUrl).not.toContain('categorySlug')
  })

  it('resets pagination by removing the page param on filter change', () => {
    mockSearchParamsStore = { categorySlug: 'rings', page: '3' }

    const { result } = renderHook(() => useCatalogFilters())

    act(() => {
      result.current.updateFilter('minPrice', '20')
    })

    const pushedUrl = mockRouterPush.mock.calls[0][0] as string
    expect(pushedUrl).not.toContain('page=')
  })

  it('preserves existing unrelated params when updating one filter', () => {
    mockSearchParamsStore = { minPrice: '10' }

    const { result } = renderHook(() => useCatalogFilters())

    act(() => {
      result.current.updateFilter('maxPrice', '100')
    })

    const pushedUrl = mockRouterPush.mock.calls[0][0] as string
    expect(pushedUrl).toContain('minPrice=10')
    expect(pushedUrl).toContain('maxPrice=100')
  })
})

describe('useCatalogFilters — updateSort()', () => {
  it('sets sortBy and sortOrder from a combined "field_order" string', () => {
    const { result } = renderHook(() => useCatalogFilters())

    act(() => {
      result.current.updateSort('price_asc')
    })

    const pushedUrl = mockRouterPush.mock.calls[0][0] as string
    expect(pushedUrl).toContain('sortBy=price')
    expect(pushedUrl).toContain('sortOrder=asc')
  })

  it('sets sortBy=avgRating and sortOrder=desc for top-rated sort', () => {
    const { result } = renderHook(() => useCatalogFilters())

    act(() => {
      result.current.updateSort('avgRating_desc')
    })

    const pushedUrl = mockRouterPush.mock.calls[0][0] as string
    expect(pushedUrl).toContain('sortBy=avgRating')
    expect(pushedUrl).toContain('sortOrder=desc')
  })

  it('resets pagination by removing the page param on sort change', () => {
    mockSearchParamsStore = { page: '2' }

    const { result } = renderHook(() => useCatalogFilters())

    act(() => {
      result.current.updateSort('price_desc')
    })

    const pushedUrl = mockRouterPush.mock.calls[0][0] as string
    expect(pushedUrl).not.toContain('page=')
  })
})

describe('useCatalogFilters — clearFilters()', () => {
  it('navigates to the bare pathname with no query string', () => {
    mockSearchParamsStore = { categorySlug: 'rings', minPrice: '10', page: '2' }

    const { result } = renderHook(() => useCatalogFilters())

    act(() => {
      result.current.clearFilters()
    })

    expect(mockRouterPush).toHaveBeenCalledWith('/en/shop')
  })
})
