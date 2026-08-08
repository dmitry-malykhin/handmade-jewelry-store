'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import type { Category, Product } from '@jewelry/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductImageUpload } from './product-image-upload'
import { FormField } from './product-form-field'
import { ProductFormBasicFields } from './product-form-basic-fields'
import { ProductFormPricingFields } from './product-form-pricing-fields'
import { ProductFormDimensionsFields } from './product-form-dimensions-fields'
import { useProductFormMutation } from './useProductFormMutation'
import { createProductSchema, type CreateProductFormValues } from '../_lib/create-product-schema'

type ProductFormProps =
  | { mode: 'create'; categories: Category[] }
  | { mode: 'edit'; categories: Category[]; product: Product }

function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildDefaultValues(product: Product | undefined): Partial<CreateProductFormValues> {
  if (!product) {
    return {
      stockType: 'IN_STOCK',
      stock: 0,
      productionDays: 0,
      images: [],
    }
  }
  return {
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
  }
}

function hasAnyDimension(product: Product): boolean {
  return (
    product.lengthCm !== null ||
    product.widthCm !== null ||
    product.heightCm !== null ||
    product.diameterCm !== null ||
    product.weightGrams !== null ||
    product.beadSizeMm !== null
  )
}

export function ProductForm(props: ProductFormProps) {
  const isCreate = props.mode === 'create'
  const product = props.mode === 'edit' ? props.product : undefined

  const t = useTranslations('admin')
  const router = useRouter()
  const [isDimensionsOpen, setIsDimensionsOpen] = useState(
    product ? hasAnyDimension(product) : false,
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
    defaultValues: buildDefaultValues(product),
  })

  const watchedTitle = watch('title')

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

  const submitMutation = useProductFormMutation({ mode: props.mode, product })

  const handleFormSubmit = useCallback(
    (formValues: CreateProductFormValues) => {
      submitMutation.mutate(formValues)
    },
    [submitMutation],
  )

  const isFormDisabled = isSubmitting || submitMutation.isPending
  const submitLabel = isFormDisabled
    ? t(isCreate ? 'productsFormSubmitting' : 'productsFormSaving')
    : t(isCreate ? 'productsFormSubmit' : 'productsFormSave')

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <div className="space-y-8">
        <ProductFormBasicFields
          register={register}
          errors={errors}
          onSlugManualEdit={() => setIsSlugManuallyEdited(true)}
          disabled={isFormDisabled}
        />

        <ProductFormPricingFields
          register={register}
          control={control}
          errors={errors}
          disabled={isFormDisabled}
        />

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
                      {props.categories.map((category) => (
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

        <ProductFormDimensionsFields
          register={register}
          errors={errors}
          isOpen={isDimensionsOpen}
          onToggle={() => setIsDimensionsOpen((prev) => !prev)}
          disabled={isFormDisabled}
        />

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
                initialImageUrls={product?.images}
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
            {submitLabel}
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
