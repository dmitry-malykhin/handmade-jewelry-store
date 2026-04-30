import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@/test-utils'
import { ExpressCheckoutCleanup } from '../express-checkout-cleanup'
import { useCartStore } from '@/store'
import { useAuthStore } from '@/store/auth.store'
import { useWishlistStore } from '@/store/wishlist.store'
import * as wishlistApi from '@/lib/api/wishlist'

const sampleProduct = {
  productId: 'prod-1',
  slug: 'silver-ring',
  title: 'Silver Ring',
  price: 49.99,
  image: 'https://example.com/ring.jpg',
}

beforeEach(() => {
  useCartStore.setState({ items: [], expressItem: null })
  useWishlistStore.getState().clear()
  useAuthStore.getState().clearTokens()
  vi.spyOn(wishlistApi, 'removeFromWishlist').mockResolvedValue({ removed: true })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ExpressCheckoutCleanup', () => {
  it('does nothing when there is no express item (regular cart purchase)', () => {
    useCartStore.getState().addItem(sampleProduct)
    useWishlistStore.getState().setAll(['prod-1'])
    useAuthStore.getState().setTokens('access', 'refresh')

    render(<ExpressCheckoutCleanup />)

    // Cart untouched, wishlist untouched, no API call
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useWishlistStore.getState().productIds).toContain('prod-1')
    expect(wishlistApi.removeFromWishlist).not.toHaveBeenCalled()
  })

  it('clears expressItem and removes the product from local wishlist', () => {
    useCartStore.getState().setExpressItem(sampleProduct)
    useWishlistStore.getState().setAll(['prod-1', 'prod-2'])

    render(<ExpressCheckoutCleanup />)

    expect(useCartStore.getState().expressItem).toBeNull()
    expect(useWishlistStore.getState().productIds).toEqual(['prod-2'])
  })

  it('syncs the wishlist removal to the server when authenticated', () => {
    useAuthStore.getState().setTokens('access-token', 'refresh-token')
    useCartStore.getState().setExpressItem(sampleProduct)

    render(<ExpressCheckoutCleanup />)

    expect(wishlistApi.removeFromWishlist).toHaveBeenCalledWith('access-token', 'prod-1')
  })

  it('skips the server sync for unauthenticated users (still clears local state)', () => {
    useCartStore.getState().setExpressItem(sampleProduct)
    useWishlistStore.getState().setAll(['prod-1'])

    render(<ExpressCheckoutCleanup />)

    expect(wishlistApi.removeFromWishlist).not.toHaveBeenCalled()
    // Local state still cleared
    expect(useCartStore.getState().expressItem).toBeNull()
    expect(useWishlistStore.getState().productIds).not.toContain('prod-1')
  })
})
