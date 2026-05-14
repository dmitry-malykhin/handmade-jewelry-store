# TC-EMAIL-002: Order Confirmation — no `guestEmail` → email silently skipped

- **Priority:** P1
- **Type:** Automated (Jest)
- **Automation:** [`apps/api/src/stripe/stripe-webhooks.service.spec.ts`](../../../apps/api/src/stripe/stripe-webhooks.service.spec.ts) — covered by the existing "sends order confirmation email to guest" case under the inverse path

## Preconditions
- An order is created without `guestEmail` (either `userId` is set with no fallback email, or both are null)

## Steps
1. Trigger `payment_intent.succeeded` for an order with no `guestEmail`

## Expected result
- No call to the Resend API
- No error thrown
- No `WARN` log entry
- Webhook responds `200 OK`
- Order status updates to `PAID` in the DB
