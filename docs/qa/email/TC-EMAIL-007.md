# TC-EMAIL-007: Shipping Notification — `SHIPPED` without `trackingNumber`

- **Priority:** P1
- **Type:** Manual + Automated (Jest)
- **Automation:** [`apps/api/src/email/templates/shipping-notification.template.spec.ts`](../../../apps/api/src/email/templates/shipping-notification.template.spec.ts) — "omits the entire tracking block when trackingNumber is absent"

## Preconditions
- Order in `PROCESSING` status with `guestEmail` set

## Steps
1. `PATCH /orders/:id/status` with body `{"status":"SHIPPED"}` (no `trackingNumber`)

## Expected result
- Email is sent
- HTML body does NOT contain a `Tracking number` block — no empty rectangle rendered
