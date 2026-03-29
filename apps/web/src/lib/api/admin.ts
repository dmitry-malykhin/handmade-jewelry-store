import type { AdminStats } from '@jewelry/shared'
import { apiClient } from './client'

export type { AdminStats }

export async function fetchAdminStats(accessToken: string): Promise<AdminStats> {
  return apiClient<AdminStats>('/api/admin/stats', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
