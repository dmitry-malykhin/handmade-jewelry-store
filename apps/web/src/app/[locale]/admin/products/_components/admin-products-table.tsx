'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Download, Plus } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { ProductStatus } from '@jewelry/shared'
import { Button } from '@/components/ui/button'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { useAdminCsvExport } from '@/hooks/useAdminCsvExport'
import { useAdminListQuery } from '@/hooks/useAdminListQuery'
import {
  downloadAdminProductsCsv,
  fetchAdminProducts,
  type AdminProductsQueryParams,
  type BulkProductAction,
} from '@/lib/api/products'
import { AdminProductsBulkBar } from './admin-products-bulk-bar'
import {
  AdminProductsTableHeader,
  type SortField,
  type SortOrder,
} from './admin-products-table-header'
import { AdminProductsTableRow } from './admin-products-table-row'
import { AdminProductsToolbar } from './admin-products-toolbar'
import { DeleteProductDialog } from './delete-product-dialog'
import { useAdminProductsMutations, type ProductTableRow } from './useAdminProductsMutations'

const PAGE_LIMIT = 20

export function AdminProductsTable() {
  const t = useTranslations('admin')

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'ALL'>('ALL')
  const [sortBy, setSortBy] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [productToDelete, setProductToDelete] = useState<ProductTableRow | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [pendingBulkAction, setPendingBulkAction] = useState<BulkProductAction | null>(null)

  const { isExporting, isExportDisabled, handleExport } = useAdminCsvExport({
    download: downloadAdminProductsCsv,
  })

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    clearTimeout((handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer)
    ;(handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
      setDebouncedSearch(value)
      setCurrentPage(1)
    }, 400)
  }

  const queryParams: AdminProductsQueryParams = {
    page: currentPage,
    limit: PAGE_LIMIT,
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
    sortBy,
    sortOrder,
  }

  const { data, isPending: isProductsLoading } = useAdminListQuery({
    queryKey: ['admin', 'products'],
    queryParams,
    fetcher: fetchAdminProducts,
  })

  const { statusMutation, deleteMutation, bulkMutation } = useAdminProductsMutations({
    selectedIds,
    onDeleteSuccess: () => setProductToDelete(null),
    onBulkSuccess: () => {
      setSelectedIds(new Set())
      setPendingBulkAction(null)
    },
  })

  const currentPageProductIds = useMemo(
    () => data?.data.map((product) => product.id) ?? [],
    [data?.data],
  )

  // Reset selection on any queryParams shift — stale ids across pages confuse.
  useEffect(() => {
    setSelectedIds(new Set())
  }, [debouncedSearch, statusFilter, sortBy, sortOrder, currentPage])

  const selectedOnPageCount = currentPageProductIds.filter((productId) =>
    selectedIds.has(productId),
  ).length
  const allOnPageSelected =
    currentPageProductIds.length > 0 && selectedOnPageCount === currentPageProductIds.length
  const someOnPageSelected = selectedOnPageCount > 0 && !allOnPageSelected

  function toggleProductSelection(productId: string) {
    setSelectedIds((previousSet) => {
      const nextSet = new Set(previousSet)
      if (nextSet.has(productId)) {
        nextSet.delete(productId)
      } else {
        nextSet.add(productId)
      }
      return nextSet
    })
  }

  function toggleSelectAllOnPage() {
    setSelectedIds((previousSet) => {
      const nextSet = new Set(previousSet)
      if (allOnPageSelected) {
        currentPageProductIds.forEach((productId) => nextSet.delete(productId))
      } else {
        currentPageProductIds.forEach((productId) => nextSet.add(productId))
      }
      return nextSet
    })
  }

  // Every bulk action confirms — a 50-product misclick on Publish is silent
  // and effectively irreversible.
  function handleBulkActionClick(action: BulkProductAction) {
    if (selectedIds.size === 0) return
    setPendingBulkAction(action)
  }

  function handleBulkActionConfirm() {
    if (pendingBulkAction) bulkMutation.mutate({ action: pendingBulkAction })
  }

  function handleSortClick(field: SortField) {
    if (field === sortBy) {
      setSortOrder((previousOrder) => (previousOrder === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  const totalPages = data?.meta.totalPages ?? 1

  return (
    <section aria-labelledby="products-heading">
      <div className="mb-6 flex items-center justify-between">
        <h1 id="products-heading" className="text-2xl font-semibold text-foreground">
          {t('productsTitle')}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExportDisabled}
            onClick={handleExport}
          >
            <Download className="mr-2 size-4" aria-hidden="true" />
            {isExporting ? t('exportCsvInProgress') : t('exportCsvButton')}
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/products/new">
              <Plus className="mr-2 size-4" aria-hidden="true" />
              {t('productsNewButton')}
            </Link>
          </Button>
        </div>
      </div>

      <AdminProductsToolbar
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => {
          setStatusFilter(value)
          setCurrentPage(1)
        }}
      />

      <AdminProductsBulkBar
        selectedCount={selectedIds.size}
        onAction={handleBulkActionClick}
        onClear={() => setSelectedIds(new Set())}
        isPending={bulkMutation.isPending}
        pendingAction={pendingBulkAction}
        onConfirm={handleBulkActionConfirm}
        onCancelConfirm={() => setPendingBulkAction(null)}
      />

      {isProductsLoading ? (
        <p className="text-sm text-muted-foreground">{t('productsLoading')}</p>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <AdminProductsTableHeader
                allOnPageSelected={allOnPageSelected}
                someOnPageSelected={someOnPageSelected}
                onToggleSelectAll={toggleSelectAllOnPage}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortClick={handleSortClick}
              />
              <TableBody>
                {data?.data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      {t('productsEmpty')}
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((product) => (
                  <AdminProductsTableRow
                    key={product.id}
                    product={product}
                    isSelected={selectedIds.has(product.id)}
                    onToggleSelect={toggleProductSelection}
                    onStatusChange={(productId, newStatus) =>
                      statusMutation.mutate({ productId, newStatus })
                    }
                    onDeleteClick={setProductToDelete}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={data?.meta.totalCount ?? 0}
            onPageChange={setCurrentPage}
            infoKey="productsPaginationInfo"
            prevLabelKey="productsPaginationPrev"
            nextLabelKey="productsPaginationNext"
          />
        </>
      )}

      <DeleteProductDialog
        product={productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={() => {
          if (productToDelete) {
            deleteMutation.mutate(productToDelete)
          }
        }}
        isPending={deleteMutation.isPending}
      />
    </section>
  )
}
