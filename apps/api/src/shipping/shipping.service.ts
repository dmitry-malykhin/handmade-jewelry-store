import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { OrderStatus } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { isValidOrderStatusTransition } from '../orders/order-status.transitions'
import { EASYPOST_CLIENT } from './easypost-client.token'
import type { EasyPostClient, PurchaseLabelInput, TrackerEvent } from './easypost-client.interface'

const GRAMS_PER_OUNCE = 28.3495
// EasyPost rejects parcels under 0.01 oz; we send a sensible default for
// jewelry that doesn't have weight recorded yet (most pieces sit under 50g).
const FALLBACK_WEIGHT_OUNCES = 1

interface ShippingAddressSnapshot {
  fullName?: string
  addressLine1?: string
  addressLine2?: string | null
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

interface ProductWeightSnapshot {
  weightGrams?: number | null
}

export interface PurchaseLabelOptions {
  orderId: string
  carrier: PurchaseLabelInput['carrier']
  insuranceCents?: number
}

export interface PurchaseLabelOutcome {
  shipmentId: string
  trackerId: string
  trackingNumber: string
  labelUrl: string
  carrier: PurchaseLabelInput['carrier']
  estimatedDeliveryAt: Date | null
  insuranceCents: number
  isLiveMode: boolean
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name)

  constructor(
    private readonly prismaService: PrismaService,
    @Inject(EASYPOST_CLIENT) private readonly easyPostClient: EasyPostClient,
  ) {}

  /** Whether the integration is talking to the real EasyPost API. */
  getStatus(): { isLiveMode: boolean } {
    return { isLiveMode: this.easyPostClient.isLiveMode }
  }

  /**
   * Buys a shipping label for the given order. On success:
   *  - Order is updated with shipment/tracker ids, tracking number, carrier
   *    and the hosted label URL.
   *  - The function does NOT transition order status to SHIPPED — admin still
   *    confirms via the existing status workflow (keeps the audit trail
   *    explicit and lets the admin batch a stack of labels before shipping).
   */
  async purchaseLabel(options: PurchaseLabelOptions): Promise<PurchaseLabelOutcome> {
    // Defensive production guard. The mock EasyPost client fabricates MOCK…
    // tracking numbers + placeholder PDF URLs; if it ran in production the
    // customer would receive a shipping email pointing at a fake tracking link.
    // The UI already disables the purchase button when isLiveMode=false, but
    // we don't trust the UI alone — a direct POST from a leaked admin token,
    // a stale browser tab or curl must also be refused.
    if (process.env.NODE_ENV === 'production' && !this.easyPostClient.isLiveMode) {
      this.logger.error(
        `Refusing purchaseLabel for order ${options.orderId} — EasyPost is in dry-run mode in production. Set EASYPOST_API_KEY to enable.`,
      )
      throw new ServiceUnavailableException(
        'Shipping label purchase is unavailable: EasyPost is not configured for live mode. Contact the operator.',
      )
    }

    const order = await this.prismaService.order.findUnique({
      where: { id: options.orderId },
      include: { items: true },
    })
    if (!order) throw new NotFoundException(`Order with id "${options.orderId}" not found`)
    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PROCESSING) {
      throw new BadRequestException(
        `Cannot purchase label for order in status ${order.status} — order must be PAID or PROCESSING`,
      )
    }
    if (order.labelUrl) {
      throw new BadRequestException('A label has already been purchased for this order')
    }

    const orderTotalCents = Math.round(Number(order.total) * 100)
    const insuranceCents = options.insuranceCents ?? 0
    if (insuranceCents < 0 || insuranceCents > orderTotalCents) {
      throw new BadRequestException(
        `Insurance must be between 0 and order total (${orderTotalCents}c)`,
      )
    }

    const address = (order.shippingAddress ?? {}) as ShippingAddressSnapshot
    if (
      !address.fullName ||
      !address.addressLine1 ||
      !address.city ||
      !address.state ||
      !address.postalCode ||
      !address.country
    ) {
      throw new BadRequestException(
        'Order shipping address is incomplete — cannot purchase a label',
      )
    }

    const weightOunces = calculateParcelOunces(order.items)

    const result = await this.easyPostClient.purchaseLabel({
      orderId: order.id,
      carrier: options.carrier,
      toAddress: {
        name: address.fullName,
        street1: address.addressLine1,
        street2: address.addressLine2 ?? null,
        city: address.city,
        state: address.state,
        zip: address.postalCode,
        country: address.country,
      },
      parcel: { weightOunces },
      insuranceCents,
    })

    await this.prismaService.order.update({
      where: { id: order.id },
      data: {
        easypostShipmentId: result.shipmentId,
        easypostTrackerId: result.trackerId,
        labelUrl: result.labelUrl,
        trackingNumber: result.trackingNumber,
        shippingCarrier: options.carrier,
        estimatedDeliveryAt: result.estimatedDeliveryAt,
        shippingInsuranceCents: insuranceCents,
      },
    })

    return {
      shipmentId: result.shipmentId,
      trackerId: result.trackerId,
      trackingNumber: result.trackingNumber,
      labelUrl: result.labelUrl,
      carrier: options.carrier,
      estimatedDeliveryAt: result.estimatedDeliveryAt,
      insuranceCents,
      isLiveMode: this.easyPostClient.isLiveMode,
    }
  }

  /**
   * Handles a webhook delivery from EasyPost. The body is parsed, validated
   * and (when it's a tracker update we care about) used to advance the
   * matching order's status.
   *
   * Returns `{ processed: false }` for any payload that we deliberately
   * ignore — non-tracker events, unknown statuses, missing matching order.
   * Returns `{ processed: true, deliveredOrderId }` when an order has been
   * transitioned to DELIVERED.
   */
  async handleWebhook(
    rawBody: string,
    signature: string | undefined,
  ): Promise<{ processed: boolean; deliveredOrderId?: string }> {
    if (!this.easyPostClient.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawBody)
    } catch {
      throw new BadRequestException('Webhook body is not valid JSON')
    }

    const event: TrackerEvent | null = this.easyPostClient.parseTrackerEvent(parsed)
    if (!event) return { processed: false }

    if (event.status !== 'delivered') {
      this.logger.log(
        `Ignoring tracker.updated trackerId=${event.trackerId} status=${event.status}`,
      )
      return { processed: false }
    }

    const order = await this.prismaService.order.findFirst({
      where: { easypostTrackerId: event.trackerId },
    })
    if (!order) {
      this.logger.warn(`No order matches easypostTrackerId=${event.trackerId}`)
      return { processed: false }
    }

    if (order.status === OrderStatus.DELIVERED) {
      // Webhook delivery is at-least-once; ignore duplicates without thrashing
      // the status history.
      return { processed: false }
    }

    if (!isValidOrderStatusTransition(order.status, OrderStatus.DELIVERED)) {
      this.logger.warn(
        `Cannot auto-transition order ${order.id} from ${order.status} to DELIVERED — webhook ignored`,
      )
      return { processed: false }
    }

    await this.prismaService.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: OrderStatus.DELIVERED,
            note: 'Auto-transitioned from carrier webhook',
            createdBy: 'system',
          },
        },
      },
    })

    return { processed: true, deliveredOrderId: order.id }
  }
}

function calculateParcelOunces(
  items: ReadonlyArray<{ productSnapshot: unknown; quantity: number }>,
): number {
  let totalGrams = 0
  for (const item of items) {
    const snapshot = item.productSnapshot as ProductWeightSnapshot | null
    const weightGrams = snapshot?.weightGrams ?? null
    if (weightGrams && weightGrams > 0) totalGrams += weightGrams * item.quantity
  }
  if (totalGrams === 0) return FALLBACK_WEIGHT_OUNCES
  return Math.max(0.1, Number((totalGrams / GRAMS_PER_OUNCE).toFixed(2)))
}
