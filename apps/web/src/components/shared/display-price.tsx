'use client'

import { useFormattedPrice } from '@/hooks/useFormattedPrice'
import { cn } from '@/lib/utils'

interface DisplayPriceProps {
  /** Price in USD — backend stores all prices in USD. */
  amountUsd: number
  /** Tailwind class overrides for the rendered text. */
  className?: string
  /** When true, hides the approximation hint even for non-USD currencies. */
  hideApproximationHint?: boolean
}

/**
 * Render a price in the visitor's preferred display currency. Used on every
 * customer-facing surface where a price tag appears outside of cart/checkout
 * (which stay USD because Stripe charges in USD).
 *
 * Wraps `<data value={amountUsd}>` so the canonical USD number stays in the
 * DOM for analytics, schema.org markup, and end-to-end tests, while users
 * see the localized string visually.
 */
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
      // Asterisk on non-USD reads as "approximate" — see Storefront FAQ /
      // CurrencySwitcher tooltip. Keeps the price tag visually compact.
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
