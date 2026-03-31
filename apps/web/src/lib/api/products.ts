import type { Category, Product, ProductsResponse, ProductStatus } from '@jewelry/shared'
import { apiClient } from './client'

export interface FetchProductsParams {
  page?: number
  limit?: number
  categorySlug?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  material?: string
  sortBy?: 'price' | 'createdAt' | 'avgRating'
  sortOrder?: 'asc' | 'desc'
}

export interface AdminProductsQueryParams {
  page?: number
  limit?: number
  status?: ProductStatus
  categorySlug?: string
  search?: string
  sortBy?: 'createdAt' | 'title' | 'price' | 'stock'
  sortOrder?: 'asc' | 'desc'
}

export async function fetchProducts(params: FetchProductsParams = {}): Promise<ProductsResponse> {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })

  const query = searchParams.toString()
  return apiClient<ProductsResponse>(`/api/products${query ? `?${query}` : ''}`)
}

export async function fetchProductBySlug(productSlug: string): Promise<Product> {
  return apiClient<Product>(`/api/products/${productSlug}`)
}

export async function fetchCategories(): Promise<Category[]> {
  return apiClient<Category[]>('/api/categories')
}

export async function fetchAdminProducts(
  params: AdminProductsQueryParams,
  accessToken: string,
): Promise<ProductsResponse> {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  const url = `/api/admin/products${queryString ? `?${queryString}` : ''}`

  return apiClient<ProductsResponse>(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function updateProductStatus(
  productId: string,
  newStatus: ProductStatus,
  accessToken: string,
): Promise<Pick<Product, 'id' | 'slug' | 'title' | 'status'>> {
  return apiClient(`/api/admin/products/${productId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ status: newStatus }),
  })
}
