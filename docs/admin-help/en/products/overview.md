# Products

## What this is for

Every item the shop sells. The Products section lists them all (regardless of
status), lets you search, filter by category, change publish status, and link
out to create / edit forms.

## When to use it

- Adding a new design to the catalog (use **Create product**)
- Hiding a piece temporarily — set status to **Draft**
- Discontinuing a piece permanently — set status to **Archived**
- Spot-checking which products are live before a campaign

## Columns

| Column | Meaning |
|---|---|
| **Image** | First product image (the LCP image on the storefront detail page) |
| **Title** | Customer-facing name |
| **SKU** | Internal identifier — useful in spreadsheets / supplier notes |
| **Category** | What facet the product appears under in the catalog filter |
| **Stock** | Current units available. Made-to-order pieces always show `0` and the **Type** column tells you that's expected |
| **Status** | Active (visible to customers), Draft (hidden), Archived (read-only) |

## Common scenarios

**Hide a piece without losing it**
Change status to **Draft**. Existing orders for that product are unaffected;
customers will see a 404 if they try the old URL.

**Pull a sold-out one-of-a-kind**
One-of-a-kind pieces are *not* removed when sold — the storefront keeps the
listing and offers a "we can craft a similar one" path (see issue #231). If
you genuinely want to retire the listing, set it to **Archived**.

**Bulk operations**
Not available yet — track in #172.

## Related

- [Create product form](create.md)
- [Edit product form](edit.md)
- [Inventory](inventory.md) — stock-focused view of the same data
- [Categories](../categories.md)
