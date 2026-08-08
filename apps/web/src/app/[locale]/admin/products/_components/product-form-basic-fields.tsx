'use client'

import { useTranslations } from 'next-intl'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { CreateProductFormValues } from '../_lib/create-product-schema'
import { FormField } from './product-form-field'

interface ProductFormBasicFieldsProps {
  register: UseFormRegister<CreateProductFormValues>
  errors: FieldErrors<CreateProductFormValues>
  onSlugManualEdit: () => void
  disabled: boolean
}

export function ProductFormBasicFields({
  register,
  errors,
  onSlugManualEdit,
  disabled,
}: ProductFormBasicFieldsProps) {
  const t = useTranslations('admin')

  return (
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
              disabled={disabled}
            />
          </FormField>
        </div>

        <div className="sm:col-span-2">
          <FormField label={t('productsFormFieldDescription')} error={errors.description?.message}>
            <Textarea
              {...register('description')}
              aria-label={t('productsFormFieldDescription')}
              placeholder={t('productsFormFieldDescriptionPlaceholder')}
              rows={5}
              aria-invalid={!!errors.description}
              disabled={disabled}
            />
          </FormField>
        </div>

        <FormField
          label={t('productsFormFieldSlug')}
          error={errors.slug?.message}
          hint={t('productsFormFieldSlugHint')}
        >
          <Input
            {...register('slug', { onChange: onSlugManualEdit })}
            aria-label={t('productsFormFieldSlug')}
            placeholder="northern-lights-bracelet"
            aria-invalid={!!errors.slug}
            disabled={disabled}
          />
        </FormField>

        <FormField label={t('productsFormFieldSku')} error={errors.sku?.message}>
          <Input
            {...register('sku')}
            placeholder="SKU-001"
            aria-invalid={!!errors.sku}
            disabled={disabled}
          />
        </FormField>
      </div>
    </section>
  )
}
