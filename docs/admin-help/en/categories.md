# Categories

## What this is for

Manage the catalog taxonomy — the buckets customers filter by on the shop
page (`Rings`, `Necklaces`, `Bracelets`, etc.).

Each product belongs to exactly **one** category. Categories appear in
storefront navigation, breadcrumbs, and product JSON-LD. Their `slug` is
part of the canonical URL: `/?categorySlug=rings`.

Use this page to:

- Add a new top-level category when launching a new product line
- Rename a category (auto-regenerates slug if you leave it blank)
- Delete a category (only when empty — see "Edge cases")

## Fields & controls

### Name
- **Purpose**: Human-readable label. Shown on shop nav, breadcrumbs, filters.
- **How to fill**: Title case, singular or plural — be consistent with
  existing categories. e.g. `Rings`, not `ring` or `RINGS`.
- **Consequences**: User-visible. Required.

### Slug (optional in form, generated if blank)
- **Purpose**: URL-safe identifier used in shop filter URLs and SEO.
- **How to fill**: kebab-case, lowercase, no spaces. `engagement-rings`,
  not `Engagement Rings`. Leave blank → auto-generated from name.
- **Consequences**: **Changing the slug breaks every external link** to
  that category (search engines, Pinterest pins, ads). Once published,
  treat the slug as immutable unless you're prepared to set up redirects.
- **Recommended default**: Let it auto-generate on first save. Only edit
  if the slug is non-obvious.

### Products count (read-only column)
- **Purpose**: How many products currently in this category.
- **Consequences**: Categories with `> 0` products cannot be deleted —
  reassign or archive the products first.

### New category button
- **Purpose**: Open the create modal.
- **How to fill**: Name (required) + slug (optional). Submit.

### Edit (pencil icon)
- **Purpose**: Open the edit modal for an existing category.
- **Consequences**: Saving immediately updates the live category.

### Delete (trash icon)
- **Purpose**: Hard-delete the category.
- **When you can**: Only when `Products = 0`.
- **Consequences**: Irreversible. The category disappears from storefront
  immediately.

## Common scenarios

**Launching a new line — "Anklets"**
Click **New category** → Name `Anklets` → leave slug blank → save. Then
edit existing products to assign them to the new category.

**Renaming "Rings" to "All rings"**
Edit → Name `All rings` → **leave slug as `rings`** to keep existing URLs
intact. Save.

**Retiring a discontinued category**
Move every product out of it (edit each product → change category) → then
delete.

## Edge cases & gotchas

- **You can't have two categories with the same slug.** Backend rejects
  with a unique-constraint error surfaced as a toast.
- **Empty category list** = `categoriesEmpty` message. New stores start
  here; add at least one category before creating products.
- **Slug changes do not trigger redirects.** This is a known limitation —
  if you must rename a slug post-launch, manually add a redirect in
  `next.config.js` from old to new slug.
- **Categories are flat — no parent/child hierarchy.** Subcategories
  aren't supported in this version.

## Related

- [Products overview](products/overview.md) — assign products to categories
- [Edit product](products/edit.md) — change a product's category
