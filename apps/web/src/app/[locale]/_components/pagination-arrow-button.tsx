import { Link } from '@/i18n/navigation'

const arrowButtonClassName = 'rounded-md border border-border px-4 py-2 text-sm transition-colors'

interface PaginationArrowButtonProps {
  href: string | null
  ariaLabel: string
  symbol: '←' | '→'
}

/**
 * Renders a clickable Link when `href` is provided, or a disabled <span> when null.
 * Used for prev/next controls in CatalogPagination.
 */
export function PaginationArrowButton({ href, ariaLabel, symbol }: PaginationArrowButtonProps) {
  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        className={`${arrowButtonClassName} bg-background text-foreground hover:bg-accent hover:text-accent-foreground`}
      >
        {symbol}
      </Link>
    )
  }

  return (
    <span
      aria-disabled="true"
      className={`${arrowButtonClassName} text-muted-foreground opacity-40`}
    >
      {symbol}
    </span>
  )
}
