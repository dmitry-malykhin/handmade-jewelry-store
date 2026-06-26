import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { AdminPagination } from '../admin-pagination'

const baseProps = {
  infoKey: 'productsPaginationInfo',
  prevLabelKey: 'productsPaginationPrev',
  nextLabelKey: 'productsPaginationNext',
  onPageChange: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AdminPagination', () => {
  it('renders nothing when totalPages <= 1', () => {
    const { container } = render(
      <AdminPagination {...baseProps} currentPage={1} totalPages={1} totalCount={5} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders Prev/Next buttons and info text for a multi-page result', () => {
    render(<AdminPagination {...baseProps} currentPage={2} totalPages={5} totalCount={100} />)

    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('disables Prev on the first page', () => {
    render(<AdminPagination {...baseProps} currentPage={1} totalPages={5} totalCount={100} />)

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
  })

  it('disables Next on the last page', () => {
    render(<AdminPagination {...baseProps} currentPage={5} totalPages={5} totalCount={100} />)

    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled()
  })

  it('calls onPageChange with currentPage + 1 when Next is clicked', async () => {
    const onPageChange = vi.fn()
    render(
      <AdminPagination
        {...baseProps}
        onPageChange={onPageChange}
        currentPage={2}
        totalPages={5}
        totalCount={100}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /next/i }))

    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange with currentPage − 1 when Prev is clicked', async () => {
    const onPageChange = vi.fn()
    render(
      <AdminPagination
        {...baseProps}
        onPageChange={onPageChange}
        currentPage={3}
        totalPages={5}
        totalCount={100}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /previous/i }))

    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
