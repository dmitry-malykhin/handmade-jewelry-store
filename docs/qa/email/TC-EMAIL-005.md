# TC-EMAIL-005: Order Confirmation — `productSnapshot` missing title → fallback text

- **Priority:** P2
- **Type:** Automated (Jest)
- **Automation:** [`apps/api/src/email/templates/order-confirmation.template.spec.ts`](../../../apps/api/src/email/templates/order-confirmation.template.spec.ts)

## Preconditions
- An order item exists with `productSnapshot = null` or `productSnapshot = {}` (corrupted historical data)

## Steps
1. Render `buildOrderConfirmationEmail` for the order

## Expected result
- Email renders `"Jewelry piece"` in the item row
- No crash
- No `undefined` token leaks into the HTML
