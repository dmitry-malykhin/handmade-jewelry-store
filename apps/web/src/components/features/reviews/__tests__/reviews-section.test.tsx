import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { ReviewsSection } from '../reviews-section'
import { fetchProductReviews, fetchReviewEligibility } from '@/lib/api/reviews'
import { useAuthStore } from '@/store/auth.store'

vi.mock('@/lib/api/reviews', () => ({
  fetchProductReviews: vi.fn(),
  fetchReviewEligibility: vi.fn(),
}))

vi.mock('@/store/auth.store', () => ({ useAuthStore: vi.fn() }))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('../review-form', () => ({
  ReviewForm: ({ onSuccess }: { onSuccess: () => void }) => (
    <button type="button" data-testid="mock-review-form" onClick={onSuccess}>
      Mock review form
    </button>
  ),
}))

const mockFetchReviews = vi.mocked(fetchProductReviews)
const mockFetchEligibility = vi.mocked(fetchReviewEligibility)
const mockUseAuthStore = vi.mocked(useAuthStore)

interface AuthState {
  isAuthenticated: boolean
  accessToken: string | null
}

function setAuthState(overrides: Partial<AuthState>): void {
  const state: AuthState = {
    isAuthenticated: false,
    accessToken: null,
    ...overrides,
  }
  mockUseAuthStore.mockImplementation((selector) =>
    selector(state as Parameters<typeof selector>[0]),
  )
}

function emptyReviewsResponse(): {
  data: []
  meta: { totalCount: number; avgRating: number; page: number; limit: number; totalPages: number }
} {
  return {
    data: [],
    meta: { totalCount: 0, avgRating: 0, page: 1, limit: 10, totalPages: 0 },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/features')
  await $allureSubSuite('reviews-section')
  await $allureSeverity('normal')
})

describe('ReviewsSection', () => {
  it('renders the heading + star rating + count from initial props before fetch resolves', () => {
    setAuthState({})
    mockFetchReviews.mockReturnValue(new Promise(() => {}))

    render(
      <ReviewsSection
        productId="p1"
        productSlug="silver-ring"
        initialAvgRating={4.2}
        initialReviewCount={8}
      />,
    )

    expect(screen.getByRole('heading', { name: /reviews/i })).toBeInTheDocument()
    expect(screen.getByText(/4\.2/)).toBeInTheDocument()
  })

  it('shows skeleton list while reviews are loading (data === null)', () => {
    setAuthState({})
    mockFetchReviews.mockReturnValue(new Promise(() => {}))

    render(
      <ReviewsSection
        productId="p1"
        productSlug="silver-ring"
        initialAvgRating={0}
        initialReviewCount={0}
      />,
    )

    expect(screen.getByRole('list', { hidden: false })).toHaveAttribute('aria-busy', 'true')
  })

  it('renders the empty state after a successful fetch with zero reviews', async () => {
    setAuthState({})
    mockFetchReviews.mockResolvedValue(emptyReviewsResponse())

    render(
      <ReviewsSection
        productId="p1"
        productSlug="silver-ring"
        initialAvgRating={0}
        initialReviewCount={0}
      />,
    )

    await waitFor(() => expect(mockFetchReviews).toHaveBeenCalledWith('silver-ring'))
    await waitFor(() => {
      // emptyState i18n message — accept the english copy "No reviews" or the raw key
      const emptyMessage = screen.queryByText(/no reviews|emptyState/i)
      expect(emptyMessage).not.toBeNull()
    })
  })

  it('shows a destructive alert when the reviews fetch rejects', async () => {
    setAuthState({})
    mockFetchReviews.mockRejectedValue(new Error('Network down'))

    render(
      <ReviewsSection
        productId="p1"
        productSlug="silver-ring"
        initialAvgRating={0}
        initialReviewCount={0}
      />,
    )

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })

  it('shows the Sign in to review CTA for unauthenticated users (after hydration)', async () => {
    setAuthState({ isAuthenticated: false })
    mockFetchReviews.mockResolvedValue(emptyReviewsResponse())

    render(
      <ReviewsSection
        productId="p1"
        productSlug="silver-ring"
        initialAvgRating={0}
        initialReviewCount={0}
      />,
    )

    const signInLink = await screen.findByRole('link', { name: /sign in/i })
    expect(signInLink).toHaveAttribute('href', '/login')
  })

  it('hides any "write review" CTA when authenticated user has not purchased', async () => {
    setAuthState({ isAuthenticated: true, accessToken: 'tok-x' })
    mockFetchReviews.mockResolvedValue(emptyReviewsResponse())
    mockFetchEligibility.mockResolvedValue({
      hasPurchased: false,
      hasReviewed: false,
      canReview: false,
    })

    render(
      <ReviewsSection
        productId="p1"
        productSlug="silver-ring"
        initialAvgRating={0}
        initialReviewCount={0}
      />,
    )

    await waitFor(() => expect(mockFetchEligibility).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /write a review/i })).not.toBeInTheDocument()
  })
})
