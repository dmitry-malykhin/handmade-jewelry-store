import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/test-utils'
import { WishlistButton } from '../wishlist-button'
import { useWishlistStore } from '@/store/wishlist.store'
import { useAuthStore } from '@/store/auth.store'
import * as wishlistApi from '@/lib/api/wishlist'
import { ApiError } from '@/lib/api/client'

describe('WishlistButton', () => {
  beforeEach(() => {
    useWishlistStore.getState().clear()
    useAuthStore.getState().clearTokens()
    vi.spyOn(wishlistApi, 'addToWishlist').mockResolvedValue({ added: true })
    vi.spyOn(wishlistApi, 'removeFromWishlist').mockResolvedValue({ removed: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the unselected state with "Add to wishlist" label', () => {
    render(<WishlistButton productId="p1" />)
    const button = screen.getByRole('button', { name: /add to wishlist/i })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('flips to "Remove from wishlist" after a guest click and updates the store', async () => {
    const user = userEvent.setup()
    render(<WishlistButton productId="p1" />)

    await user.click(screen.getByRole('button', { name: /add to wishlist/i }))

    expect(useWishlistStore.getState().productIds).toContain('p1')
    expect(screen.getByRole('button', { name: /remove from wishlist/i })).toBeInTheDocument()
    // Guest should never call the API
    expect(wishlistApi.addToWishlist).not.toHaveBeenCalled()
  })

  it('calls addToWishlist API when authenticated and not yet wishlisted', async () => {
    useAuthStore.getState().setTokens('access-token', 'refresh-token')
    const user = userEvent.setup()
    render(<WishlistButton productId="p1" />)

    await user.click(screen.getByRole('button', { name: /add to wishlist/i }))

    await waitFor(() => {
      expect(wishlistApi.addToWishlist).toHaveBeenCalledWith('access-token', 'p1')
    })
    expect(useWishlistStore.getState().productIds).toContain('p1')
  })

  it('rolls back the optimistic add when the API fails', async () => {
    useAuthStore.getState().setTokens('access-token', 'refresh-token')
    vi.spyOn(wishlistApi, 'addToWishlist').mockRejectedValueOnce(new Error('network'))
    const user = userEvent.setup()
    render(<WishlistButton productId="p1" />)

    await user.click(screen.getByRole('button', { name: /add to wishlist/i }))

    await waitFor(() => {
      expect(useWishlistStore.getState().productIds).not.toContain('p1')
    })
  })

  it('removes from wishlist when already in it', async () => {
    useWishlistStore.getState().setAll(['p1'])
    const user = userEvent.setup()
    render(<WishlistButton productId="p1" />)

    await user.click(screen.getByRole('button', { name: /remove from wishlist/i }))

    expect(useWishlistStore.getState().productIds).not.toContain('p1')
  })

  it('on stale-token (401) keeps the local change and clears tokens silently', async () => {
    useAuthStore.getState().setTokens('stale-token', 'stale-refresh')
    vi.spyOn(wishlistApi, 'addToWishlist').mockRejectedValueOnce(
      new ApiError(401, 'API 401: Unauthorized'),
    )
    const user = userEvent.setup()
    render(<WishlistButton productId="p1" />)

    await user.click(screen.getByRole('button', { name: /add to wishlist/i }))

    await waitFor(() => {
      // Local state survives — the user's intent succeeded as a guest.
      expect(useWishlistStore.getState().productIds).toContain('p1')
      // Stale token is cleared, so the next click skips the API entirely.
      expect(useAuthStore.getState().accessToken).toBeNull()
    })
  })
})
