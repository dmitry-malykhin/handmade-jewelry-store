// Mirrors AdminDashboardPage layout to prevent CLS:
//   h1.text-2xl.font-semibold.mb-6
//   StatsCards: ul.grid.gap-4.sm:grid-cols-2.lg:grid-cols-3 — 3 Cards
//     Card: CardHeader(flex-row justify-between pb-2: title text-sm + icon size-4)
//           + CardContent(text-2xl font-bold)
//   div.mt-6 > RevenueChart: Card {
//     CardHeader(flex-row justify-between: title text-base + 4 period buttons text-xs)
//     CardContent: dl.grid-cols-3(3 cells: dt text-xs + dd text-lg) + chart h-48
//   }
export default function AdminLoading() {
  return (
    <div className="flex flex-col">
      {/* h1.mb-6.text-2xl.font-semibold */}
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-skeleton-base" />

      {/* StatsCards: ul.grid.gap-4.sm:grid-cols-2.lg:grid-cols-3 — 3 cards */}
      <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, cardIndex) => (
          <li key={cardIndex}>
            {/* Card = rounded-lg border bg-card — matches Shadcn Card */}
            <div className="rounded-lg border border-border bg-card p-6">
              {/* CardHeader: flex-row items-center justify-between pb-2 */}
              <div className="mb-2 flex items-center justify-between pb-2">
                <div className="h-4 w-24 animate-pulse rounded bg-skeleton-base" />
                <div className="size-4 animate-pulse rounded bg-skeleton-base" />
              </div>
              {/* CardContent: text-2xl.font-bold */}
              <div className="h-8 w-16 animate-pulse rounded bg-skeleton-base" />
            </div>
          </li>
        ))}
      </ul>

      {/* div.mt-6 > RevenueChart Card */}
      <div className="mt-6">
        <div className="rounded-lg border border-border bg-card p-6">
          {/* CardHeader: flex-row items-center justify-between gap-4 pb-2 */}
          <div className="mb-2 flex items-center justify-between gap-4 pb-2">
            {/* title text-base.font-semibold */}
            <div className="h-5 w-20 animate-pulse rounded bg-skeleton-base" />
            {/* 4 period selector buttons text-xs (≈ h-7 w-12 each) */}
            <div className="flex gap-1">
              {Array.from({ length: 4 }).map((_, buttonIndex) => (
                <div
                  key={buttonIndex}
                  className="h-7 w-12 animate-pulse rounded bg-skeleton-base"
                />
              ))}
            </div>
          </div>

          {/* CardContent */}
          {/* Summary dl.grid-cols-3: each cell has dt text-xs + dd text-lg */}
          <div className="mb-4 grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, summaryIndex) => (
              <div key={summaryIndex} className="flex flex-col gap-1">
                <div className="h-3 w-16 animate-pulse rounded bg-skeleton-base" />
                <div className="h-7 w-20 animate-pulse rounded bg-skeleton-base" />
              </div>
            ))}
          </div>

          {/* Chart area: ResponsiveContainer h-48 */}
          <div className="h-48 animate-pulse rounded-md bg-skeleton-base" />
        </div>
      </div>
    </div>
  )
}
