# TC-EMAIL-012: Edge case — order not found after `payment_intent.succeeded`

- **Priority:** P1
- **Type:** Automated (Jest)
- **Automation:** [`apps/api/src/stripe/stripe-webhooks.service.spec.ts`](../../../apps/api/src/stripe/stripe-webhooks.service.spec.ts) — "skips when no payment record found for PaymentIntent"

## Preconditions
- `prisma.order.findUnique` returns `null` for the order linked to a webhook event (deleted order, race condition, or corrupt data)

## Steps
1. Trigger `payment_intent.succeeded` for an order that no longer exists

## Expected result
- Method returns without throwing
- Webhook responds `200` (so Stripe stops retrying)
- No Resend API call attempted
- Warning log entry for traceability
