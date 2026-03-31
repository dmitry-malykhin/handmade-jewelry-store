'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { ProductStatus } from '@jewelry/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { useAuthStore } from '@/store/auth.store'
import { fetchAdminProducts, updateProductStatus } from '@/lib/api/products'
import { ApiError } from '@/lib/api/client'
import type { AdminProductsQueryParams } from '@/lib/api/products'

const PRODUCT_STATUSES: ProductStatus[] = ['ACTIVE', 'DRAFT', 'ARCHIVED']
const PAGE_LIMIT = 20

type SortField = 'createdAt' | 'title' | 'price' | 'stock'
type SortOrder = 'asc' | 'desc'

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

  // Debounce search to avoid excessive API calls
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

  const { data, isPending: isProductsLoading } = useQuery({
    queryKey: ['admin', 'products', queryParams],
    queryFn: () => fetchAdminProducts(queryParams, accessToken ?? ''),
    enabled: accessToken !== null,
  })

  const statusMutation = useMutation({
    mutationFn: ({ productId, newStatus }: { productId: string; newStatus: ProductStatus }) =>
      updateProductStatus(productId, newStatus, accessToken ?? ''),
    onSuccess: (updatedProduct) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      toast.success(t('productsStatusUpdateSuccess', { title: updatedProduct.title }))
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t('productsStatusUpdateError')
      toast.error(message)
    },
  })

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

      {isProductsLoading ? (
        <p className="text-sm text-muted-foreground">{t('productsLoading')}</p>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      {t('productsEmpty')}
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((product) => (
                  <TableRow key={product.id}>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('productsPaginationInfo', {
                  page: currentPage,
                  totalPages,
                  totalCount: data?.meta.totalCount ?? 0,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((previousPage) => previousPage - 1)}
                  disabled={currentPage <= 1}
                >
                  {t('productsPaginationPrev')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((previousPage) => previousPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  {t('productsPaginationNext')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
