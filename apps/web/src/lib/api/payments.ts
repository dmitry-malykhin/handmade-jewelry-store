import { apiClient } from './client'

export interface CreatePaymentIntentPayload {
  orderId: string
}

export interface CreatedPaymentIntent {
  clientSecret: string
}

export async function createPaymentIntent(
  payload: CreatePaymentIntentPayload,
  authOptions: { accessToken?: string | null; orderAccessToken?: string | null } = {},
): Promise<CreatedPaymentIntent> {
  const headers: Record<string, string> = {}
  if (authOptions.accessToken) headers.Authorization = `Bearer ${authOptions.accessToken}`
  if (authOptions.orderAccessToken) headers['x-order-access-token'] = authOptions.orderAccessToken
  return apiClient<CreatedPaymentIntent>('/api/payments/intent', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers,
  })
}
