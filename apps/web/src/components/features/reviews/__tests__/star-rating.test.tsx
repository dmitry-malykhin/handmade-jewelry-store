import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StarRating } from '../star-rating'

describe('StarRating', () => {
  it('renders read-only mode with aria-label showing the value', () => {
    render(<StarRating value={4} />)

    expect(screen.getByLabelText('4 of 5 stars')).toBeInTheDocument()
  })

  it('renders interactive radiogroup when onChange provided', () => {
    render(<StarRating value={3} onChange={vi.fn()} />)

    expect(screen.getByRole('radiogroup', { name: /rate this product/i })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('marks the selected star as aria-checked', () => {
    render(<StarRating value={3} onChange={vi.fn()} />)

    const radios = screen.getAllByRole('radio')
    expect(radios[2]).toHaveAttribute('aria-checked', 'true')
    expect(radios[0]).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onChange with the clicked star value', () => {
    const handleChange = vi.fn()
    render(<StarRating value={0} onChange={handleChange} />)

    fireEvent.click(screen.getByLabelText('5 stars'))

    expect(handleChange).toHaveBeenCalledWith(5)
  })

  it('uses custom aria-label when provided', () => {
    render(<StarRating value={5} ariaLabel="Average rating: 5 of 5" />)

    expect(screen.getByLabelText('Average rating: 5 of 5')).toBeInTheDocument()
  })
})
