'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface AdminPaginationProps {
  currentPage: number
  totalPages: number
  totalCount: number
  onPageChange: (nextPage: number) => void
  // Used as `t(infoKey, { page, totalPages, totalCount })` — caller picks the
  // per-resource wording (productsPaginationInfo, ordersPaginationInfo, ...).
  infoKey: string
  prevLabelKey: string
  nextLabelKey: string
}

export function AdminPagination({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  infoKey,
  prevLabelKey,
  nextLabelKey,
}: AdminPaginationProps) {
  const t = useTranslations('admin')

  if (totalPages <= 1) return null

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {t(infoKey as Parameters<typeof t>[0], {
          page: currentPage,
          totalPages,
          totalCount,
        })}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          {t(prevLabelKey as Parameters<typeof t>[0])}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          {t(nextLabelKey as Parameters<typeof t>[0])}
        </Button>
      </div>
    </div>
  )
}
