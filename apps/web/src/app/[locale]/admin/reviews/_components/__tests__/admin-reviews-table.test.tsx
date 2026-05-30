import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { AdminReviewsTable } from '../admin-reviews-table'
import {
  fetchAdminReviews,
  replyToAdminReview,
  updateAdminReviewStatus,
  type AdminReview,
} from '@/lib/api/reviews'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

// Radix Select needs these jsdom-missing APIs
window.HTMLElement.prototype.hasPointerCapture = vi.fn()
window.HTMLElement.prototype.setPointerCapture = vi.fn()
window.HTMLElement.prototype.releasePointerCapture = vi.fn()
window.HTMLElement.prototype.scrollIntoView = vi.fn()

vi.mock('@/lib/api/reviews', () => ({
  fetchAdminReviews: vi.fn(),
  updateAdminReviewStatus: vi.fn(),
  replyToAdminReview: vi.fn(),
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn((selector) => selector({ accessToken: 'mock-token' })),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockFetchAdminReviews = vi.mocked(fetchAdminReviews)
const mockUpdateStatus = vi.mocked(updateAdminReviewStatus)
const mockReply = vi.mocked(replyToAdminReview)

const pendingReview: AdminReview = {
  id: 'rev-1',
  rating: 5,
  comment: 'Beautiful piece!',
  status: 'PENDING',
  sellerReply: null,
  sellerRepliedAt: null,
  createdAt: '2026-05-19T00:00:00Z',
  user: { email: 'alice@example.com' },
  product: { id: 'prod-1', slug: 'ring', title: 'Silver Ring', images: ['/img.jpg'] },
}

const approvedWithReply: AdminReview = {
  ...pendingReview,
  id: 'rev-2',
  status: 'APPROVED',
  sellerReply: 'Thank you!',
  sellerRepliedAt: '2026-05-20T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFetchAdminReviews.mockResolvedValue({
    data: [pendingReview],
    meta: { totalCount: 1, page: 1, limit: 20, totalPages: 1 },
  })
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('admin-reviews-table')
  await $allureSeverity('normal')
})

describe('AdminReviewsTable — rendering', () => {
  it('renders the title and description', async () => {
    render(<AdminReviewsTable />)
    expect(await screen.findByRole('heading', { name: /reviews/i })).toBeInTheDocument()
  })

  it('renders a row with product title, reviewer email, and star rating aria label', async () => {
    render(<AdminReviewsTable />)
    expect(await screen.findByText('Silver Ring')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByLabelText(/5 of 5 stars/i)).toBeInTheDocument()
  })

  it('shows empty state when no reviews match the filters', async () => {
    mockFetchAdminReviews.mockResolvedValueOnce({
      data: [],
      meta: { totalCount: 0, page: 1, limit: 20, totalPages: 0 },
    })
    render(<AdminReviewsTable />)
    expect(await screen.findByText(/no reviews match these filters/i)).toBeInTheDocument()
  })
})

describe('AdminReviewsTable — moderation actions', () => {
  it('Approve sends a PATCH with status=APPROVED', async () => {
    const user = userEvent.setup()
    mockUpdateStatus.mockResolvedValueOnce({ ...pendingReview, status: 'APPROVED' })

    render(<AdminReviewsTable />)
    await screen.findByText('Silver Ring')

    await user.click(screen.getByRole('button', { name: /approve/i }))

    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalledWith('rev-1', 'APPROVED', 'mock-token')
    })
  })

  it('Hide sends a PATCH with status=HIDDEN', async () => {
    const user = userEvent.setup()
    mockUpdateStatus.mockResolvedValueOnce({ ...pendingReview, status: 'HIDDEN' })

    render(<AdminReviewsTable />)
    await screen.findByText('Silver Ring')

    await user.click(screen.getByRole('button', { name: /hide/i }))

    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalledWith('rev-1', 'HIDDEN', 'mock-token')
    })
  })

  it('does not show the Approve button for an already-Approved review', async () => {
    mockFetchAdminReviews.mockResolvedValueOnce({
      data: [approvedWithReply],
      meta: { totalCount: 1, page: 1, limit: 20, totalPages: 1 },
    })
    render(<AdminReviewsTable />)
    await screen.findByText('Silver Ring')

    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hide/i })).toBeInTheDocument()
  })
})

describe('AdminReviewsTable — seller reply', () => {
  it('opens an inline textarea on Reply click', async () => {
    const user = userEvent.setup()
    render(<AdminReviewsTable />)
    await screen.findByText('Silver Ring')

    await user.click(screen.getByRole('button', { name: /^reply$/i }))

    expect(screen.getByPlaceholderText(/write a public reply/i)).toBeInTheDocument()
  })

  it('Save reply calls the API with the typed text', async () => {
    const user = userEvent.setup()
    mockReply.mockResolvedValueOnce({ ...pendingReview, sellerReply: 'Thanks Alice!' })

    render(<AdminReviewsTable />)
    await screen.findByText('Silver Ring')

    await user.click(screen.getByRole('button', { name: /^reply$/i }))
    const textarea = screen.getByPlaceholderText(/write a public reply/i)
    await user.type(textarea, 'Thanks Alice!')
    await user.click(screen.getByRole('button', { name: /save reply/i }))

    await waitFor(() => {
      expect(mockReply).toHaveBeenCalledWith('rev-1', 'Thanks Alice!', 'mock-token')
    })
  })

  it('disables Save when the textarea is empty (no whitespace-only replies)', async () => {
    const user = userEvent.setup()
    render(<AdminReviewsTable />)
    await screen.findByText('Silver Ring')

    await user.click(screen.getByRole('button', { name: /^reply$/i }))
    const saveButton = screen.getByRole('button', { name: /save reply/i })
    expect(saveButton).toBeDisabled()
  })

  it('shows "Edit reply" instead of "Reply" when a reply already exists', async () => {
    mockFetchAdminReviews.mockResolvedValueOnce({
      data: [approvedWithReply],
      meta: { totalCount: 1, page: 1, limit: 20, totalPages: 1 },
    })
    render(<AdminReviewsTable />)
    await screen.findByText('Silver Ring')

    expect(screen.getByRole('button', { name: /edit reply/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^reply$/i })).not.toBeInTheDocument()
  })
})
