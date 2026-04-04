'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Category, Product, ProductsResponse } from '@jewelry/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/store/auth.store'
import { updateAdminProduct } from '@/lib/api/products'
import { ApiError } from '@/lib/api/client'
import { ProductImageUpload } from '../../../_components/product-image-upload'
import {
  createProductSchema,
  STOCK_TYPES,
  type CreateProductFormValues,
} from '../../../_lib/create-product-schema'

interface EditProductFormProps {
  categories: Category[]
  product: Product
}

function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function FormField({
  label,
  error,
  children,
  hint,
}: {
  label: string
  error?: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function EditProductForm({ categories, product }: EditProductFormProps) {
  const t = useTranslations('admin')
  const router = useRouter()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const [isDimensionsOpen, setIsDimensionsOpen] = useState(
    product.lengthCm !== null ||
      product.widthCm !== null ||
      product.heightCm !== null ||
      product.diameterCm !== null ||
      product.weightGrams !== null ||
      product.beadSizeMm !== null,
  )
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false)
  const slugDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      title: product.title,
      description: product.description,
      price: Number(product.price),
      stock: product.stock,
      images: product.images,
      slug: product.slug,
      categoryId: product.categoryId,
      sku: product.sku ?? '',
      material: product.material ?? '',
      stockType: product.stockType,
      productionDays: product.productionDays,
      lengthCm: product.lengthCm ?? undefined,
      widthCm: product.widthCm ?? undefined,
      heightCm: product.heightCm ?? undefined,
      diameterCm: product.diameterCm ?? undefined,
      weightGrams: product.weightGrams ?? undefined,
      beadSizeMm: product.beadSizeMm ?? undefined,
    },
  })

  const watchedTitle = watch('title')
  const watchedStockType = watch('stockType')

  // Auto-generate slug from title with 400ms debounce
  useEffect(() => {
    if (isSlugManuallyEdited || !watchedTitle) return

    if (slugDebounceTimerRef.current) clearTimeout(slugDebounceTimerRef.current)

    slugDebounceTimerRef.current = setTimeout(() => {
      setValue('slug', generateSlugFromTitle(watchedTitle), { shouldValidate: true })
    }, 400)

    return () => {
      if (slugDebounceTimerRef.current) clearTimeout(slugDebounceTimerRef.current)
    }
  }, [watchedTitle, isSlugManuallyEdited, setValue])

  const updateProductMutation = useMutation({
    mutationFn: (formValues: CreateProductFormValues) => {
      const payload = {
        ...formValues,
        // Convert empty strings to undefined for optional fields
        sku: formValues.sku || undefined,
        material: formValues.material || undefined,
      }
      return updateAdminProduct(product.slug, payload, accessToken ?? '')
    },
    onMutate: async (formValues) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'products'] })
      const previousProductsQueries = queryClient.getQueriesData<ProductsResponse>({
        queryKey: ['admin', 'products'],
      })

      queryClient.setQueriesData<ProductsResponse>(
        { queryKey: ['admin', 'products'] },
        (currentData) => {
          if (!currentData) {
            return currentData
          }

          return {
            ...currentData,
            data: currentData.data.map((currentProduct) => {
              if (currentProduct.id !== product.id) {
                return currentProduct
              }

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
    onSuccess: (updatedProduct) => {
      toast.success(t('productsUpdateSuccess', { title: updatedProduct.title }))
      router.push('/admin/products')
    },
    onError: (error, _variables, context) => {
      context?.previousProductsQueries.forEach(([queryKey, queryData]) => {
        queryClient.setQueryData(queryKey, queryData)
      })

      const message = error instanceof ApiError ? error.message : t('productsUpdateError')
      toast.error(message)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })

  const handleFormSubmit = useCallback(
    (formValues: CreateProductFormValues) => {
      updateProductMutation.mutate(formValues)
    },
    [updateProductMutation],
  )

  const isFormDisabled = isSubmitting || updateProductMutation.isPending

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <div className="space-y-8">
        <section aria-labelledby="section-basic-info">
          <h2 id="section-basic-info" className="mb-4 text-base font-semibold text-foreground">
            {t('productsFormSectionBasic')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label={t('productsFormFieldTitle')} error={errors.title?.message}>
                <Input
                  {...register('title')}
                  placeholder={t('productsFormFieldTitlePlaceholder')}
                  aria-invalid={!!errors.title}
                  disabled={isFormDisabled}
                />
              </FormField>
            </div>

            <div className="sm:col-span-2">
              <FormField
                label={t('productsFormFieldDescription')}
                error={errors.description?.message}
              >
                <Textarea
                  {...register('description')}
                  aria-label={t('productsFormFieldDescription')}
                  placeholder={t('productsFormFieldDescriptionPlaceholder')}
                  rows={5}
                  aria-invalid={!!errors.description}
                  disabled={isFormDisabled}
                />
              </FormField>
            </div>

            <FormField
              label={t('productsFormFieldSlug')}
              error={errors.slug?.message}
              hint={t('productsFormFieldSlugHint')}
            >
              <Input
                {...register('slug', {
                  onChange: () => setIsSlugManuallyEdited(true),
                })}
                aria-label={t('productsFormFieldSlug')}
                placeholder="northern-lights-bracelet"
                aria-invalid={!!errors.slug}
                disabled={isFormDisabled}
              />
            </FormField>

            <FormField label={t('productsFormFieldSku')} error={errors.sku?.message}>
              <Input
                {...register('sku')}
                placeholder="SKU-001"
                aria-invalid={!!errors.sku}
                disabled={isFormDisabled}
              />
            </FormField>
          </div>
        </section>

        <section aria-labelledby="section-pricing">
          <h2 id="section-pricing" className="mb-4 text-base font-semibold text-foreground">
            {t('productsFormSectionPricing')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <FormField label={t('productsFormFieldPrice')} error={errors.price?.message}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  {...register('price', { valueAsNumber: true })}
                  aria-label={t('productsFormFieldPrice')}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="49.99"
                  className="pl-7"
                  aria-invalid={!!errors.price}
                  disabled={isFormDisabled}
                />
              </div>
            </FormField>

            <FormField label={t('productsFormFieldStock')} error={errors.stock?.message}>
              <Input
                {...register('stock', { valueAsNumber: true })}
                aria-label={t('productsFormFieldStock')}
                type="number"
                min="0"
                step="1"
                placeholder="0"
                aria-invalid={!!errors.stock}
                disabled={isFormDisabled}
              />
            </FormField>

            <FormField label={t('productsFormFieldStockType')} error={errors.stockType?.message}>
              <Controller
                name="stockType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isFormDisabled}
                  >
                    <SelectTrigger aria-invalid={!!errors.stockType}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STOCK_TYPES.map((stockTypeOption) => (
                        <SelectItem key={stockTypeOption} value={stockTypeOption}>
                          {t(`productsFormStockType${stockTypeOption}` as Parameters<typeof t>[0])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {watchedStockType === 'MADE_TO_ORDER' && (
              <FormField
                label={t('productsFormFieldProductionDays')}
                error={errors.productionDays?.message}
                hint={t('productsFormFieldProductionDaysHint')}
              >
                <Input
                  {...register('productionDays', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  max="365"
                  placeholder="7"
                  aria-invalid={!!errors.productionDays}
                  disabled={isFormDisabled}
                />
              </FormField>
            )}
          </div>
        </section>

        <section aria-labelledby="section-category">
          <h2 id="section-category" className="mb-4 text-base font-semibold text-foreground">
            {t('productsFormSectionDetails')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('productsFormFieldCategory')} error={errors.categoryId?.message}>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isFormDisabled}
                  >
                    <SelectTrigger
                      aria-label={t('productsFormFieldCategory')}
                      aria-invalid={!!errors.categoryId}
                    >
                      <SelectValue placeholder={t('productsFormFieldCategoryPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label={t('productsFormFieldMaterial')} error={errors.material?.message}>
              <Input
                {...register('material')}
                placeholder={t('productsFormFieldMaterialPlaceholder')}
                aria-invalid={!!errors.material}
                disabled={isFormDisabled}
              />
            </FormField>
          </div>
        </section>

        <section aria-labelledby="section-dimensions">
          <button
            type="button"
            id="section-dimensions"
            className="flex w-full items-center justify-between text-base font-semibold text-foreground"
            aria-expanded={isDimensionsOpen}
            onClick={() => setIsDimensionsOpen((prev) => !prev)}
          >
            {t('productsFormSectionDimensions')}
            {isDimensionsOpen ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </button>

          {isDimensionsOpen && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <FormField
                label={t('productsFormFieldLengthCm')}
                error={errors.lengthCm?.message}
                hint={t('productsFormDimensionHint')}
              >
                <Input
                  {...register('lengthCm', {
                    valueAsNumber: true,
                    setValueAs: (value) => (value === '' ? undefined : Number(value)),
                  })}
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="45.0"
                  aria-invalid={!!errors.lengthCm}
                  disabled={isFormDisabled}
                />
              </FormField>

              <FormField label={t('productsFormFieldWidthCm')} error={errors.widthCm?.message}>
                <Input
                  {...register('widthCm', {
                    valueAsNumber: true,
                    setValueAs: (value) => (value === '' ? undefined : Number(value)),
                  })}
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="1.5"
                  aria-invalid={!!errors.widthCm}
                  disabled={isFormDisabled}
                />
              </FormField>

              <FormField label={t('productsFormFieldHeightCm')} error={errors.heightCm?.message}>
                <Input
                  {...register('heightCm', {
                    valueAsNumber: true,
                    setValueAs: (value) => (value === '' ? undefined : Number(value)),
                  })}
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="2.0"
                  aria-invalid={!!errors.heightCm}
                  disabled={isFormDisabled}
                />
              </FormField>

              <FormField
                label={t('productsFormFieldDiameterCm')}
                error={errors.diameterCm?.message}
              >
                <Input
                  {...register('diameterCm', {
                    valueAsNumber: true,
                    setValueAs: (value) => (value === '' ? undefined : Number(value)),
                  })}
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="7.0"
                  aria-invalid={!!errors.diameterCm}
                  disabled={isFormDisabled}
                />
              </FormField>

              <FormField
                label={t('productsFormFieldWeightGrams')}
                error={errors.weightGrams?.message}
              >
                <Input
                  {...register('weightGrams', {
                    valueAsNumber: true,
                    setValueAs: (value) => (value === '' ? undefined : Number(value)),
                  })}
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="12.5"
                  aria-invalid={!!errors.weightGrams}
                  disabled={isFormDisabled}
                />
              </FormField>

              <FormField
                label={t('productsFormFieldBeadSizeMm')}
                error={errors.beadSizeMm?.message}
              >
                <Input
                  {...register('beadSizeMm', {
                    valueAsNumber: true,
                    setValueAs: (value) => (value === '' ? undefined : Number(value)),
                  })}
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="6.0"
                  aria-invalid={!!errors.beadSizeMm}
                  disabled={isFormDisabled}
                />
              </FormField>
            </div>
          )}
        </section>

        <section aria-labelledby="section-images">
          <h2 id="section-images" className="mb-4 text-base font-semibold text-foreground">
            {t('productsFormSectionImages')}
          </h2>
          <Controller
            name="images"
            control={control}
            render={({ field }) => (
              <ProductImageUpload
                onImagesChange={field.onChange}
                initialImageUrls={product.images}
                errorMessage={
                  errors.images?.message ??
                  (errors.images as { root?: { message?: string } })?.root?.message
                }
              />
            )}
          />
        </section>

        <div className="flex items-center gap-3 border-t border-border pt-6">
          <Button type="submit" disabled={isFormDisabled}>
            {isFormDisabled ? t('productsFormSaving') : t('productsFormSave')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isFormDisabled}
            onClick={() => router.push('/admin/products')}
          >
            {t('productsFormCancel')}
          </Button>
        </div>
      </div>
    </form>
  )
}
