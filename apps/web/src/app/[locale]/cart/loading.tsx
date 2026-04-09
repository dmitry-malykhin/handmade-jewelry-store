// Mirrors CartPage layout to prevent CLS:
//   container > grid.grid-cols-1.gap-8.lg:grid-cols-3 {
//     div.lg:col-span-2: h1.text-2xl + ul divide-y {
//       CartItemRow: li.flex.gap-4.py-4 {
//         figure.size-20.sm:size-24 | div.flex-1.flex-col.gap-2 { title+trash | quantity+price }
//       }
//     }
//     CartSummary: aside.rounded-lg.border.bg-card.p-6 {
//       h2.text-lg | free-shipping-bar | price rows | 2×Button.size-lg.w-full
//     }
//   }
export default function CartLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Cart items — lg:col-span-2 */}
        <div className="lg:col-span-2">
          {/* h1.text-2xl.font-semibold */}
          <div className="mb-4 h-8 w-24 animate-pulse rounded bg-skeleton-base" />

          <ul role="list" className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, cartItemIndex) => (
              // li.flex.gap-4.py-4 — height driven by image size-20/sm:size-24
              <li key={cartItemIndex} className="flex gap-4 py-4">
                {/* figure.size-20.sm:size-24 rounded-md */}
                <div className="size-20 shrink-0 animate-pulse rounded-md bg-skeleton-base sm:size-24" />

                <div className="flex flex-1 flex-col gap-2">
                  {/* Top: title h2.text-sm + trash Button.size-8 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-skeleton-base" />
                    <div className="size-11 shrink-0 animate-pulse rounded bg-skeleton-base" />
                  </div>
                  {/* Bottom (mt-auto): quantity controls (3×size-8) + price text-sm */}
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="size-11 animate-pulse rounded bg-skeleton-base" />
                      <div className="h-4 w-8 animate-pulse rounded bg-skeleton-base" />
                      <div className="size-11 animate-pulse rounded bg-skeleton-base" />
                    </div>
                    <div className="h-4 w-16 animate-pulse rounded bg-skeleton-base" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* CartSummary — aside.rounded-lg.border.border-border.bg-card.p-6 */}
        <aside aria-hidden="true" className="h-fit rounded-lg border border-border bg-card p-6">
          {/* h2.text-lg.font-semibold */}
          <div className="h-6 w-32 animate-pulse rounded bg-skeleton-base" />

          {/* Free shipping bar: div.mt-4.rounded-md.bg-accent.p-3 */}
          <div className="mt-4 rounded-md bg-accent p-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-skeleton-shine" />
            {/* progress bar h-1.5 */}
            <div className="mt-2 h-1.5 w-full animate-pulse rounded-full bg-skeleton-shine" />
          </div>

          {/* Price rows: div.mt-4.flex-col.gap-3 */}
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex justify-between">
              <div className="h-4 w-28 animate-pulse rounded bg-skeleton-base" />
              <div className="h-4 w-16 animate-pulse rounded bg-skeleton-base" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-16 animate-pulse rounded bg-skeleton-base" />
              <div className="h-4 w-20 animate-pulse rounded bg-skeleton-base" />
            </div>
            {/* Separator */}
            <div className="h-px w-full bg-border" />
            <div className="flex justify-between">
              <div className="h-5 w-12 animate-pulse rounded bg-skeleton-base" />
              <div className="h-5 w-16 animate-pulse rounded bg-skeleton-base" />
            </div>
          </div>

          {/* Checkout button: Button.size-lg.w-full mt-6 — h-11 */}
          <div className="mt-6 h-11 w-full animate-pulse rounded bg-skeleton-base" />
          {/* Continue shopping ghost button: mt-2 h-11 */}
          <div className="mt-2 h-11 w-full animate-pulse rounded bg-skeleton-base" />
          {/* Secure checkout text: p.mt-4.text-xs */}
          <div className="mx-auto mt-4 h-3 w-32 animate-pulse rounded bg-skeleton-base" />
        </aside>
      </div>
    </div>
  )
}
