import { apiClient } from './client'

export interface SavedAddress {
  id: string
  fullName: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string | null
  postalCode: string
  country: string
  phone: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface UpsertAddressPayload {
  fullName: string
  addressLine1: string
  addressLine2?: string
  city: string
  state?: string
  postalCode: string
  country: string
  phone?: string
  isDefault?: boolean
}

const BASE_URL = '/api/users/me/addresses'

export async function fetchMyAddresses(accessToken: string): Promise<SavedAddress[]> {
  return apiClient<SavedAddress[]>(BASE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function createAddress(
  accessToken: string,
  payload: UpsertAddressPayload,
): Promise<SavedAddress> {
  return apiClient<SavedAddress>(BASE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  })
}

export async function updateAddress(
  accessToken: string,
  addressId: string,
  payload: UpsertAddressPayload,
): Promise<SavedAddress> {
  return apiClient<SavedAddress>(`${BASE_URL}/${addressId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  })
}

export async function setDefaultAddress(
  accessToken: string,
  addressId: string,
): Promise<SavedAddress> {
  return apiClient<SavedAddress>(`${BASE_URL}/${addressId}/default`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function deleteAddress(accessToken: string, addressId: string): Promise<void> {
  await apiClient<void>(`${BASE_URL}/${addressId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
