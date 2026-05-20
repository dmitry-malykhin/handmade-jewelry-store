# Settings

## What this is for

Store-wide configuration. Three sections on one page, each with its own
**Save** button (saves only that section, not the whole page).

1. **General** — store identity (name, tagline, contact emails)
2. **Social** — links to social profiles, rendered in the storefront footer
3. **Shipping** — return policy, delivery estimates, free-shipping threshold

Settings are stored as a single row in the `SiteSettings` table (singleton
with `id = "default"`) and read on every storefront request, so changes
appear immediately on the public site.

---

## Section 1 — General

### Store name
- **Purpose**: The name used in the storefront header, page titles, email
  signatures, and order receipts.
- **How to fill**: 1–120 characters. Required.
- **Consequences**: Changing this updates every customer-facing surface
  on the next page load. SEO `<title>` tags rebuild on ISR refresh.

### Tagline
- **Purpose**: Short sentence shown under the logo / in homepage hero.
- **How to fill**: ≤ 200 characters. Optional but recommended.
- **Recommended default**: A clear value prop. e.g.
  `Handmade silver jewelry, shipped worldwide`.

### Contact email
- **Purpose**: Public-facing inbox shown on the storefront contact page
  and in the footer.
- **How to fill**: Valid email or blank.
- **Consequences**: This is what customers will email you on. Use one you
  actually check.

### Support email
- **Purpose**: Where order-related notifications go. May be the same as
  contact email — split it when support volume justifies a separate inbox.
- **How to fill**: Valid email or blank.

---

## Section 2 — Social

All four fields accept an `https://` URL or blank. Blank hides that icon
in the storefront footer.

### Instagram URL
- **Purpose**: Footer link to your Instagram profile.
- **Format**: `https://instagram.com/yourhandle`

### Pinterest URL
- **Purpose**: Footer link. Pinterest is a high-intent jewelry channel —
  worth populating if you have any pins.
- **Format**: `https://pinterest.com/yourhandle`

### Facebook URL
- **Purpose**: Footer link to Facebook page.
- **Format**: `https://facebook.com/yourpage`

### TikTok URL
- **Purpose**: Footer link to TikTok profile.
- **Format**: `https://tiktok.com/@yourhandle`

**Consequences for all four**: Empty fields drop the icon from the footer
entirely (no broken links).

---

## Section 3 — Shipping

### Return policy (days)
- **Purpose**: Customer-facing return window. Shown on product pages and
  the policies page.
- **How to fill**: 0–365 days.
- **Recommended default**: `30`. Industry standard for handmade jewelry.

### Free-shipping threshold (cents)
- **Purpose**: Order subtotal at which shipping becomes free at checkout.
- **How to fill**: cents (e.g. `7500` = $75).
- **Consequences**: Below threshold, customer pays shipping; at/above,
  free. Shown as a progress bar in the cart.
- **Recommended default**: 2–3x average order value.

### Estimated delivery — min days
- **Purpose**: Optimistic end of the delivery window. Shown as part of
  "delivers in X–Y days" on product page and at checkout.
- **How to fill**: 0–60. Must be ≤ max days.

### Estimated delivery — max days
- **Purpose**: Pessimistic end of the window — what you'd quote a
  customer who asked "but what's the worst case?".
- **How to fill**: 0–60. Must be ≥ min days.
- **Recommended default**: tighter for in-stock pieces (e.g. `3–7`),
  wider for made-to-order (e.g. `10–21`).

---

## Common scenarios

**Initial setup after launch**
General → store name, tagline, both emails → save. Social → fill the
profiles you actually use → save. Shipping → return `30`, threshold `7500`,
delivery `3–7` for in-stock baseline → save.

**Brand rename**
General → update store name → save. Verify the header on storefront
updates within seconds.

**Holiday delivery delay**
Shipping → bump max days from `7` to `14` → save. Customer-facing
estimates update everywhere immediately.

## Edge cases & gotchas

- **Each section saves independently.** If you edit General and Shipping
  in the same visit, you must click both Save buttons.
- **No "undo" / version history** — last write wins. For brand identity
  changes, screenshot the previous values first.
- **`min > max` on delivery days is blocked** by client validation.
- **Empty social URLs are the way to remove an icon** — there's no per-icon
  toggle.
- **Currency**: prices are always stored in USD cents (see
  `docs/09_MULTI_CURRENCY.md`). The settings page doesn't expose currency
  selection.

## Related

- [Categories](../categories.md) — taxonomy is configured separately
- [Discount codes](../discounts/overview.md)
