# TC-EMAIL-010: Refund Processed — partial refund shows correct amount

- **Priority:** P1
- **Type:** Manual + Automated (Jest)
- **Automation:** [`apps/api/src/email/templates/refund-processed.template.spec.ts`](../../../apps/api/src/email/templates/refund-processed.template.spec.ts) — "renders a partial refund amount exactly"

## Preconditions
- Order with full charge amount (e.g. $49.98) in `DELIVERED` status

## Steps
1. `stripe refunds create --charge ch_xxxx --amount 2000` ($20.00 partial)

## Expected result
- Email displays `$20.00` (the refunded amount, NOT the order total)
- Order status updates to `PARTIALLY_REFUNDED` (or remains `DELIVERED` per current model — see [docs/08_ORDER_STATUS_MODEL.md](../../08_ORDER_STATUS_MODEL.md))
