# TC-EMAIL-001: Order Confirmation — happy path guest checkout

- **Priority:** P0
- **Type:** Manual + Automated (Jest)
- **Automation:** [`apps/api/src/email/templates/order-confirmation.template.spec.ts`](../../../apps/api/src/email/templates/order-confirmation.template.spec.ts), [`apps/api/src/stripe/stripe-webhooks.service.spec.ts`](../../../apps/api/src/stripe/stripe-webhooks.service.spec.ts)

## Preconditions
- API running locally
- Stripe CLI listening: `pnpm stripe:listen`
- A product exists in the database
- `RESEND_API_KEY` set and valid

## Steps
1. `POST /api/orders` with `guestEmail: "test@example.com"` and valid items
2. `POST /api/payments/create-intent` with `orderId` from step 1
3. Confirm payment with Stripe test card `4242 4242 4242 4242`
4. Wait for `payment_intent.succeeded` event in the Stripe CLI terminal

## Expected result
- API log: `Order {id} transitioned to PAID`
- API log: `Email sent to test@example.com — "Order confirmed — #XXXXXXXX"`
- Resend Dashboard: email visible with status `Delivered`
- Email body contains: `orderId` (last 8 chars uppercase), item title, quantity, price per line, subtotal, shipping, total, full shipping address
