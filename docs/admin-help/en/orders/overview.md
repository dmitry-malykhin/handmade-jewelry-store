# Orders

## What this is for

The orders table is the single source of truth for everything customers have
bought. Every Stripe-successful checkout lands here and progresses through a
linear state machine until DELIVERED (or REFUNDED / CANCELLED).

You use this page to:

- See incoming orders at a glance
- Move an order forward in its lifecycle (PAID → PROCESSING → SHIPPED → DELIVERED)
- Filter by status to find what needs your attention today

For per-order work (tracking number, refund, full address, line items) open
the detail page via **View** — see [Order detail](detail.md).

## Fields & controls

### Status filter
- **Purpose**: Narrow the table to a single status.
- **How to fill**: Pick from the dropdown. `All` shows everything.
- **Consequences**: Page resets to 1. The list refreshes via TanStack Query.
- **Recommended default**: `All` for daily review; `PAID` when you sit down to
  fulfil orders; `SHIPPED` to check delivery progress.

### Status badge (in-row dropdown)
- **Purpose**: Click an order's status badge → choose the next allowed status.
- **How to fill**: Only valid transitions are offered (see state machine below).
- **Consequences**: Immediate write. The customer-facing status updates instantly.
  No confirmation — undo by transitioning to a later state or via refund flow.

### View link
- **Purpose**: Open the detail page for full address, line items, timeline,
  tracking and refund controls.

## State machine

Allowed transitions (mirrored from backend whitelist):

```
PENDING            → PAID, CANCELLED
PAID               → PROCESSING, CANCELLED
PROCESSING         → SHIPPED, CANCELLED
SHIPPED            → DELIVERED
DELIVERED          → REFUNDED, PARTIALLY_REFUNDED
CANCELLED          → REFUNDED, PARTIALLY_REFUNDED
REFUNDED           → (terminal)
PARTIALLY_REFUNDED → (terminal)
```

`PENDING → PAID` is automatic via the Stripe webhook — you should almost never
do that transition manually.

## Common scenarios

**Morning routine**
Filter `PAID` → for each row, open detail → pack → save tracking number →
status auto-bumps to `SHIPPED`.

**Customer wrote that the parcel arrived**
Find the order (filter `SHIPPED` + search by email in detail) → set
`DELIVERED`. Loyalty points are credited at this transition.

**Cancel an unpaid order**
`PENDING → CANCELLED` from the table dropdown. No payment to refund —
nothing happens on Stripe.

## Edge cases & gotchas

- **Order ID column** shows only the last 8 chars; click **View** to see the
  full UUID in the URL bar.
- **Customer column** shows `guestEmail` for guest checkouts. Registered
  customers show their email too — the type isn't visible here, only in the
  detail page.
- **Pagination** is 20/page. With a busy week you'll have several pages —
  use the status filter rather than scrolling.

## Related

- [Order detail](detail.md) — per-order workflow
- [Refunds ledger](refunds.md) — read-only history of every refund
- [Production queue](production.md) — made-to-order pieces in WIP
