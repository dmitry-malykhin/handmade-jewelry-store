// Mirrors ProductPage layout to prevent CLS:
//   nav.mb-6 breadcrumb (flex-wrap.gap-1.text-sm)
//   + article > grid.grid-cols-1.gap-8.lg:grid-cols-2.lg:gap-12 {
//       ProductImageGallery: figure.aspect-square.rounded-xl + ul thumbnails h-16 w-16
//       ProductInfo: flex-col.gap-6 {
//         h1.text-2xl.font-bold.lg:text-3xl
//         p.text-3xl.font-bold  (price)
//         p.text-sm             (stock status)
//         div.flex.items-center.gap-4 > Button.size-sm (h-9)
//         section               (description h2.text-sm.uppercase + p multiline)
//       }
//     }
export default function ProductLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb: nav.mb-6 ol.flex-wrap.items-center.gap-1.text-sm */}
      <nav aria-hidden="true" className="mb-6">
        <div className="flex flex-wrap items-center gap-1">
          <div className="h-4 w-10 animate-pulse rounded bg-skeleton-base" />
          <div className="h-4 w-2 animate-pulse rounded bg-skeleton-base" />
          <div className="h-4 w-10 animate-pulse rounded bg-skeleton-base" />
          <div className="h-4 w-2 animate-pulse rounded bg-skeleton-base" />
          <div className="h-4 w-32 animate-pulse rounded bg-skeleton-base" />
        </div>
      </nav>

      {/* article > grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* ProductImageGallery: div.flex-col.gap-4 */}
        <div className="flex flex-col gap-4">
          {/* figure.aspect-square.rounded-xl */}
          <div className="aspect-square w-full animate-pulse rounded-xl bg-skeleton-base" />
          {/* ul.flex.gap-2 thumbnails: button h-16 w-16 rounded-lg border-2 */}
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, thumbnailIndex) => (
              <div
                key={thumbnailIndex}
                className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-skeleton-base"
              />
            ))}
          </div>
        </div>

        {/* ProductInfo: div.flex-col.gap-6 */}
        <div className="flex flex-col gap-6">
          {/* h1.text-2xl.font-bold.lg:text-3xl */}
          <div className="h-8 w-3/4 animate-pulse rounded bg-skeleton-base lg:h-9" />
          {/* p.text-3xl.font-bold (price) */}
          <div className="h-9 w-24 animate-pulse rounded bg-skeleton-base" />
          {/* p.text-sm (stock status) */}
          <div className="h-4 w-32 animate-pulse rounded bg-skeleton-base" />
          {/* div.flex.items-center.gap-4 > Button.size-sm = h-9 */}
          <div className="flex items-center gap-4">
            <div className="h-9 w-28 animate-pulse rounded bg-skeleton-base" />
          </div>
          {/* section: h2.text-sm.uppercase.tracking-wide + p multiline */}
          <div className="flex flex-col gap-2">
            <div className="h-4 w-28 animate-pulse rounded bg-skeleton-base" />
            <div className="h-4 w-full animate-pulse rounded bg-skeleton-base" />
            <div className="h-4 w-full animate-pulse rounded bg-skeleton-base" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-skeleton-base" />
          </div>
        </div>
      </div>
    </div>
  )
}
