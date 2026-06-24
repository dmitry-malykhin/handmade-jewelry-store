import { apiClient } from './client'

export interface SiteSettings {
  id: string
  storeName: string
  tagline: string
  contactEmail: string
  supportEmail: string
  instagramUrl: string | null
  pinterestUrl: string | null
  facebookUrl: string | null
  tiktokUrl: string | null
  returnPolicyDays: number
  estimatedDeliveryMinDays: number
  estimatedDeliveryMaxDays: number
  freeShippingThresholdCents: number
  createdAt: string
  updatedAt: string
}

export type UpdateSiteSettingsPayload = Partial<
  Omit<SiteSettings, 'id' | 'createdAt' | 'updatedAt'>
>

export async function fetchSiteSettings(): Promise<SiteSettings> {
  return apiClient<SiteSettings>('/api/settings')
}

export async function fetchAdminSiteSettings(accessToken: string): Promise<SiteSettings> {
  return apiClient<SiteSettings>('/api/admin/settings', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function updateAdminSiteSettings(
  payload: UpdateSiteSettingsPayload,
  accessToken: string,
): Promise<SiteSettings> {
  return apiClient<SiteSettings>('/api/admin/settings', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  })
}
