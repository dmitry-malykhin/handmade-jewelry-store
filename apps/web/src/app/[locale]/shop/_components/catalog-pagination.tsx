import { getTranslations } from 'next-intl/server'
import { buildPageUrl } from '@/lib/catalog/build-page-url'
import { PaginationArrowButton } from './pagination-arrow-button'

interface CatalogPaginationProps {
  currentPage: number
  totalPages: number
  searchParams: Record<string, string>
}

export async function CatalogPagination({
  currentPage,
  totalPages,
  searchParams,
}: CatalogPaginationProps) {
  const t = await getTranslations('catalog')

  if (totalPages <= 1) return null

  return (
    <nav aria-label={t('paginationLabel')} className="mt-8 flex items-center justify-center gap-4">
      <PaginationArrowButton
        href={currentPage > 1 ? buildPageUrl(searchParams, currentPage - 1) : null}
        ariaLabel={t('paginationPrevious')}
        symbol="←"
      />

      <span className="text-sm text-muted-foreground">
        {t('paginationInfo', { current: currentPage, total: totalPages })}
      </span>

      <PaginationArrowButton
        href={currentPage < totalPages ? buildPageUrl(searchParams, currentPage + 1) : null}
        ariaLabel={t('paginationNext')}
        symbol="→"
      />
    </nav>
  )
}
