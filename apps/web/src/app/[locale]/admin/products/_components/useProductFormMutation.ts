'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Product, ProductsResponse } from '@jewelry/shared'
import { useAuthStore } from '@/store/auth.store'
import { createAdminProduct, updateAdminProduct } from '@/lib/api/products'
import { ApiError } from '@/lib/api/client'
import type { CreateProductFormValues } from '../_lib/create-product-schema'

interface UseProductFormMutationArgs {
  mode: 'create' | 'edit'
  product: Product | undefined
}

export function useProductFormMutation({ mode, product }: UseProductFormMutationArgs) {
  const isCreate = mode === 'create'
  const t = useTranslations('admin')
  const router = useRouter()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)

  return useMutation({
    mutationFn: (formValues: CreateProductFormValues) => {
      const payload = {
        ...formValues,
        sku: formValues.sku || undefined,
        material: formValues.material || undefined,
      }
      if (mode === 'create') {
        return createAdminProduct(payload, accessToken ?? '')
      }
      if (!product) throw new Error('Edit mode requires a product')
      return updateAdminProduct(product.slug, payload, accessToken ?? '')
    },
    onMutate: async (formValues) => {
      if (isCreate || !product) return undefined

      await queryClient.cancelQueries({ queryKey: ['admin', 'products'] })
      const previousProductsQueries = queryClient.getQueriesData<ProductsResponse>({
        queryKey: ['admin', 'products'],
      })

      queryClient.setQueriesData<ProductsResponse>(
        { queryKey: ['admin', 'products'] },
        (currentData) => {
          if (!currentData) return currentData
          return {
            ...currentData,
            data: currentData.data.map((currentProduct) => {
              if (currentProduct.id !== product.id) return currentProduct
              return {
                ...currentProduct,
                title: formValues.title,
                slug: formValues.slug,
                price: formValues.price.toFixed(2),
                stock: formValues.stock,
                sku: formValues.sku || null,
                material: formValues.material || null,
                stockType: formValues.stockType ?? 'IN_STOCK',
                productionDays: formValues.productionDays ?? 0,
                lengthCm: formValues.lengthCm ?? null,
                widthCm: formValues.widthCm ?? null,
                heightCm: formValues.heightCm ?? null,
                diameterCm: formValues.diameterCm ?? null,
                weightGrams: formValues.weightGrams ?? null,
                beadSizeMm: formValues.beadSizeMm ?? null,
                categoryId: formValues.categoryId,
                images: formValues.images,
              }
            }),
          }
        },
      )

      return { previousProductsQueries }
    },
    onSuccess: (savedProduct) => {
      toast.success(
        t(isCreate ? 'productsCreateSuccess' : 'productsUpdateSuccess', {
          title: savedProduct.title,
        }),
      )
      router.push('/admin/products')
    },
    onError: (error, _variables, context) => {
      if (!isCreate && context?.previousProductsQueries) {
        context.previousProductsQueries.forEach(([queryKey, queryData]) => {
          queryClient.setQueryData(queryKey, queryData)
        })
      }
      const message =
        error instanceof ApiError
          ? error.message
          : t(isCreate ? 'productsCreateError' : 'productsUpdateError')
      toast.error(message)
    },
    onSettled: () => {
      if (!isCreate) {
        void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      }
    },
  })
}
