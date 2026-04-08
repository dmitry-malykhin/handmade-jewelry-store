// Mirrors ProductCard layout exactly to prevent CLS when real card renders.
// Real card: article > figure.aspect-square + div.flex-col.gap-2.p-4 {
//   maybe Badge(h-5), h2.text-sm(line-clamp-2 ≈ 40px), maybe rating(text-xs),
//   mt-auto: price(text-base) + Button.size-sm(h-9)
// }
export function ProductCardSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      {/* aspect-square matches figure in ProductCard */}
      <div className="aspect-square animate-pulse bg-skeleton-base" />

      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Title line 1 — text-sm line-height ≈ 20px, use h-5 */}
        <div className="h-5 w-3/4 animate-pulse rounded bg-skeleton-base" />
        {/* Title line 2 — line-clamp-2 means potentially 2 lines */}
        <div className="h-5 w-1/2 animate-pulse rounded bg-skeleton-base" />

        {/* mt-auto mirrors real card's price + Button.size-sm(h-9) row */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="h-5 w-1/3 animate-pulse rounded bg-skeleton-base" />
          <div className="h-9 w-20 animate-pulse rounded bg-skeleton-base" />
        </div>
      </div>
    </article>
  )
}
