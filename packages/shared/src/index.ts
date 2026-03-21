// Shared TypeScript types used across apps/web and apps/api

// ── API wrappers ──────────────────────────────────────────────────────────────

export type ApiResponse<T> = {
  data: T
  message?: string
}

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  total: number
  page: number
  limit: number
}

// ── Cart ──────────────────────────────────────────────────────────────────────

/**
 * Snapshot of a product captured when it is added to the cart.
 * Intentionally flat — cart items are independent of live product data.
 */
export interface CartItem {
  productId: string
  slug: string // for URL: /products/sterling-silver-ring
  title: string
  price: number // USD, e.g. 49.99
  image: string // URL of the primary product image
  quantity: number
}

// ── User ──────────────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'admin'

/**
 * Authenticated user profile.
 * Populated after login; stored only in memory (not persisted to localStorage).
 * Auth is driven by HTTP-only cookie — this type holds the decoded user data.
 */
export interface UserProfile {
  id: string
  email: string
  name: string | null
  role: UserRole
  avatarUrl: string | null
}
