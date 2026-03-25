import { ProductCardSkeleton } from './product-card-skeleton'

interface ProductGridSkeletonProps {
  cardCount?: number
}

export function ProductGridSkeleton({ cardCount = 8 }: ProductGridSkeletonProps) {
  return (
    <ul
      role="list"
      aria-busy="true"
      className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: cardCount }).map((_, skeletonIndex) => (
        <li key={skeletonIndex}>
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  )
}
