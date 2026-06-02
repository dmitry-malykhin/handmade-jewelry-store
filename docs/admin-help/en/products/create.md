# Create product

## What this is for

Adds a new product to the catalog. The form captures everything the
storefront product page needs to render: name, price, images, dimensions,
production model (in-stock vs made-to-order vs one-of-a-kind), and SEO
metadata.

## When to use it

- Adding a fresh design from the studio
- Re-stocking after a sell-out — usually faster to **duplicate** an archived
  product if the design is the same (manual today, on the roadmap)

## Fields

### Title
- **Purpose**: Customer-facing name. Shown on the product detail page,
  catalog cards, OG previews, and order emails.
- **How to fill**: Title case, descriptive. Include the dominant material
  (e.g. *Sterling Silver Moonstone Ring*). 6-10 words is the sweet spot.
- **Consequences**: Drives the URL slug if you leave the slug field blank.
- **Recommended**: One canonical name per design — don't append "(2024)".

### Slug
- **Purpose**: URL fragment after `/products/`. Auto-generated from title after
  ~400ms if left blank.
- **How to fill**: lowercase, hyphens, no diacritics. Example
  `sterling-silver-moonstone-ring`.
- **Consequences**: Changing the slug later breaks old links. Stripe receipts
  and customer bookmarks won't auto-redirect. Set carefully.

### Description
- **Purpose**: Long-form body on the product page. Renders below the price.
- **How to fill**: 2-5 paragraphs covering material, dimensions, care tips,
  inspiration. Write for both customers and search engines (keywords like
  "handmade", "moonstone", "anniversary gift" help SEO).

### Price (USD)
- **Purpose**: Listed price. Stored in dollars in the DB.
- **How to fill**: Whole or two-decimal number (e.g. `49.99`).
- **Consequences**: Drives Stripe `PaymentIntent.amount` at checkout and
  influences BNPL (Klarna/Afterpay) eligibility — the storefront shows the
  "4 payments of $X" preview only for prices in the $35-$1000 window.

### Material
- **Purpose**: Free-text material description. Surfaces in product detail and
  is searchable from the storefront search bar.
- **Example**: `Sterling silver, moonstone, freshwater pearl`.

### SKU
- **Purpose**: Internal stock-keeping code.
- **How to fill**: Short, uppercase, hyphenated (`RING-MOON-001`).
- **Consequences**: Surfaces in admin tables and CSV exports. Customers
  don't see it.

### Category
- **Purpose**: Bucket for the catalog filter sidebar.
- **How to fill**: Pick one from the dropdown. Create new categories under
  the [Categories](../categories.md) section first if none fits.

### Stock type
The single most important business choice — drives shipping copy, delivery
ETA, and how the inventory tracker handles the product.

- **In stock** — ready to ship today (1 unit on the shelf). Default for
  finished pieces.
- **Made to order** — produced after payment. Lead time is the
  `productionDays` you set below. Surfaces in the production tracker.
- **One of a kind** — unique piece, 1 unit, ships like in-stock but the
  storefront frames it differently if sold ("we can craft a similar one"
  flow).

### Stock count
- **Purpose**: Units currently available.
- **How to fill**: `0` for made-to-order pieces (they're built per order).
  `1` for one-of-a-kind. For in-stock, the actual count.
- **Consequences**: Drives the **Inventory** page low-stock alert. When
  stock reaches `0` on an in-stock piece, the catalog hides it unless you
  also support back-in-stock notifications.

### Production days
- **Purpose**: How long the maker needs to produce a made-to-order piece.
- **How to fill**: Whole number, business days (e.g. `5` for a working
  week).
- **Consequences**: Storefront shows the customer an honest delivery range
  (production days + shipping ETA). Production tracker uses this as the
  deadline countdown.

### Dimensions (length / width / height / weight in metric)
- **Purpose**: Source of truth for measurements. Storefront converts to
  imperial at render time per the measurement-system toggle (#113).
- **How to fill**: Length and width in cm, weight in grams. Leave the
  fields you don't have empty rather than guessing.

### Images
- **Purpose**: First image is the LCP (largest contentful paint) on the
  product detail page. Upload 3-6 from different angles.
- **How to fill**: 1:1 square crop preferred; PNG or JPG. Drag-and-drop
  reorders.

## Common scenarios

**A piece that's both ready and re-orderable**
Mark it **One of a kind** with stock=1. After it sells, the storefront
keeps the listing accessible for re-craft inquiries (production days still
apply).

**Pre-launch teaser**
Status **Draft**. The page is hidden from the catalog and search. Share
the direct slug with friends to preview — the URL works for admins, returns
404 for everyone else.

## Edge cases & gotchas

- **Slug clashes** — if you pick a slug that already exists, the save fails.
  The form shows the conflict; pick a different slug.
- **Empty image array** — the storefront falls back to a placeholder image,
  but search ranking suffers. Always upload at least one.
- **Material as search input** — typing "silver" in the storefront search
  bar matches against the Material field (and Title/Description). Spell
  consistently across products to keep search predictable.

## Related

- [Products overview](overview.md)
- [Edit product](edit.md)
- [Inventory](inventory.md) — low-stock alerts based on values here
- [Categories](../categories.md)
