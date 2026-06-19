import type { Category, Product, ProductsResponse, ProductStatus } from '@jewelry/shared'
import { apiClient } from './client'
import { downloadCsv } from './csv-download'

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

// Mirrors the @Max(100) guard on the public listing endpoint.
export const PUBLIC_PRODUCTS_MAX_PAGE_SIZE = 100

// Bounded by `totalPages` from the API so a count drift mid-traversal can't
// turn this into an infinite loop.
export async function fetchAllProducts(): Promise<Product[]> {
  const first = await fetchProducts({ page: 1, limit: PUBLIC_PRODUCTS_MAX_PAGE_SIZE })
  if (first.meta.totalPages <= 1) return first.data

  const remainingPages = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, idx) =>
      fetchProducts({ page: idx + 2, limit: PUBLIC_PRODUCTS_MAX_PAGE_SIZE }),
    ),
  )
  return [...first.data, ...remainingPages.flatMap((response) => response.data)]
}

export async function fetchProductBySlug(productSlug: string): Promise<Product> {
  return apiClient<Product>(`/api/products/${productSlug}`)
}

export async function fetchCategories(): Promise<Category[]> {
  return apiClient<Category[]>('/api/categories')
}

export async function searchProducts(query: string): Promise<Product[]> {
  if (!query.trim()) return []
  return apiClient<Product[]>(`/api/products/search?q=${encodeURIComponent(query.trim())}`)
}

export async function downloadAdminProductsCsv(accessToken: string): Promise<void> {
  await downloadCsv({
    path: '/api/admin/products/export',
    accessToken,
    filename: 'products-export',
  })
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

export type StockType = 'IN_STOCK' | 'MADE_TO_ORDER' | 'ONE_OF_A_KIND'

export interface CreateProductPayload {
  title: string
  description: string
  price: number
  stock: number
  images: string[]
  slug: string
  categoryId: string
  sku?: string
  material?: string
  stockType?: StockType
  productionDays?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  diameterCm?: number
  weightGrams?: number
  beadSizeMm?: number
}

export async function createAdminProduct(
  payload: CreateProductPayload,
  accessToken: string,
): Promise<Product> {
  return apiClient<Product>('/api/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  })
}

export interface UpdateProductPayload {
  title?: string
  description?: string
  price?: number
  stock?: number
  images?: string[]
  slug?: string
  categoryId?: string
  sku?: string
  material?: string
  stockType?: StockType
  productionDays?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  diameterCm?: number
  weightGrams?: number
  beadSizeMm?: number
}

export async function updateAdminProduct(
  productSlug: string,
  payload: UpdateProductPayload,
  accessToken: string,
): Promise<Product> {
  return apiClient<Product>(`/api/products/${productSlug}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminProduct(productSlug: string, accessToken: string): Promise<void> {
  return apiClient<void>(`/api/products/${productSlug}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export type BulkProductAction = 'publish' | 'draft' | 'delete'

export interface BulkProductsActionPayload {
  ids: string[]
  action: BulkProductAction
}

export interface BulkProductsActionResult {
  affectedCount: number
}

// Returns the number of rows the server actually touched — selection may have
// gone stale between render and click.
export async function bulkUpdateAdminProducts(
  payload: BulkProductsActionPayload,
  accessToken: string,
): Promise<BulkProductsActionResult> {
  return apiClient<BulkProductsActionResult>('/api/admin/products/bulk', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
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

export interface InventoryItem extends Product {
  isLowStock: boolean
}

export interface InventoryResponse {
  threshold: number
  data: InventoryItem[]
}

export async function fetchAdminInventory(
  accessToken: string,
  params: { threshold?: number; lowStockOnly?: boolean } = {},
): Promise<InventoryResponse> {
  const searchParams = new URLSearchParams()
  if (params.threshold !== undefined) searchParams.set('threshold', String(params.threshold))
  if (params.lowStockOnly) searchParams.set('lowStockOnly', 'true')
  const queryString = searchParams.toString()
  return apiClient<InventoryResponse>(
    `/api/admin/inventory${queryString ? `?${queryString}` : ''}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
}

export async function fetchLowStockCount(
  accessToken: string,
  threshold = 3,
): Promise<{ count: number }> {
  return apiClient<{ count: number }>(
    `/api/admin/inventory/low-stock-count?threshold=${threshold}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
}

export async function updateAdminProductStock(
  productId: string,
  newStock: number,
  accessToken: string,
): Promise<Pick<Product, 'id' | 'slug' | 'title' | 'stock' | 'stockType'>> {
  return apiClient(`/api/admin/products/${productId}/stock`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ stock: newStock }),
  })
}
