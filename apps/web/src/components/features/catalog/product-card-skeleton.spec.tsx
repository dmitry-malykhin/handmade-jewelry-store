import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductCardSkeleton } from './product-card-skeleton'
import { ProductGridSkeleton } from './product-grid-skeleton'

describe('ProductCardSkeleton', () => {
  it('renders with aria-hidden to exclude from accessibility tree', () => {
    const { container } = render(<ProductCardSkeleton />)

    const skeletonArticle = container.querySelector('article')
    expect(skeletonArticle).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders skeleton blocks for image and text placeholders', () => {
    const { container } = render(<ProductCardSkeleton />)

    const animatedBlocks = container.querySelectorAll('.animate-pulse')
    expect(animatedBlocks.length).toBeGreaterThan(0)
  })
})

describe('ProductGridSkeleton', () => {
  it('renders default 8 skeleton cards', () => {
    render(<ProductGridSkeleton />)

    const skeletonList = screen.getByRole('list')
    expect(skeletonList).toHaveAttribute('aria-busy', 'true')
    expect(skeletonList.querySelectorAll('li').length).toBe(8)
  })

  it('renders the specified number of skeleton cards', () => {
    render(<ProductGridSkeleton cardCount={4} />)

    const skeletonList = screen.getByRole('list')
    expect(skeletonList.querySelectorAll('li').length).toBe(4)
  })
})
