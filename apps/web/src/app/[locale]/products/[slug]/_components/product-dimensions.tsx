'use client'

import { useTranslations } from 'next-intl'
import { convertLength } from '@jewelry/shared'
import { useMeasurementStore } from '@/store/measurement.store'
import type { Product } from '@jewelry/shared'

interface ProductDimensionsProps {
  product: Pick<
    Product,
    'lengthCm' | 'widthCm' | 'heightCm' | 'diameterCm' | 'weightGrams' | 'beadSizeMm'
  >
}

export function ProductDimensions({ product }: ProductDimensionsProps) {
  const t = useTranslations('productDetail')
  const measurementSystem = useMeasurementStore((state) => state.measurementSystem)
  const setMeasurementSystem = useMeasurementStore((state) => state.setMeasurementSystem)

  const hasDimensions =
    product.lengthCm !== null ||
    product.widthCm !== null ||
    product.heightCm !== null ||
    product.diameterCm !== null ||
    product.weightGrams !== null ||
    product.beadSizeMm !== null

  if (!hasDimensions) return null

  function handleToggleMeasurement() {
    setMeasurementSystem(measurementSystem === 'imperial' ? 'metric' : 'imperial')
  }

  return (
    <section aria-label={t('dimensionsLabel')}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('dimensionsTitle')}
        </h2>
        {/* Toggle shown only when there is at least one length/width/height/diameter field */}
        {(product.lengthCm !== null ||
          product.widthCm !== null ||
          product.heightCm !== null ||
          product.diameterCm !== null) && (
          <div
            role="group"
            aria-label={t('measurementToggleLabel')}
            className="flex overflow-hidden rounded-md border border-border text-xs font-medium"
          >
            <button
              onClick={handleToggleMeasurement}
              disabled={measurementSystem === 'imperial'}
              aria-pressed={measurementSystem === 'imperial'}
              className="px-2.5 py-1 transition-colors disabled:cursor-default disabled:bg-foreground disabled:text-background enabled:hover:bg-accent enabled:text-muted-foreground"
            >
              {t('measurementImperial')}
            </button>
            <button
              onClick={handleToggleMeasurement}
              disabled={measurementSystem === 'metric'}
              aria-pressed={measurementSystem === 'metric'}
              className="px-2.5 py-1 transition-colors disabled:cursor-default disabled:bg-foreground disabled:text-background enabled:hover:bg-accent enabled:text-muted-foreground"
            >
              {t('measurementMetric')}
            </button>
          </div>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {product.lengthCm !== null && (
          <>
            <dt className="text-muted-foreground">{t('length')}</dt>
            <dd className="font-medium text-foreground">
              {convertLength(product.lengthCm, measurementSystem).formatted}
            </dd>
          </>
        )}
        {product.widthCm !== null && (
          <>
            <dt className="text-muted-foreground">{t('width')}</dt>
            <dd className="font-medium text-foreground">
              {convertLength(product.widthCm, measurementSystem).formatted}
            </dd>
          </>
        )}
        {product.heightCm !== null && (
          <>
            <dt className="text-muted-foreground">{t('height')}</dt>
            <dd className="font-medium text-foreground">
              {convertLength(product.heightCm, measurementSystem).formatted}
            </dd>
          </>
        )}
        {product.diameterCm !== null && (
          <>
            <dt className="text-muted-foreground">{t('diameter')}</dt>
            <dd className="font-medium text-foreground">
              {convertLength(product.diameterCm, measurementSystem).formatted}
            </dd>
          </>
        )}
        {product.weightGrams !== null && (
          <>
            <dt className="text-muted-foreground">{t('weight')}</dt>
            {/* weightGrams is a universal jewelry standard — never convert to oz (docs/10) */}
            <dd className="font-medium text-foreground">{product.weightGrams} g</dd>
          </>
        )}
        {product.beadSizeMm !== null && (
          <>
            <dt className="text-muted-foreground">{t('beadSize')}</dt>
            {/* beadSizeMm is always in mm — industry standard, never convert (docs/10) */}
            <dd className="font-medium text-foreground">{product.beadSizeMm} mm</dd>
          </>
        )}
      </dl>
    </section>
  )
}
