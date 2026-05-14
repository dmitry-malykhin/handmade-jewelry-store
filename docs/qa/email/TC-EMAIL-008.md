# TC-EMAIL-008: Shipping Notification — invalid status transition → no email

- **Priority:** P1
- **Type:** Automated (Jest)
- **Automation:** [`apps/api/src/orders/`](../../../apps/api/src/orders/) — order status transition guard

## Preconditions
- Order in `PENDING` status

## Steps
1. `PATCH /orders/:id/status` with body `{"status":"SHIPPED"}`

## Expected result
- API responds `400 BadRequestException` (PENDING → SHIPPED is not a valid transition; see [docs/08_ORDER_STATUS_MODEL.md](../../08_ORDER_STATUS_MODEL.md))
- `sendShippingNotification` is not called
- Order status remains `PENDING` in DB
