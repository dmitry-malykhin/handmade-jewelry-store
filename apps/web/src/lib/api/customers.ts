import { apiClient } from './client'
import type { OrderItem, OrderStatus } from './orders'
import { toQueryString } from './query-string'

export interface AdminCustomerSummary {
  id: string
  email: string
  createdAt: string
  totalOrders: number
  lifetimeValueUsd: number
  /** ISO timestamp of the most recent order across all statuses; null when none. */
  lastOrderAt: string | null
}

export interface AdminCustomersResponse {
  data: AdminCustomerSummary[]
  meta: {
    totalCount: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface CustomerOrder {
  id: string
  status: OrderStatus
  total: number
  subtotal: number
  shippingCost: number
  createdAt: string
  items: OrderItem[]
}

export interface CustomerAddress {
  id: string
  fullName: string
  addressLine1: string
  addressLine2?: string | null
  city: string
  state?: string | null
  postalCode: string
  country: string
  phone?: string | null
  isDefault: boolean
}

export interface AdminCustomerDetail {
  id: string
  email: string
  role: 'USER' | 'ADMIN'
  createdAt: string
  totalOrders: number
  lifetimeValueUsd: number
  orders: CustomerOrder[]
  addresses: CustomerAddress[]
}

export interface AdminCustomerQueryParams {
  page?: number
  limit?: number
  search?: string
}

export async function fetchAdminCustomers(
  params: AdminCustomerQueryParams,
  accessToken: string,
): Promise<AdminCustomersResponse> {
  return apiClient<AdminCustomersResponse>(`/api/admin/customers${toQueryString(params)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function fetchAdminCustomerById(
  userId: string,
  accessToken: string,
): Promise<AdminCustomerDetail> {
  return apiClient<AdminCustomerDetail>(`/api/admin/customers/${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
