'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import type { CreateProductFormValues } from '../_lib/create-product-schema'
import { FormField } from './product-form-field'

interface ProductFormDimensionsFieldsProps {
  register: UseFormRegister<CreateProductFormValues>
  errors: FieldErrors<CreateProductFormValues>
  isOpen: boolean
  onToggle: () => void
  disabled: boolean
}

const DIMENSION_FIELDS: Array<{
  name: keyof Pick<
    CreateProductFormValues,
    'lengthCm' | 'widthCm' | 'heightCm' | 'diameterCm' | 'weightGrams' | 'beadSizeMm'
  >
  labelKey: `productsFormField${string}`
  step: string
  placeholder: string
  hintKey?: `productsFormDimensionHint`
}> = [
  {
    name: 'lengthCm',
    labelKey: 'productsFormFieldLengthCm',
    step: '0.1',
    placeholder: '45.0',
    hintKey: 'productsFormDimensionHint',
  },
  { name: 'widthCm', labelKey: 'productsFormFieldWidthCm', step: '0.1', placeholder: '1.5' },
  { name: 'heightCm', labelKey: 'productsFormFieldHeightCm', step: '0.1', placeholder: '2.0' },
  { name: 'diameterCm', labelKey: 'productsFormFieldDiameterCm', step: '0.1', placeholder: '7.0' },
  {
    name: 'weightGrams',
    labelKey: 'productsFormFieldWeightGrams',
    step: '0.1',
    placeholder: '12.5',
  },
  { name: 'beadSizeMm', labelKey: 'productsFormFieldBeadSizeMm', step: '0.5', placeholder: '6.0' },
]

export function ProductFormDimensionsFields({
  register,
  errors,
  isOpen,
  onToggle,
  disabled,
}: ProductFormDimensionsFieldsProps) {
  const t = useTranslations('admin')

  return (
    <section aria-labelledby="section-dimensions">
      <button
        type="button"
        id="section-dimensions"
        className="flex w-full items-center justify-between text-base font-semibold text-foreground"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        {t('productsFormSectionDimensions')}
        {isOpen ? (
          <ChevronUp className="size-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4" aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {DIMENSION_FIELDS.map((dimensionField) => (
            <FormField
              key={dimensionField.name}
              label={t(dimensionField.labelKey)}
              error={errors[dimensionField.name]?.message}
              hint={dimensionField.hintKey ? t(dimensionField.hintKey) : undefined}
            >
              <Input
                {...register(dimensionField.name, {
                  valueAsNumber: true,
                  setValueAs: (value) => (value === '' ? undefined : Number(value)),
                })}
                type="number"
                step={dimensionField.step}
                min="0"
                placeholder={dimensionField.placeholder}
                aria-invalid={!!errors[dimensionField.name]}
                disabled={disabled}
              />
            </FormField>
          ))}
        </div>
      )}
    </section>
  )
}
