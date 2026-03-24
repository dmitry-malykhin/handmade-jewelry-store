import type { Category, Product, ProductsResponse } from '@jewelry/shared'
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
