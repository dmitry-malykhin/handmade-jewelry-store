# TC-EMAIL-009: Refund Processed — full refund happy path

- **Priority:** P0
- **Type:** Manual
- **Why:** Refund confirmation is the customer's only assurance that a chargeback dispute isn't needed. Silent failure here = direct dispute fees + reputation damage.

## Preconditions
- Order in `DELIVERED` status
- Payment in `SUCCEEDED` status
- `guestEmail` set on the order

## Steps
1. `stripe refunds create --charge ch_xxxx` for the full charge amount

## Expected result
- Webhook `charge.refunded` received
- API log: `Order {id} refunded — $49.98`
- Email arrives with refund amount in green (#22a722)
- Email contains correct `orderId` (last 8 chars uppercase)
- Order status updates to `REFUNDED` in DB
