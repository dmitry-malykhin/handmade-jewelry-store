import { apiClient } from './client'

export interface ProductReview {
  id: string
  rating: number
  comment: string | null
  displayName: string
  createdAt: string
}

export interface ProductReviewsResponse {
  data: ProductReview[]
  meta: {
    totalCount: number
    avgRating: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface CreateReviewPayload {
  productId: string
  rating: number
  comment?: string
}

export interface UserReview {
  id: string
  rating: number
  comment: string | null
  createdAt: string
}

export interface ReviewEligibility {
  hasPurchased: boolean
  hasReviewed: boolean
  canReview: boolean
}

export async function fetchProductReviews(
  slug: string,
  page = 1,
  limit = 10,
): Promise<ProductReviewsResponse> {
  return apiClient<ProductReviewsResponse>(
    `/api/products/${slug}/reviews?page=${page}&limit=${limit}`,
  )
}

export async function createReview(
  accessToken: string,
  payload: CreateReviewPayload,
): Promise<{ id: string }> {
  return apiClient<{ id: string }>('/api/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  })
}

export async function fetchMyReviewForProduct(
  accessToken: string,
  productId: string,
): Promise<UserReview | null> {
  return apiClient<UserReview | null>(`/api/reviews/mine?productId=${productId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function fetchReviewEligibility(
  accessToken: string,
  productId: string,
): Promise<ReviewEligibility> {
  return apiClient<ReviewEligibility>(`/api/reviews/eligibility?productId=${productId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
