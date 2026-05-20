# Edit product

## What this is for

Modify an existing product. The form mirrors **Create** — same fields, same
validation — with one critical difference: changes here affect both the live
storefront and SEO indexing.

## When to use it

- Price change for an existing piece
- Adding more photos after a re-shoot
- Restocking — bump the **Stock count**
- Fixing a typo in title / description
- Retiring a piece — change **Status** to **Draft** or **Archived**

## Field-by-field

Same shape as [Create product](create.md). Important differences:

### Slug
**Avoid editing.** Slug changes break inbound links: Google search results,
customer bookmarks, Stripe receipts, shared social posts. Only edit if the
original slug was genuinely wrong AND you're prepared to add a redirect
(currently manual).

### Status
- **Active** → visible everywhere
- **Draft** → hidden from catalog, search, and product detail. Existing
  orders unaffected.
- **Archived** → permanently retired; read-only.

### Stock count
Edit freely. The **Inventory** page reads this value to decide low-stock
alerts. When stock drops to 0 on an in-stock piece, the storefront hides it.

## Common scenarios

**Re-shoot product photos**
Re-upload all images. The first image becomes the new LCP image. The CDN
caches images for ~24h so customers may see the old one briefly.

**Bulk price update for a collection**
Not available yet — edit each product individually. Bulk operations are
tracked in #172.

## Edge cases & gotchas

- **Editing during an active session** — if a customer has the product page
  open while you save, they'll see the updated values on their next refresh
  but the cart still uses the price at the moment of add-to-cart.
- **Stock at 0 + made-to-order** — storefront still shows the piece; "0
  units" doesn't matter for made-to-order. Don't try to "fix" the 0 by
  inflating the number.

## Related

- [Create product](create.md) — for full field-by-field rationale
- [Inventory](inventory.md)
