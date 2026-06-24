import { apiClient } from './client'

export interface LoyaltyBalance {
  balance: number
}

export type LoyaltyTransactionType = 'EARNED' | 'SPENT' | 'REVERSED'

export interface LoyaltyTransaction {
  id: string
  points: number
  type: LoyaltyTransactionType
  orderId: string | null
  note: string | null
  createdAt: string
}

export async function fetchLoyaltyBalance(accessToken: string): Promise<LoyaltyBalance> {
  return apiClient<LoyaltyBalance>('/api/loyalty/balance', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function fetchLoyaltyTransactions(accessToken: string): Promise<LoyaltyTransaction[]> {
  return apiClient<LoyaltyTransaction[]>('/api/loyalty/transactions', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

// 50% cap so Stripe fees stay payable in cash. Mirrors backend
// LoyaltyService.calculateMaxRedeemablePoints — keep both in sync.
export function calculateMaxRedeemablePoints(subtotalUsd: number): number {
  if (!Number.isFinite(subtotalUsd) || subtotalUsd <= 0) return 0
  return Math.floor(subtotalUsd * 100 * 0.5)
}
