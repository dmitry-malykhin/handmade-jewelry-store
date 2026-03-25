import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { CategoryFilter } from '../filters/category-filter'
import type { Category } from '@jewelry/shared'

const mockOnCategoryChange = vi.fn()

const sampleCategories: Category[] = [
  { id: 'cat-1', name: 'Rings', slug: 'rings' },
  { id: 'cat-2', name: 'Earrings', slug: 'earrings' },
  { id: 'cat-3', name: 'Necklaces', slug: 'necklaces' },
]

beforeEach(() => {
  mockOnCategoryChange.mockClear()
})

describe('CategoryFilter — rendering', () => {
  it('renders the "All categories" radio option', () => {
    render(
      <CategoryFilter
        categories={sampleCategories}
        selectedCategory=""
        onCategoryChange={mockOnCategoryChange}
      />,
    )

    expect(screen.getByRole('radio', { name: 'All categories' })).toBeInTheDocument()
  })

  it('renders a radio option for each category', () => {
    render(
      <CategoryFilter
        categories={sampleCategories}
        selectedCategory=""
        onCategoryChange={mockOnCategoryChange}
      />,
    )

    expect(screen.getByRole('radio', { name: 'Rings' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Earrings' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Necklaces' })).toBeInTheDocument()
  })

  it('renders nothing when categories list is empty', () => {
    const { container } = render(
      <CategoryFilter
        categories={[]}
        selectedCategory=""
        onCategoryChange={mockOnCategoryChange}
      />,
    )

    expect(container.firstChild).toBeNull()
  })
})

describe('CategoryFilter — selected state', () => {
  it('checks "All categories" radio when selectedCategory is empty string', () => {
    render(
      <CategoryFilter
        categories={sampleCategories}
        selectedCategory=""
        onCategoryChange={mockOnCategoryChange}
      />,
    )

    expect(screen.getByRole('radio', { name: 'All categories' })).toBeChecked()
  })

  it('checks the matching category radio when selectedCategory is set', () => {
    render(
      <CategoryFilter
        categories={sampleCategories}
        selectedCategory="earrings"
        onCategoryChange={mockOnCategoryChange}
      />,
    )

    expect(screen.getByRole('radio', { name: 'Earrings' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'All categories' })).not.toBeChecked()
  })
})

describe('CategoryFilter — interactions', () => {
  it('calls onCategoryChange with the category slug when a category radio is clicked', async () => {
    render(
      <CategoryFilter
        categories={sampleCategories}
        selectedCategory=""
        onCategoryChange={mockOnCategoryChange}
      />,
    )

    await userEvent.click(screen.getByRole('radio', { name: 'Rings' }))

    expect(mockOnCategoryChange).toHaveBeenCalledOnce()
    expect(mockOnCategoryChange).toHaveBeenCalledWith('rings')
  })

  it('calls onCategoryChange with empty string when "All categories" is clicked', async () => {
    render(
      <CategoryFilter
        categories={sampleCategories}
        selectedCategory="rings"
        onCategoryChange={mockOnCategoryChange}
      />,
    )

    await userEvent.click(screen.getByRole('radio', { name: 'All categories' }))

    expect(mockOnCategoryChange).toHaveBeenCalledWith('')
  })
})
