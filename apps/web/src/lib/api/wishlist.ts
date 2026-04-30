import { apiClient } from './client'

export interface WishlistProduct {
  id: string
  slug: string
  title: string
  description: string
  price: string
  stock: number
  images: string[]
  material: string | null
  avgRating: number
  reviewCount: number
}

const BASE_URL = '/api/wishlist'

export async function fetchMyWishlist(accessToken: string): Promise<WishlistProduct[]> {
  return apiClient<WishlistProduct[]>(BASE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function addToWishlist(
  accessToken: string,
  productId: string,
): Promise<{ added: boolean }> {
  return apiClient<{ added: boolean }>(`${BASE_URL}/${productId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function removeFromWishlist(
  accessToken: string,
  productId: string,
): Promise<{ removed: boolean }> {
  return apiClient<{ removed: boolean }>(`${BASE_URL}/${productId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function mergeGuestWishlist(
  accessToken: string,
  productIds: string[],
): Promise<WishlistProduct[]> {
  return apiClient<WishlistProduct[]>(`${BASE_URL}/merge`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ productIds }),
  })
}
