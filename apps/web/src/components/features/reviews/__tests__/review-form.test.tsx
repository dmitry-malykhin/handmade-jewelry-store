import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { ReviewForm } from '../review-form'
import { createReview } from '@/lib/api/reviews'
import { useAuthStore } from '@/store/auth.store'
import { ApiError } from '@/lib/api/client'

vi.mock('@/lib/api/reviews', () => ({ createReview: vi.fn() }))
vi.mock('@/store/auth.store', () => ({ useAuthStore: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockCreateReview = vi.mocked(createReview)
const mockUseAuthStore = vi.mocked(useAuthStore)
const mockToast = vi.mocked(toast)

interface AuthState {
  accessToken: string | null
  clearTokens: () => void
}

function setAuthState(overrides: Partial<AuthState>): {
  clearTokens: ReturnType<typeof vi.fn>
} {
  const clearTokens = vi.fn()
  const state: AuthState = { accessToken: 'tok-x', clearTokens, ...overrides }
  mockUseAuthStore.mockImplementation((selector) =>
    selector(state as Parameters<typeof selector>[0]),
  )
  return { clearTokens }
}

beforeEach(() => {
  vi.clearAllMocks()
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/features')
  await $allureSubSuite('review-form')
  await $allureSeverity('normal')
})

describe('ReviewForm', () => {
  it('disables Submit until a rating is selected (rating=0 case)', () => {
    setAuthState({})
    render(<ReviewForm productId="p1" onSuccess={vi.fn()} />)

    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
  })

  it('submits the trimmed comment + rating with bearer token, then calls onSuccess', async () => {
    setAuthState({ accessToken: 'tok-x' })
    mockCreateReview.mockResolvedValue({ id: 'rev-1' })
    const onSuccess = vi.fn()
    render(<ReviewForm productId="p1" onSuccess={onSuccess} />)

    // Click the 5th star (each star is a button with aria-label like "5 stars")
    const stars = screen.getAllByRole('radio')
    await userEvent.click(stars[4]!)

    const textarea = screen.getByRole('textbox')
    await userEvent.type(textarea, '   Great product!   ')

    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() =>
      expect(mockCreateReview).toHaveBeenCalledWith('tok-x', {
        productId: 'p1',
        rating: 5,
        comment: 'Great product!',
      }),
    )
    expect(mockToast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })

  it('omits the comment field when textarea is empty (whitespace only)', async () => {
    setAuthState({ accessToken: 'tok-x' })
    mockCreateReview.mockResolvedValue({ id: 'rev-1' })
    render(<ReviewForm productId="p1" onSuccess={vi.fn()} />)

    const stars = screen.getAllByRole('radio')
    await userEvent.click(stars[3]!)

    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => expect(mockCreateReview).toHaveBeenCalled())
    expect(mockCreateReview.mock.calls[0]?.[1]).toEqual({ productId: 'p1', rating: 4 })
  })

  it('clears tokens on 401 — token expired path', async () => {
    const { clearTokens } = setAuthState({ accessToken: 'tok-expired' })
    mockCreateReview.mockRejectedValueOnce(new ApiError(401, 'Unauthorized'))
    render(<ReviewForm productId="p1" onSuccess={vi.fn()} />)

    const stars = screen.getAllByRole('radio')
    await userEvent.click(stars[4]!)

    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => expect(clearTokens).toHaveBeenCalled())
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('surfaces ApiError.message in the inline alert on other 4xx (not 401)', async () => {
    setAuthState({ accessToken: 'tok-x' })
    mockCreateReview.mockRejectedValueOnce(
      new ApiError(403, 'You can only review products you have purchased'),
    )
    render(<ReviewForm productId="p1" onSuccess={vi.fn()} />)

    const stars = screen.getAllByRole('radio')
    await userEvent.click(stars[4]!)

    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/you can only review/i)
    })
  })
})
