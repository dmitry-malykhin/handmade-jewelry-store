# TC-EMAIL-004: Order Confirmation — duplicate webhook → idempotency guard

- **Priority:** P1
- **Type:** Manual + Automated (Jest)
- **Automation:** [`apps/api/src/stripe/stripe-webhooks.service.spec.ts`](../../../apps/api/src/stripe/stripe-webhooks.service.spec.ts) — "skips processing when payment is already SUCCEEDED (idempotency)"

## Preconditions
- TC-EMAIL-001 already completed for an event you can resend

## Steps
1. Identify the `evt_*` ID from the original happy path run in Stripe CLI output
2. Run `stripe events resend evt_xxxxx`

## Expected result
- API log: `PaymentIntent already processed — skipping`
- Resend API not called
- No duplicate email arrives in the inbox
