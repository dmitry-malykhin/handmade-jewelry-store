# TC-EMAIL-006: Shipping Notification — `SHIPPED` with `trackingNumber`

- **Priority:** P0
- **Type:** Manual + Automated (Jest)
- **Automation:** [`apps/api/src/email/templates/shipping-notification.template.spec.ts`](../../../apps/api/src/email/templates/shipping-notification.template.spec.ts) — "renders tracking number block when trackingNumber is provided"

## Preconditions
- Order in `PROCESSING` status with `guestEmail` set

## Steps
1. `PATCH /orders/:id/status` with body `{"status":"SHIPPED","trackingNumber":"TRK123456789"}`

## Expected result
- Email arrives with `Tracking number` block containing `TRK123456789`
- API log: `Email sent`
- Order status updates to `SHIPPED` in DB
