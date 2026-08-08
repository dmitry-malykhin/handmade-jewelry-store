'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { Product, ProductsResponse, ProductStatus } from '@jewelry/shared'
import { useAuthStore } from '@/store/auth.store'
import {
  bulkUpdateAdminProducts,
  deleteAdminProduct,
  updateProductStatus,
  type BulkProductAction,
} from '@/lib/api/products'
import { ApiError } from '@/lib/api/client'
import { captureAdminError } from '@/lib/sentry/capture-admin-error'

type ProductsQuerySnapshot = Array<[ReadonlyArray<unknown>, ProductsResponse | undefined]>

export type ProductTableRow = Pick<Product, 'id' | 'slug' | 'title' | 'status'>

interface UseAdminProductsMutationsArgs {
  selectedIds: Set<string>
  onDeleteSuccess: () => void
  onBulkSuccess: () => void
}

export function useAdminProductsMutations({
  selectedIds,
  onDeleteSuccess,
  onBulkSuccess,
}: UseAdminProductsMutationsArgs) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const t = useTranslations('admin')

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
    onError: (error, variables, context) => {
      restoreProductsQueries(context?.previousProductsQueries)
      captureAdminError(error, {
        action: 'products.updateStatus',
        productId: variables.productId,
        newStatus: variables.newStatus,
      })
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
      onDeleteSuccess()
    },
    onError: (error, variables, context) => {
      restoreProductsQueries(context?.previousProductsQueries)
      captureAdminError(error, {
        action: 'products.delete',
        productId: variables.id,
        productSlug: variables.slug,
      })
      const message = error instanceof ApiError ? error.message : t('productsDeleteError')
      toast.error(message)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })

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
      onBulkSuccess()
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
    onError: (error, variables) => {
      captureAdminError(error, {
        action: 'products.bulk',
        bulkAction: variables.action,
        count: selectedIds.size,
      })
      const message = error instanceof ApiError ? error.message : t('productsBulkActionError')
      toast.error(message)
    },
  })

  return { statusMutation, deleteMutation, bulkMutation }
}
