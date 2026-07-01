import { apiClient } from './client'
import { toQueryString } from './query-string'

export interface ProductReview {
  id: string
  rating: number
  comment: string | null
  displayName: string
  /** Seller's public reply, null when no reply has been posted. */
  sellerReply: string | null
  sellerRepliedAt: string | null
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

// ── Admin moderation ────────────────────────────────────────────────────────

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'HIDDEN'

export interface AdminReviewProduct {
  id: string
  slug: string
  title: string
  images: string[]
}

export interface AdminReview {
  id: string
  rating: number
  comment: string | null
  status: ReviewStatus
  sellerReply: string | null
  sellerRepliedAt: string | null
  createdAt: string
  user: { email: string }
  product: AdminReviewProduct
}

export interface AdminReviewsResponse {
  data: AdminReview[]
  meta: { totalCount: number; page: number; limit: number; totalPages: number }
}

export interface AdminReviewsQueryParams {
  status?: ReviewStatus
  rating?: number
  page?: number
  limit?: number
}

export async function fetchAdminReviews(
  params: AdminReviewsQueryParams,
  accessToken: string,
): Promise<AdminReviewsResponse> {
  return apiClient<AdminReviewsResponse>(`/api/admin/reviews${toQueryString(params)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function updateAdminReviewStatus(
  reviewId: string,
  status: ReviewStatus,
  accessToken: string,
): Promise<AdminReview> {
  return apiClient<AdminReview>(`/api/admin/reviews/${reviewId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ status }),
  })
}

export async function replyToAdminReview(
  reviewId: string,
  reply: string,
  accessToken: string,
): Promise<AdminReview> {
  return apiClient<AdminReview>(`/api/admin/reviews/${reviewId}/reply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ reply }),
  })
}
