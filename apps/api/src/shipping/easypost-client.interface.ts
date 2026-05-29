/**
 * Carrier-agnostic shape of an EasyPost-style shipping integration.
 *
 * The MVP ships with the mock implementation only — see
 * `easypost-mock.client.ts`. The real client (the `easypost` npm package) will
 * be added in a follow-up PR once we have a paid account and a public webhook
 * URL. Both implementations share this interface so swapping them later is
 * one provider edit.
 */
export interface PurchaseLabelInput {
  orderId: string
  carrier: 'USPS' | 'FedEx' | 'UPS' | 'DHL'
  toAddress: {
    name: string
    street1: string
    street2?: string | null
    city: string
    state: string
    zip: string
    country: string
  }
  parcel: {
    weightOunces: number // EasyPost expects ounces; converted from grams server-side
  }
  insuranceCents: number // 0 = no insurance
}

export interface PurchaseLabelResult {
  shipmentId: string
  trackerId: string
  trackingNumber: string
  labelUrl: string
  estimatedDeliveryAt: Date | null
}

export type TrackerStatus =
  | 'pre_transit'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failure'

export interface TrackerEvent {
  trackerId: string
  status: TrackerStatus
  carrier: string
  trackingNumber: string
}

export interface EasyPostClient {
  /** Returns `true` when the client is configured to hit the real EasyPost API. */
  readonly isLiveMode: boolean

  purchaseLabel(input: PurchaseLabelInput): Promise<PurchaseLabelResult>

  /**
   * Verifies a webhook delivery. The mock implementation accepts everything;
   * the real implementation must check the HMAC signature header.
   */
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean

  /**
   * Parses an EasyPost webhook payload into a normalised TrackerEvent.
   * Returns `null` when the payload is not a tracker update we care about
   * (label.purchased, address.verified, etc. are ignored).
   */
  parseTrackerEvent(rawPayload: unknown): TrackerEvent | null
}
