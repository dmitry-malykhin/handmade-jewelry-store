// Mirrors AdminDashboardPage layout to prevent CLS — any change to that page
// must be reflected here in the same shape, or the cards/chart will jump on
// mount. The blocks correspond 1:1 to the real components.
export default function AdminLoading() {
  return (
    <div className="flex flex-col">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-skeleton-base" />

      <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, cardIndex) => (
          <li key={cardIndex}>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-2 flex items-center justify-between pb-2">
                <div className="h-4 w-24 animate-pulse rounded bg-skeleton-base" />
                <div className="size-4 animate-pulse rounded bg-skeleton-base" />
              </div>
              <div className="h-8 w-16 animate-pulse rounded bg-skeleton-base" />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-2 flex items-center justify-between gap-4 pb-2">
            <div className="h-5 w-20 animate-pulse rounded bg-skeleton-base" />
            <div className="flex gap-1">
              {Array.from({ length: 4 }).map((_, buttonIndex) => (
                <div
                  key={buttonIndex}
                  className="h-7 w-12 animate-pulse rounded bg-skeleton-base"
                />
              ))}
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, summaryIndex) => (
              <div key={summaryIndex} className="flex flex-col gap-1">
                <div className="h-3 w-16 animate-pulse rounded bg-skeleton-base" />
                <div className="h-7 w-20 animate-pulse rounded bg-skeleton-base" />
              </div>
            ))}
          </div>

          <div className="h-48 animate-pulse rounded-md bg-skeleton-base" />
        </div>
      </div>
    </div>
  )
}
