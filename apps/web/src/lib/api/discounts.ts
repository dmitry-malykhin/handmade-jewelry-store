import { apiClient } from './client'

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT'

export interface Discount {
  id: string
  code: string
  type: DiscountType
  value: number
  minOrderCents: number
  maxUsages: number | null
  usageCount: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateDiscountPayload {
  code: string
  type: DiscountType
  value: number
  minOrderCents?: number
  maxUsages?: number
  expiresAt?: string
  isActive?: boolean
}

export interface UpdateDiscountPayload {
  isActive?: boolean
  minOrderCents?: number
  maxUsages?: number | null
  expiresAt?: string | null
}

export async function fetchAdminDiscounts(accessToken: string): Promise<Discount[]> {
  return apiClient<Discount[]>('/api/admin/discounts', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function createAdminDiscount(
  payload: CreateDiscountPayload,
  accessToken: string,
): Promise<Discount> {
  return apiClient<Discount>('/api/admin/discounts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  })
}

export async function updateAdminDiscount(
  discountId: string,
  payload: UpdateDiscountPayload,
  accessToken: string,
): Promise<Discount> {
  return apiClient<Discount>(`/api/admin/discounts/${discountId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminDiscount(discountId: string, accessToken: string): Promise<void> {
  return apiClient<void>(`/api/admin/discounts/${discountId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
