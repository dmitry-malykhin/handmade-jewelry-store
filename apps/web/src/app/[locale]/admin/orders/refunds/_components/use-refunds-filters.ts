'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { AdminRefundsQueryParams, RefundReason } from '@/lib/api/orders'

const REFUND_REASONS: readonly RefundReason[] = [
  'ITEM_DAMAGED',
  'ITEM_NOT_AS_DESCRIBED',
  'CUSTOMER_CHANGED_MIND',
  'DUPLICATE_ORDER',
  'OTHER',
]

function isRefundReason(value: string): value is RefundReason {
  return (REFUND_REASONS as readonly string[]).includes(value)
}

// Filters live in the URL so they survive refresh + share.
export function useRefundsFilters(): {
  filters: AdminRefundsQueryParams
  setFilter: (key: keyof AdminRefundsQueryParams, value: string) => void
  clearFilters: () => void
  hasActiveFilters: boolean
} {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = useMemo<AdminRefundsQueryParams>(() => {
    const reason = searchParams.get('reason') ?? ''
    return {
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      reason: reason && isRefundReason(reason) ? reason : undefined,
      customer: searchParams.get('customer') ?? undefined,
    }
  }, [searchParams])

  const setFilter = useCallback(
    (key: keyof AdminRefundsQueryParams, value: string) => {
      const next = new URLSearchParams(searchParams.toString())
      if (value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
      // `replace` — filter tweaks shouldn't grow browser history.
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  const hasActiveFilters = Boolean(filters.from || filters.to || filters.reason || filters.customer)

  return { filters, setFilter, clearFilters, hasActiveFilters }
}

export { REFUND_REASONS }
