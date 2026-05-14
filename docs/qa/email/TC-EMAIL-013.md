# TC-EMAIL-013: Edge case — Decimal precision in email amounts

- **Priority:** P2
- **Type:** Automated (Jest)
- **Automation:** [`apps/api/src/email/templates/order-confirmation.template.spec.ts`](../../../apps/api/src/email/templates/order-confirmation.template.spec.ts) — "formats prices to two decimals without floating-point artifacts"

## Preconditions
- Item price = `33.333333...` after `Decimal.toNumber()` (e.g. a discount split across items produces a repeating fraction)

## Steps
1. Render `buildOrderConfirmationEmail` with that item

## Expected result
- Email displays `$33.33`
- No floating point artifacts like `$33.330000000001` or `$33.33000000000003`
- `Intl.NumberFormat` with currency style handles the rounding
