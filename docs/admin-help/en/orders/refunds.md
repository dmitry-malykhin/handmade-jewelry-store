# Refunds ledger

## What this is for

Read-only history of every refund issued through the admin. One row per
refunded or partially-refunded order, sorted newest first.

You **don't issue refunds here** — refunds are created from the per-order
detail page via the **Issue refund** button. This page exists for:

- Accounting reconciliation (what did we pay back this month?)
- Spotting patterns (too many `ITEM_DAMAGED` for one product → quality issue)
- Quick lookup ("which refund was for that Klarna order last Tuesday?")

## Columns

| Column | Meaning |
|---|---|
| **Order ID** | Last 8 chars, clickable → order detail page |
| **Customer** | Guest email; `—` for registered users (privacy in ledger view) |
| **Amount** | USD refunded (sum if multiple partial refunds on same order) |
| **Reason** | Selected from the dropdown when refund was issued |
| **Refunded at** | Date the refund was processed |
| **Status** | `REFUNDED` (full) or `PARTIALLY_REFUNDED` |

## Common scenarios

**Monthly accounting reconciliation**
Open the page → sum the **Amount** column → cross-check with Stripe
Dashboard refund report. Numbers should match to the cent (Stripe is the
authoritative source — we mirror, never duplicate).

**Product quality investigation**
Filter mentally for `ITEM_DAMAGED` rows → click through to order detail →
note the SKU. If 3+ refunds on the same SKU → archive the product or
revisit construction.

**Find a specific refund**
Search by order ID short hash via Ctrl/Cmd+F in the table (no server-side
search on this view — keep it lightweight).

## Edge cases & gotchas

- **A row appears only after the refund completes successfully on Stripe.**
  Failed refund attempts don't show up here — check the toast notification
  on the order detail page.
- **Customer column blank** doesn't mean a guest — it means the order was
  placed by a registered user (we hide their email here; click into the
  order detail to see customer info).
- **Multiple partial refunds on one order** show as a single row with the
  summed amount. The individual refund events are on the order's timeline.

## Related

- [Order detail](detail.md) — where refunds are issued
- [Orders overview](overview.md)
