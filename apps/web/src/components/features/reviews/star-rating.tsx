'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
  readOnly?: boolean
  ariaLabel?: string
}

const SIZE_CLASS = { sm: 'size-4', md: 'size-5', lg: 'size-6' }

/**
 * 5-star rating component. Read-only by default; pass onChange to enable input.
 * Uses Lucide Star with fill="currentColor" for filled stars.
 */
export function StarRating({
  value,
  onChange,
  size = 'md',
  readOnly = !onChange,
  ariaLabel,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const displayValue = hoverValue ?? value

  if (readOnly) {
    return (
      <div
        className="inline-flex items-center gap-0.5"
        aria-label={ariaLabel ?? `${value} of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              SIZE_CLASS[size],
              star <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30',
            )}
            aria-hidden="true"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel ?? 'Rate this product'}
      className="inline-flex gap-1"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={star === value}
          aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(null)}
          className="cursor-pointer rounded p-0.5 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <Star
            className={cn(
              SIZE_CLASS[size],
              star <= displayValue ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30',
            )}
          />
        </button>
      ))}
    </div>
  )
}
