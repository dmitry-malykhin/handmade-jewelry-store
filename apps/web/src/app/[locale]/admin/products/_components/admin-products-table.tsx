'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { toast } from 'sonner'
import type { Product, ProductsResponse, ProductStatus } from '@jewelry/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdminCsvExport } from '@/hooks/useAdminCsvExport'
import { useAdminListQuery } from '@/hooks/useAdminListQuery'
import { useAuthStore } from '@/store/auth.store'
import {
  bulkUpdateAdminProducts,
  deleteAdminProduct,
  downloadAdminProductsCsv,
  fetchAdminProducts,
  updateProductStatus,
  type AdminProductsQueryParams,
  type BulkProductAction,
} from '@/lib/api/products'
import { ApiError } from '@/lib/api/client'
import { DeleteProductDialog } from './delete-product-dialog'

const PRODUCT_STATUSES: ProductStatus[] = ['ACTIVE', 'DRAFT', 'ARCHIVED']
const PAGE_LIMIT = 20

type SortField = 'createdAt' | 'title' | 'price' | 'stock'
type SortOrder = 'asc' | 'desc'
type ProductTableRow = Pick<Product, 'id' | 'slug' | 'title' | 'status'>

type ProductsQuerySnapshot = Array<[ReadonlyArray<unknown>, ProductsResponse | undefined]>

function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const variantMap: Record<ProductStatus, 'default' | 'secondary' | 'outline'> = {
    ACTIVE: 'default',
    DRAFT: 'secondary',
    ARCHIVED: 'outline',
  }
  return <Badge variant={variantMap[status]}>{status}</Badge>
}

function SortIcon({
  field,
  currentField,
  currentOrder,
}: {
  field: SortField
  currentField: SortField
  currentOrder: SortOrder
}) {
  if (field !== currentField) return <ChevronsUpDown className="ml-1 inline size-3 opacity-50" />
  return currentOrder === 'asc' ? (
    <ChevronUp className="ml-1 inline size-3" />
  ) : (
    <ChevronDown className="ml-1 inline size-3" />
  )
}

export function AdminProductsTable() {
  const t = useTranslations('admin')
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)

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

  const updateAdminProductsQueries = (
    updater: (currentData: ProductsResponse) => ProductsResponse,
  ): void => {
    queryClient.setQueriesData<ProductsResponse>(
      { queryKey: ['admin', 'products'] },
      (currentData) => (currentData ? updater(currentData) : currentData),
    )
  }

  const restoreProductsQueries = (querySnapshots: ProductsQuerySnapshot | undefined): void => {
    querySnapshots?.forEach(([queryKey, queryData]) => {
      queryClient.setQueryData(queryKey, queryData)
    })
  }

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

  const statusMutation = useMutation({
    mutationFn: ({ productId, newStatus }: { productId: string; newStatus: ProductStatus }) =>
      updateProductStatus(productId, newStatus, accessToken ?? ''),
    onMutate: async ({ productId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'products'] })
      const previousProductsQueries = queryClient.getQueriesData<ProductsResponse>({
        queryKey: ['admin', 'products'],
      })

      updateAdminProductsQueries((currentData) => ({
        ...currentData,
        data: currentData.data.map((product) =>
          product.id === productId ? { ...product, status: newStatus } : product,
        ),
      }))

      return { previousProductsQueries }
    },
    onSuccess: (updatedProduct) => {
      toast.success(t('productsStatusUpdateSuccess', { title: updatedProduct.title }))
    },
    onError: (error, _variables, context) => {
      restoreProductsQueries(context?.previousProductsQueries)
      const message = error instanceof ApiError ? error.message : t('productsStatusUpdateError')
      toast.error(message)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (product: ProductTableRow) => deleteAdminProduct(product.slug, accessToken ?? ''),
    onMutate: async (product) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'products'] })
      const previousProductsQueries = queryClient.getQueriesData<ProductsResponse>({
        queryKey: ['admin', 'products'],
      })

      updateAdminProductsQueries((currentData) => {
        const updatedRows = currentData.data.filter(
          (currentProduct) => currentProduct.id !== product.id,
        )

        if (updatedRows.length === currentData.data.length) {
          return currentData
        }

        const nextTotalCount = Math.max(0, currentData.meta.totalCount - 1)

        return {
          ...currentData,
          data: updatedRows,
          meta: {
            ...currentData.meta,
            totalCount: nextTotalCount,
            totalPages: Math.ceil(nextTotalCount / currentData.meta.limit),
          },
        }
      })

      return { previousProductsQueries }
    },
    onSuccess: () => {
      toast.success(t('productsDeleteSuccess'))
      setProductToDelete(null)
    },
    onError: (error, _variables, context) => {
      restoreProductsQueries(context?.previousProductsQueries)
      const message = error instanceof ApiError ? error.message : t('productsDeleteError')
      toast.error(message)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
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

  function clearSelection() {
    setSelectedIds(new Set())
  }

  const bulkMutation = useMutation({
    mutationFn: ({ action }: { action: BulkProductAction }) =>
      bulkUpdateAdminProducts({ ids: Array.from(selectedIds), action }, accessToken ?? ''),
    onSuccess: (result) => {
      const requested = selectedIds.size
      if (result.affectedCount < requested) {
        toast.success(
          t('productsBulkActionPartial', {
            affected: result.affectedCount,
            requested,
          }),
        )
      } else {
        toast.success(t('productsBulkActionSuccess', { count: result.affectedCount }))
      }
      clearSelection()
      setPendingBulkAction(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t('productsBulkActionError')
      toast.error(message)
    },
  })

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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1" style={{ minWidth: '200px', maxWidth: '320px' }}>
          <Search
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t('productsSearchPlaceholder')}
            value={searchQuery}
            onChange={(changeEvent) => handleSearchChange(changeEvent.target.value)}
            className="pl-9"
            aria-label={t('productsSearchAriaLabel')}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as ProductStatus | 'ALL')
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-40" aria-label={t('productsStatusFilterAriaLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('productsStatusAll')}</SelectItem>
            {PRODUCT_STATUSES.map((productStatus) => (
              <SelectItem key={productStatus} value={productStatus}>
                {t(`productsStatus${productStatus}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedIds.size > 0 && (
        <div
          className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-border bg-accent/40 px-4 py-2"
          role="region"
          aria-label={t('productsBulkSelectedCount', { count: selectedIds.size })}
        >
          <span className="text-sm font-medium text-foreground">
            {t('productsBulkSelectedCount', { count: selectedIds.size })}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={bulkMutation.isPending}
              onClick={() => handleBulkActionClick('publish')}
            >
              {t('productsBulkActionPublish')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={bulkMutation.isPending}
              onClick={() => handleBulkActionClick('draft')}
            >
              {t('productsBulkActionDraft')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={bulkMutation.isPending}
              onClick={() => handleBulkActionClick('delete')}
            >
              {t('productsBulkActionDelete')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={bulkMutation.isPending}
              onClick={clearSelection}
            >
              {t('productsBulkActionClear')}
            </Button>
          </div>
        </div>
      )}

      {isProductsLoading ? (
        <p className="text-sm text-muted-foreground">{t('productsLoading')}</p>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      ref={(node) => {
                        // Indeterminate state can only be set imperatively.
                        if (node) node.indeterminate = someOnPageSelected
                      }}
                      onChange={toggleSelectAllOnPage}
                      aria-label={t('productsBulkSelectAllAriaLabel')}
                      className="size-4 cursor-pointer rounded border-border accent-primary"
                    />
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-sm font-medium"
                      onClick={() => handleSortClick('title')}
                      type="button"
                    >
                      {t('productsColTitle')}
                      <SortIcon field="title" currentField={sortBy} currentOrder={sortOrder} />
                    </button>
                  </TableHead>
                  <TableHead>{t('productsColStatus')}</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-sm font-medium"
                      onClick={() => handleSortClick('price')}
                      type="button"
                    >
                      {t('productsColPrice')}
                      <SortIcon field="price" currentField={sortBy} currentOrder={sortOrder} />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-sm font-medium"
                      onClick={() => handleSortClick('stock')}
                      type="button"
                    >
                      {t('productsColStock')}
                      <SortIcon field="stock" currentField={sortBy} currentOrder={sortOrder} />
                    </button>
                  </TableHead>
                  <TableHead>{t('productsColSku')}</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-sm font-medium"
                      onClick={() => handleSortClick('createdAt')}
                      type="button"
                    >
                      {t('productsColCreatedAt')}
                      <SortIcon field="createdAt" currentField={sortBy} currentOrder={sortOrder} />
                    </button>
                  </TableHead>
                  <TableHead className="w-24 text-right">{t('productsColActions')}</TableHead>
                </TableRow>
              </TableHeader>
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
                  <TableRow
                    key={product.id}
                    data-state={selectedIds.has(product.id) ? 'selected' : undefined}
                  >
                    <TableCell className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        aria-label={t('productsBulkSelectRowAriaLabel', { title: product.title })}
                        className="size-4 cursor-pointer rounded border-border accent-primary"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{product.title}</p>
                        <p className="text-xs text-muted-foreground">{product.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={t('productsChangeStatusAriaLabel', {
                              title: product.title,
                            })}
                            className="cursor-pointer"
                          >
                            <ProductStatusBadge status={product.status} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {PRODUCT_STATUSES.filter(
                            (productStatus) => productStatus !== product.status,
                          ).map((productStatus) => (
                            <DropdownMenuItem
                              key={productStatus}
                              onClick={() =>
                                statusMutation.mutate({
                                  productId: product.id,
                                  newStatus: productStatus,
                                })
                              }
                            >
                              {t(`productsStatusChangeTo`, {
                                status: t(`productsStatus${productStatus}`),
                              })}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <data value={product.price}>${Number(product.price).toFixed(2)}</data>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.stock}</TableCell>
                    <TableCell>
                      {product.sku ? (
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {product.sku}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link
                            href={`/admin/products/${product.slug}/edit`}
                            aria-label={t('productsEditAriaLabel', { title: product.title })}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setProductToDelete({
                              id: product.id,
                              slug: product.slug,
                              title: product.title,
                              status: product.status,
                            })
                          }
                          aria-label={t('productsDeleteAriaLabel', { title: product.title })}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
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

      <ConfirmDialog
        open={pendingBulkAction !== null}
        onClose={() => setPendingBulkAction(null)}
        onConfirm={handleBulkActionConfirm}
        isPending={bulkMutation.isPending}
        confirmVariant={pendingBulkAction === 'delete' ? 'destructive' : 'default'}
        title={
          pendingBulkAction === 'delete'
            ? t('productsBulkDeleteModalTitle', { count: selectedIds.size })
            : pendingBulkAction === 'publish'
              ? t('productsBulkConfirmPublishTitle', { count: selectedIds.size })
              : pendingBulkAction === 'draft'
                ? t('productsBulkConfirmDraftTitle', { count: selectedIds.size })
                : ''
        }
        description={
          pendingBulkAction === 'delete'
            ? t('productsBulkDeleteModalDescription')
            : pendingBulkAction === 'publish'
              ? t('productsBulkConfirmPublishDescription')
              : pendingBulkAction === 'draft'
                ? t('productsBulkConfirmDraftDescription')
                : ''
        }
        confirmLabel={
          pendingBulkAction === 'delete'
            ? t('productsBulkDeleteConfirm')
            : pendingBulkAction === 'publish'
              ? t('productsBulkConfirmPublishAction')
              : pendingBulkAction === 'draft'
                ? t('productsBulkConfirmDraftAction')
                : t('confirmDialogConfirm')
        }
        cancelLabel={t('productsBulkDeleteCancel')}
      />
    </section>
  )
}
