import { ProductGridSkeleton } from '@/components/features/catalog/product-grid-skeleton'

// Mirrors CatalogPage layout to prevent CLS:
//   CatalogHeader (header.mb-8: breadcrumb ol.mb-4 + h1.text-3xl + p.text-sm.mt-2)
//   + flex.gap-8 { aside.w-64 filters | main products }
// Filters: 3 fieldsets (CategoryFilter mb-6, PriceFilter mb-6, SortFilter mb-6)
//   each with legend.mb-3.text-sm and content (radio list / inputs / select)
export default function ShopLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* CatalogHeader: header.mb-8 */}
      <header className="mb-8">
        {/* Breadcrumb: ol.mb-4.flex.items-center.gap-2.text-sm */}
        <div className="mb-4 flex items-center gap-2">
          <div className="h-4 w-10 animate-pulse rounded bg-skeleton-base" />
          <div className="h-4 w-2 animate-pulse rounded bg-skeleton-base" />
          <div className="h-4 w-10 animate-pulse rounded bg-skeleton-base" />
        </div>
        {/* h1.text-3xl.font-bold */}
        <div className="h-9 w-48 animate-pulse rounded bg-skeleton-base" />
        {/* p.mt-2.text-sm (products count) */}
        <div className="mt-2 h-4 w-24 animate-pulse rounded bg-skeleton-base" />
      </header>

      <div className="flex gap-8">
        {/* Filters sidebar: aside.hidden.w-64.shrink-0.lg:block */}
        <aside aria-hidden="true" className="hidden w-64 shrink-0 lg:block">
          {/* CategoryFilter: fieldset.mb-6 */}
          <div className="mb-6">
            {/* legend.mb-3.text-sm.font-semibold */}
            <div className="mb-3 h-4 w-20 animate-pulse rounded bg-skeleton-base" />
            {/* ul.space-y-2 — 5 radio items each h-5 */}
            <ul role="list" className="space-y-2">
              {Array.from({ length: 5 }).map((_, radioIndex) => (
                <li key={radioIndex} className="flex items-center gap-2">
                  {/* radio circle */}
                  <div className="h-4 w-4 animate-pulse rounded-full bg-skeleton-base" />
                  <div className="h-4 w-24 animate-pulse rounded bg-skeleton-base" />
                </li>
              ))}
            </ul>
          </div>

          {/* PriceFilter: fieldset.mb-6 */}
          <div className="mb-6">
            {/* legend.mb-3.text-sm.font-semibold */}
            <div className="mb-3 h-4 w-20 animate-pulse rounded bg-skeleton-base" />
            {/* div.flex.items-center.gap-2 — 2 inputs py-1.5 = h-[34px] */}
            <div className="flex items-center gap-2">
              <div className="h-[34px] w-full animate-pulse rounded-md bg-skeleton-base" />
              <div className="h-4 w-3 shrink-0 animate-pulse rounded bg-skeleton-base" />
              <div className="h-[34px] w-full animate-pulse rounded-md bg-skeleton-base" />
            </div>
          </div>

          {/* SortFilter: fieldset.mb-6 */}
          <div className="mb-6">
            {/* legend.mb-3.text-sm.font-semibold */}
            <div className="mb-3 h-4 w-16 animate-pulse rounded bg-skeleton-base" />
            {/* select.py-1.5 = h-[34px] w-full */}
            <div className="h-[34px] w-full animate-pulse rounded-md bg-skeleton-base" />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <ProductGridSkeleton cardCount={20} />
        </div>
      </div>
    </div>
  )
}
