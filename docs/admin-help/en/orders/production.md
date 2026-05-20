# Production queue

## What this is for

A workshop view of orders that contain made-to-order or one-of-a-kind items.
These pieces are produced **after** the customer pays, so the queue shows
what's currently on your bench and how close each deadline is.

The deadline is computed at checkout time from the product's
`productionDays` field — see the per-order **Deadline** column below.

This page is the place to:

- See what to work on next (by deadline)
- Bump status as you start / finish each piece
- Keep a freeform note per order (e.g. "needs blue moonstone, ordered Mon")

## Fields & controls

### Deadline
- **Purpose**: Days remaining until the promised production date.
- **Visual coding**:
  - Red **Overdue** badge — past deadline
  - Red **Today** badge — due today
  - Amber pill — 1–3 days remaining
  - Green pill — 4+ days remaining
- **How it's computed**: Order's `productionDeadlineAt` (set at checkout from
  the slowest item's `productionDays`) minus now, floored to whole days.

### Status (per row)
- **Purpose**: Where this order is in production.
- **Values**:
  - `QUEUED` — not yet started
  - `IN_PRODUCTION` — actively being made
  - `READY_TO_SHIP` — finished, awaiting packing
- **How to fill**: Select from dropdown → instant write.
- **Consequences**: `READY_TO_SHIP` doesn't auto-ship — you still go to the
  order detail to save tracking and move the **order** status to SHIPPED.
- **Recommended flow**: QUEUED → IN_PRODUCTION (when you pick up tools) →
  READY_TO_SHIP (piece is done, photographed, boxed).

### Notes
- **Purpose**: Freeform per-order memo. 500 chars.
- **How to fill**: Type → Enter or click out → saves automatically.
- **Consequences**: Visible only to admin. Customer never sees this.
- **Use cases**: Material order tracking, blocker notes, customer
  customisation requests captured separately from the line item.

## Common scenarios

**Morning workshop check**
Sort visually by deadline (table is already deadline-ordered) → work
top-down. Anything red goes first.

**Material ordered, blocked for a week**
Status stays `QUEUED`. Note: "waiting on 6mm rose quartz from supplier,
ETA Fri". Re-check on Friday.

**Finished a piece**
Status → `READY_TO_SHIP`. Open the order detail page, save tracking, mark
the order `SHIPPED`. The production row stays at READY_TO_SHIP until the
order itself transitions out of made-to-order territory.

## Edge cases & gotchas

- **A row only appears if the order has at least one made-to-order line
  item.** Pure in-stock orders never enter this queue.
- **The "Items" column counts made-to-order line items only** — not the
  total cart size.
- **Deadline of 0 / negative** doesn't auto-flag the customer or send any
  email. It's purely your visual cue; you decide how to handle delay
  (refund vs notify and continue).
- **Notes don't appear on the customer-facing order** — they're internal.
- **Order cancelled mid-production**: row stays here until you remove the
  made-to-order items via order management. Currently there's no inline
  way to dismiss a row except by changing the underlying order status.

## Related

- [Orders overview](overview.md)
- [Order detail](detail.md) — where tracking and customer-visible status live
- [Edit product](../products/edit.md) — set `productionDays` per product
