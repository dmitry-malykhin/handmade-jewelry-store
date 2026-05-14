# TC-EMAIL-011: Refund Processed — duplicate `charge.refunded` → idempotency

- **Priority:** P1
- **Type:** Automated (Jest)
- **Automation:** [`apps/api/src/stripe/stripe-webhooks.service.spec.ts`](../../../apps/api/src/stripe/stripe-webhooks.service.spec.ts) — refund idempotency case

## Preconditions
- Payment already refunded (one `charge.refunded` already processed)

## Steps
1. Resend the same `charge.refunded` event via `stripe events resend evt_xxxxx`

## Expected result
- API log: `Charge already refunded — skipping`
- Resend API not called a second time
- Webhook responds `200`
