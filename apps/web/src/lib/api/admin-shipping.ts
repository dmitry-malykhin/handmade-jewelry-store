import { apiClient } from './client'

export type ShippingCarrier = 'USPS' | 'FedEx' | 'UPS' | 'DHL'

export interface ShippingStatus {
  isLiveMode: boolean
}

export interface PurchaseLabelPayload {
  carrier: ShippingCarrier
  insuranceCents?: number
}

export interface PurchaseLabelResponse {
  shipmentId: string
  trackerId: string
  trackingNumber: string
  labelUrl: string
  carrier: ShippingCarrier
  estimatedDeliveryAt: string | null
  insuranceCents: number
  isLiveMode: boolean
}

export async function fetchShippingStatus(accessToken: string): Promise<ShippingStatus> {
  return apiClient<ShippingStatus>('/api/admin/shipping/status', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function purchaseAdminShippingLabel(
  orderId: string,
  payload: PurchaseLabelPayload,
  accessToken: string,
): Promise<PurchaseLabelResponse> {
  return apiClient<PurchaseLabelResponse>(`/api/admin/shipping/orders/${orderId}/label`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
