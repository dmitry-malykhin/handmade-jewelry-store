import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { SortFilter } from '../filters/sort-filter'

const mockOnSortChange = vi.fn()

beforeEach(() => {
  mockOnSortChange.mockClear()
})

describe('SortFilter — rendering', () => {
  it('renders a select element', () => {
    render(<SortFilter sortValue="createdAt_desc" onSortChange={mockOnSortChange} />)

    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('renders all 5 sort options', () => {
    render(<SortFilter sortValue="createdAt_desc" onSortChange={mockOnSortChange} />)

    // en.json translations
    expect(screen.getByRole('option', { name: 'Newest first' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Oldest first' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Price: low to high' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Price: high to low' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Top rated' })).toBeInTheDocument()
  })

  it('shows createdAt_desc as selected when sortValue is "createdAt_desc"', () => {
    render(<SortFilter sortValue="createdAt_desc" onSortChange={mockOnSortChange} />)

    expect(screen.getByRole('combobox')).toHaveValue('createdAt_desc')
  })

  it('shows price_asc as selected when sortValue is "price_asc"', () => {
    render(<SortFilter sortValue="price_asc" onSortChange={mockOnSortChange} />)

    expect(screen.getByRole('combobox')).toHaveValue('price_asc')
  })
})

describe('SortFilter — interactions', () => {
  it('calls onSortChange with the new value when a different option is selected', async () => {
    render(<SortFilter sortValue="createdAt_desc" onSortChange={mockOnSortChange} />)

    await userEvent.selectOptions(screen.getByRole('combobox'), 'price_asc')

    expect(mockOnSortChange).toHaveBeenCalledOnce()
    expect(mockOnSortChange).toHaveBeenCalledWith('price_asc')
  })

  it('calls onSortChange with "avgRating_desc" when Top rated is selected', async () => {
    render(<SortFilter sortValue="createdAt_desc" onSortChange={mockOnSortChange} />)

    await userEvent.selectOptions(screen.getByRole('combobox'), 'avgRating_desc')

    expect(mockOnSortChange).toHaveBeenCalledWith('avgRating_desc')
  })
})
