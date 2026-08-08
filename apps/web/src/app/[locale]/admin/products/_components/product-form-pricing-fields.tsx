'use client'

import { useTranslations } from 'next-intl'
import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { STOCK_TYPES, type CreateProductFormValues } from '../_lib/create-product-schema'
import { FormField } from './product-form-field'

interface ProductFormPricingFieldsProps {
  register: UseFormRegister<CreateProductFormValues>
  control: Control<CreateProductFormValues>
  errors: FieldErrors<CreateProductFormValues>
  disabled: boolean
}

export function ProductFormPricingFields({
  register,
  control,
  errors,
  disabled,
}: ProductFormPricingFieldsProps) {
  const t = useTranslations('admin')

  return (
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
              disabled={disabled}
            />
          </div>
        </FormField>

        <FormField
          label={t('productsFormFieldStock')}
          error={errors.stock?.message}
          hint={t('productsFormFieldStockHint')}
        >
          <Controller
            name="stock"
            control={control}
            render={({ field }) => (
              <div
                role="group"
                aria-label={t('productsFormFieldStock')}
                className="grid grid-cols-2 gap-1 rounded-md border border-input bg-background p-1"
              >
                <button
                  type="button"
                  aria-pressed={field.value === 1}
                  disabled={disabled}
                  onClick={() => field.onChange(1)}
                  className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                    field.value === 1
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {t('productsFormStockInStockOption')}
                </button>
                <button
                  type="button"
                  aria-pressed={field.value === 0}
                  disabled={disabled}
                  onClick={() => field.onChange(0)}
                  className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                    field.value === 0
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {t('productsFormStockMadeOnOrderOption')}
                </button>
              </div>
            )}
          />
        </FormField>

        <FormField label={t('productsFormFieldStockType')} error={errors.stockType?.message}>
          <Controller
            name="stockType"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
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

        <FormField
          label={t('productsFormFieldProductionDays')}
          error={errors.productionDays?.message}
          hint={t('productsFormFieldProductionDaysHint')}
        >
          <Input
            {...register('productionDays', { valueAsNumber: true })}
            aria-label={t('productsFormFieldProductionDays')}
            type="number"
            min="0"
            max="365"
            placeholder="0"
            aria-invalid={!!errors.productionDays}
            disabled={disabled}
          />
        </FormField>
      </div>
    </section>
  )
}
