'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'

export interface CatalogFiltersState {
  selectedCategory: string
  minPrice: string
  maxPrice: string
  sortValue: string
  hasActiveFilters: boolean
  isPending: boolean
}

export interface CatalogFiltersActions {
  updateFilter: (key: string, value: string) => void
  updateSort: (value: string) => void
  clearFilters: () => void
}

export function useCatalogFilters(): CatalogFiltersState & CatalogFiltersActions {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const selectedCategory = searchParams.get('categorySlug') ?? ''
  const minPrice = searchParams.get('minPrice') ?? ''
  const maxPrice = searchParams.get('maxPrice') ?? ''
  const sortValue = `${searchParams.get('sortBy') ?? 'createdAt'}_${searchParams.get('sortOrder') ?? 'desc'}`

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  function updateFilter(key: string, value: string) {
    updateParam(key, value)
  }

  function updateSort(value: string) {
    const parts = value.split('_')
    const field = parts[0] ?? 'createdAt'
    const order = parts[1] ?? 'desc'
    const params = new URLSearchParams(searchParams.toString())
    params.set('sortBy', field)
    params.set('sortOrder', order)
    params.delete('page')
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  function clearFilters() {
    startTransition(() => {
      router.push(pathname)
    })
  }

  return {
    selectedCategory,
    minPrice,
    maxPrice,
    sortValue,
    hasActiveFilters: Boolean(selectedCategory || minPrice || maxPrice),
    isPending,
    updateFilter,
    updateSort,
    clearFilters,
  }
}
