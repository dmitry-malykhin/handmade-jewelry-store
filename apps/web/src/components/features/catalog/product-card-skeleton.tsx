export function ProductCardSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <div className="aspect-square animate-pulse bg-accent/20" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-3 w-3/4 animate-pulse rounded bg-accent/20" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-accent/20" />
        <div className="mt-auto pt-2">
          <div className="h-4 w-1/3 animate-pulse rounded bg-accent/20" />
        </div>
      </div>
    </article>
  )
}
