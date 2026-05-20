# Inventory

## What this is for

A stock-focused view of the catalog with two features the regular Products
page doesn't have:

1. **Low-stock alerts** — products at or below a configurable threshold show
   a red badge and highlighted row.
2. **Inline stock edit** — click a stock number to bump it without opening
   the full edit form.

The sidebar **Inventory** link shows a red counter badge whenever any
in-stock product is below the threshold. The number refreshes every 2
minutes (or immediately after you adjust stock here).

## Fields & controls

### Alert me when stock ≤
- **Purpose**: Threshold for the low-stock badge. Default `3`.
- **How to fill**: Whole number, typically 1-10.
- **Consequences**: The sidebar badge counts products at-or-below this
  number. Setting too high will spam the badge with normal products;
  setting too low means you'll restock late.
- **Recommended default**: `3` for in-stock pieces with replicable molds, `1`
  for slow-moving items.

### Low stock only (toggle)
- **Purpose**: Filter the table to flagged items only.
- **When to enable**: When investigating "what do I need to restock?".

### Stock column (inline edit)
- **Purpose**: Click the number → input opens → enter new value → Enter or
  click away to save. Escape cancels.
- **Consequences**: Direct update — no confirmation. The sidebar badge
  refreshes immediately.

## What counts as "low stock"

Only **In stock** products. Made-to-order and one-of-a-kind pieces are
explicitly excluded — they're produced per order, so "0 stock" is their
normal state and would always flag.

## Common scenarios

**Daily restock check**
Open the page, glance at the sidebar badge. If `0`, you're fine. Otherwise
enable **Low stock only** and bump counts after re-checking the studio.

**Threshold tuning**
After a busy weekend, you sold out of 3 pieces. Either lower the threshold
(less aggressive alerting) or, more likely, train yourself to restock once
the badge appears at all.

## Edge cases & gotchas

- **Stock 0 on in-stock piece** — flagged (the threshold is `<=`). Decide:
  restock or move the product to **Archived**.
- **Type change after listing** — if you change a product from in-stock to
  made-to-order, the inventory tracker stops including it automatically.

## Related

- [Products overview](overview.md)
- [Edit product](edit.md) — full edit form behind the inline stock edit
