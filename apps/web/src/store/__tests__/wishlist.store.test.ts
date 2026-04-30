import { describe, it, expect, beforeEach } from 'vitest'
import { useWishlistStore } from '../wishlist.store'

describe('wishlist.store', () => {
  beforeEach(() => {
    useWishlistStore.getState().clear()
  })

  it('starts empty', () => {
    expect(useWishlistStore.getState().productIds).toEqual([])
  })

  it('adds a product id', () => {
    useWishlistStore.getState().add('p1')
    expect(useWishlistStore.getState().productIds).toEqual(['p1'])
  })

  it('does not add duplicates (idempotent)', () => {
    useWishlistStore.getState().add('p1')
    useWishlistStore.getState().add('p1')
    expect(useWishlistStore.getState().productIds).toEqual(['p1'])
  })

  it('removes a product id', () => {
    useWishlistStore.getState().add('p1')
    useWishlistStore.getState().add('p2')
    useWishlistStore.getState().remove('p1')
    expect(useWishlistStore.getState().productIds).toEqual(['p2'])
  })

  it('removing an absent id is a no-op', () => {
    useWishlistStore.getState().add('p1')
    useWishlistStore.getState().remove('ghost')
    expect(useWishlistStore.getState().productIds).toEqual(['p1'])
  })

  it('setAll replaces the whole list', () => {
    useWishlistStore.getState().add('p1')
    useWishlistStore.getState().setAll(['a', 'b', 'c'])
    expect(useWishlistStore.getState().productIds).toEqual(['a', 'b', 'c'])
  })

  it('clear empties the store', () => {
    useWishlistStore.getState().setAll(['a', 'b'])
    useWishlistStore.getState().clear()
    expect(useWishlistStore.getState().productIds).toEqual([])
  })
})
