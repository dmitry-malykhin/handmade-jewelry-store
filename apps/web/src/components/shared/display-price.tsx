'use client'

import { useFormattedPrice } from '@/hooks/useFormattedPrice'
import { cn } from '@/lib/utils'

interface DisplayPriceProps {
  amountUsd: number
  className?: string
  hideApproximationHint?: boolean
}

// Wraps `<data value={amountUsd}>` so the canonical USD number stays in the
// DOM for analytics, schema.org, and e2e tests while users see localised text.
export function DisplayPrice({
  amountUsd,
  className,
  hideApproximationHint = false,
}: DisplayPriceProps) {
  const { formatted, currency, isApproximate } = useFormattedPrice(amountUsd)

  return (
    <data
      value={amountUsd}
      className={cn('inline-flex items-baseline gap-1', className)}
      data-currency={currency}
    >
      <span>{formatted}</span>
      {isApproximate && !hideApproximationHint && (
        <span aria-hidden="true" className="text-xs text-muted-foreground">
          *
        </span>
      )}
    </data>
  )
}
