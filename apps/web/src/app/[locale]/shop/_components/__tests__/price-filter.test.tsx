import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { PriceFilter } from '../filters/price-filter'

const mockOnMinPriceChange = vi.fn()
const mockOnMaxPriceChange = vi.fn()

beforeEach(() => {
  mockOnMinPriceChange.mockClear()
  mockOnMaxPriceChange.mockClear()
})

describe('PriceFilter — rendering', () => {
  it('renders the min price input with "From" placeholder', () => {
    render(
      <PriceFilter
        minPrice=""
        maxPrice=""
        onMinPriceChange={mockOnMinPriceChange}
        onMaxPriceChange={mockOnMaxPriceChange}
      />,
    )

    // en.json: catalog.filterPriceMin = "From"
    expect(screen.getByPlaceholderText('From')).toBeInTheDocument()
  })

  it('renders the max price input with "To" placeholder', () => {
    render(
      <PriceFilter
        minPrice=""
        maxPrice=""
        onMinPriceChange={mockOnMinPriceChange}
        onMaxPriceChange={mockOnMaxPriceChange}
      />,
    )

    // en.json: catalog.filterPriceMax = "To"
    expect(screen.getByPlaceholderText('To')).toBeInTheDocument()
  })

  it('shows the current minPrice value in the min input', () => {
    render(
      <PriceFilter
        minPrice="25"
        maxPrice=""
        onMinPriceChange={mockOnMinPriceChange}
        onMaxPriceChange={mockOnMaxPriceChange}
      />,
    )

    expect(screen.getByPlaceholderText('From')).toHaveValue(25)
  })

  it('shows the current maxPrice value in the max input', () => {
    render(
      <PriceFilter
        minPrice=""
        maxPrice="150"
        onMinPriceChange={mockOnMinPriceChange}
        onMaxPriceChange={mockOnMaxPriceChange}
      />,
    )

    expect(screen.getByPlaceholderText('To')).toHaveValue(150)
  })
})

describe('PriceFilter — interactions', () => {
  it('calls onMinPriceChange with the new value when the min input changes', async () => {
    render(
      <PriceFilter
        minPrice=""
        maxPrice=""
        onMinPriceChange={mockOnMinPriceChange}
        onMaxPriceChange={mockOnMaxPriceChange}
      />,
    )

    await userEvent.type(screen.getByPlaceholderText('From'), '30')

    expect(mockOnMinPriceChange).toHaveBeenCalled()
    // userEvent.type fires one event per character; last call contains '0' (last char of '30')
    expect(mockOnMinPriceChange).toHaveBeenLastCalledWith('0')
  })

  it('calls onMaxPriceChange with the new value when the max input changes', async () => {
    render(
      <PriceFilter
        minPrice=""
        maxPrice=""
        onMinPriceChange={mockOnMinPriceChange}
        onMaxPriceChange={mockOnMaxPriceChange}
      />,
    )

    await userEvent.type(screen.getByPlaceholderText('To'), '5')

    expect(mockOnMaxPriceChange).toHaveBeenCalledWith('5')
  })

  it('does not call onMaxPriceChange when only the min input changes', async () => {
    render(
      <PriceFilter
        minPrice=""
        maxPrice=""
        onMinPriceChange={mockOnMinPriceChange}
        onMaxPriceChange={mockOnMaxPriceChange}
      />,
    )

    await userEvent.type(screen.getByPlaceholderText('From'), '10')

    expect(mockOnMaxPriceChange).not.toHaveBeenCalled()
  })
})
