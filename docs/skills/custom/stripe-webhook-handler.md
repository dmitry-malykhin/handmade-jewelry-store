# stripe-webhook-handler (custom)

**Effort:** medium. **Impact:** high.

## Что делает

Скаффолд handler для Stripe webhook event с:
- Signature verification через `stripe.webhooks.constructEvent`
- Идемпотентность через таблицу `WebhookEvent` (по `event.id`)
- Маппинг event → order status согласно docs/08
- Логирование через Winston с `correlationId`
- Обновление `OrderStatusHistory`

## Trigger

- User: `/stripe-webhook payment_intent.succeeded`

## SKILL.md

````markdown
---
name: stripe-webhook-handler
description: Use when adding a Stripe webhook handler (payment_intent.succeeded, charge.refunded, checkout.session.completed, etc.). Scaffolds the handler with signature verification, idempotency check, order status transition per docs/08, structured Winston logging, and OrderStatusHistory entry.
---

# stripe-webhook-handler

## Inputs

1. **Event name** — full Stripe event name (e.g. `payment_intent.succeeded`).
2. **Order status mapping** — what new OrderStatus this should set. If unclear — read docs/08_ORDER_STATUS_MODEL.md transition table.

## Files affected

- `apps/api/src/payments/webhooks/stripe-webhook.controller.ts` — add handler method
- `apps/api/src/payments/webhooks/handlers/<event-snake>.handler.ts` — new file
- `apps/api/src/payments/webhooks/webhook-event.entity.ts` — Prisma model (must exist)

## Template

### Handler

```ts
import { Injectable, Logger } from '@nestjs/common'
import { Stripe } from 'stripe'
import { PrismaService } from '../../prisma/prisma.service'
import { OrderStatus } from '@prisma/client'

@Injectable()
export class PaymentIntentSucceededHandler {
  private readonly logger = new Logger(PaymentIntentSucceededHandler.name)

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: Stripe.Event): Promise<void> {
    const { id: eventId, type, data } = event
    const intent = data.object as Stripe.PaymentIntent

    // Idempotency
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { stripeEventId: eventId },
    })
    if (existing) {
      this.logger.log({ eventId, message: 'already processed, skipping' })
      return
    }

    // Find order
    const order = await this.prisma.order.findFirst({
      where: { stripePaymentIntentId: intent.id },
    })
    if (!order) {
      this.logger.warn({ eventId, intentId: intent.id, message: 'order not found' })
      throw new Error('Order not found')
    }

    // Status transition (whitelist enforced by service)
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      })
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: OrderStatus.PAID,
          source: 'stripe-webhook',
          stripeEventId: eventId,
        },
      })
      await tx.webhookEvent.create({
        data: {
          stripeEventId: eventId,
          type,
          processedAt: new Date(),
        },
      })
    })

    this.logger.log({ eventId, orderId: order.id, message: 'order marked PAID' })
  }
}
```

### Controller hook

```ts
@Post()
@HttpCode(200)
async handleWebhook(
  @Req() req: RawBodyRequest<Request>,
  @Headers('stripe-signature') signature: string,
) {
  let event: Stripe.Event
  try {
    event = this.stripeService.constructEvent(req.rawBody!, signature)
  } catch (error) {
    this.logger.error({ message: 'signature verification failed', error })
    throw new BadRequestException('Invalid signature')
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      await this.paymentIntentSucceededHandler.handle(event)
      break
    case 'payment_intent.payment_failed':
      await this.paymentIntentFailedHandler.handle(event)
      break
    // ... other events
    default:
      this.logger.log({ type: event.type, message: 'unhandled event type' })
  }

  return { received: true }
}
```

## Hard rules

1. **Always verify signature** before processing — never skip
2. **Idempotency via `stripeEventId` unique constraint** — Stripe retries failed deliveries
3. **Use `prisma.$transaction`** for status + history + event marker — all or nothing
4. **Never throw on unhandled event** — return 200 with log (otherwise Stripe retries forever)
5. **Log with `correlationId`** + `stripeEventId` for trace
6. **Whitelist-enforced status transitions** — call OrderService method, not direct prisma.order.update where possible
7. **Never expose raw Stripe error** to client — return generic 400

## Procedure

1. Identify event semantics from Stripe docs (https://docs.stripe.com/api/events/types)
2. Look up corresponding status transition in [docs/08_ORDER_STATUS_MODEL.md](../../08_ORDER_STATUS_MODEL.md)
3. Generate handler file
4. Wire into controller switch
5. Add test: `apps/api/test/webhooks/<event>.spec.ts` — happy path + idempotency + missing order
6. If a new `OrderStatus` value is needed — invoke `/prisma-migrate-safe`
````

## Зависимости

- Stripe SDK
- Prisma models: `Order`, `OrderStatusHistory`, `WebhookEvent`
- Winston logger
- docs/08 — transition table

## Источник

- docs/08_ORDER_STATUS_MODEL.md
- docs/runbooks/stripe-bnpl-setup.md
- https://docs.stripe.com/webhooks
