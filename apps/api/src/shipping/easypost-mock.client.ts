import { Injectable, Logger } from '@nestjs/common'
import type {
  EasyPostClient,
  PurchaseLabelInput,
  PurchaseLabelResult,
  TrackerEvent,
  TrackerStatus,
} from './easypost-client.interface'

const TRACKER_STATUSES: ReadonlySet<TrackerStatus> = new Set([
  'pre_transit',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failure',
])

/**
 * Mock EasyPost client used in dry-run mode (no EASYPOST_API_KEY).
 *
 * - `purchaseLabel` fabricates deterministic ids + a placeholder label URL so
 *   the admin UI can be exercised end-to-end without a real account.
 * - `verifyWebhookSignature` accepts anything — webhook endpoint guards on
 *   `isLiveMode` to decide whether to enforce signature checks.
 * - `parseTrackerEvent` understands the canonical EasyPost payload shape so
 *   the real client's parser can be dropped in unchanged.
 */
@Injectable()
export class EasypostMockClient implements EasyPostClient {
  readonly isLiveMode = false
  private readonly logger = new Logger(EasypostMockClient.name)

  async purchaseLabel(input: PurchaseLabelInput): Promise<PurchaseLabelResult> {
    // Last-line-of-defence visibility. ShippingService already throws 503 in
    // production, but if any code path bypasses it (a future caller, a fresh
    // controller, a script) the WARN gets surfaced in Sentry/log aggregation
    // and we hear about it instead of silently shipping fake tracking numbers.
    if (process.env.NODE_ENV === 'production') {
      this.logger.warn(
        `[mock-in-production] purchaseLabel called against the mock EasyPost client. orderId=${input.orderId} carrier=${input.carrier}. This should never happen — investigate and configure EASYPOST_API_KEY.`,
      )
    }

    this.logger.log(
      `[dry-run] purchaseLabel orderId=${input.orderId} carrier=${input.carrier} insuranceCents=${input.insuranceCents}`,
    )
    const seed = input.orderId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'mock'
    const trackingNumber = `MOCK${seed.toUpperCase().padEnd(8, '0')}`
    const estimatedDeliveryAt = new Date()
    estimatedDeliveryAt.setDate(estimatedDeliveryAt.getDate() + 5)

    return {
      shipmentId: `shp_mock_${seed}`,
      trackerId: `trk_mock_${seed}`,
      trackingNumber,
      // Placeholder URL — real client returns a hosted PDF from EasyPost CDN.
      labelUrl: `https://example.test/mock-labels/${seed}.pdf`,
      estimatedDeliveryAt,
    }
  }

  verifyWebhookSignature(): boolean {
    // No secret in dry-run — accept everything. Live mode replaces this with
    // an HMAC check against process.env.EASYPOST_WEBHOOK_SECRET.
    return true
  }

  parseTrackerEvent(rawPayload: unknown): TrackerEvent | null {
    if (!isRecord(rawPayload)) return null

    // EasyPost wraps the actual object in `result` and uses `description` for
    // the event type (e.g. "tracker.updated").
    const description = rawPayload['description']
    if (description !== 'tracker.updated') return null

    const result = rawPayload['result']
    if (!isRecord(result)) return null

    const trackerId = typeof result['id'] === 'string' ? (result['id'] as string) : null
    const status = typeof result['status'] === 'string' ? (result['status'] as string) : null
    const trackingNumber =
      typeof result['tracking_code'] === 'string' ? (result['tracking_code'] as string) : null
    const carrier = typeof result['carrier'] === 'string' ? (result['carrier'] as string) : null

    if (!trackerId || !status || !trackingNumber || !carrier) return null
    if (!TRACKER_STATUSES.has(status as TrackerStatus)) return null

    return {
      trackerId,
      status: status as TrackerStatus,
      carrier,
      trackingNumber,
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
