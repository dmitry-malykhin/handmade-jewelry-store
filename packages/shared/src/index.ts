// Shared TypeScript types used across apps/web and apps/api
// Add domain types here as the project grows (W3+)

export type ApiResponse<T> = {
  data: T
  message?: string
}

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  total: number
  page: number
  limit: number
}
