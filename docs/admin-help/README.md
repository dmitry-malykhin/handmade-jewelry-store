# Admin help docs

These Markdown files are loaded by the in-app **Help** drawer in the admin panel
(`?` keyboard shortcut, or the floating `?` button in the top-right of every
admin page). Each file documents one section or form.

## Layout

```
docs/admin-help/
├── en/   (canonical content — fallback when a locale is missing)
├── ru/   (translations for Russian admins)
└── es/   (translations for Spanish admins)
```

Locale is read from the active admin URL via `useLocale()`; the drawer fetches
`/api/admin-help/{locale}/{slug}`. If the locale-specific file does not exist,
the route handler falls back to English so a new translation can land
incrementally without breaking the experience.

## Editing

- Add or rename a field in an admin form → update the matching doc in **every
  language** in the same PR. Terminology should match `apps/web/messages/{en,ru,es}.json`.
- Path convention: `docs/admin-help/<locale>/<section>/<page>.md`. The slug is
  derived from the current admin pathname — see
  [`apps/web/src/lib/admin-help/path-to-help-slug.ts`](../../apps/web/src/lib/admin-help/path-to-help-slug.ts).
- New translations can be added by dropping a file in `ru/` or `es/`. The
  drawer picks them up on the next request — no rebuild required.

## Structure of a doc

Every file follows the same shape so admins know what to expect:

1. **What this is for** — 1–2 paragraphs of business purpose.
2. **Fields & controls** — per field: purpose, how to fill, consequences, recommended default.
3. **Common scenarios** — short walkthroughs.
4. **Edge cases & gotchas** — surprises worth documenting.
5. **Related** — links to neighbouring docs.

## Index (en — canonical)

- [getting-started](en/getting-started.md)
- Products: [overview](en/products/overview.md) · [create](en/products/create.md) · [edit](en/products/edit.md) · [inventory](en/products/inventory.md)
- Orders: [overview](en/orders/overview.md) · [detail](en/orders/detail.md) · [refunds](en/orders/refunds.md) · [production](en/orders/production.md)
- Customers: [overview](en/customers/overview.md) · [profile](en/customers/profile.md)
- [Categories](en/categories.md)
- [Discounts overview](en/discounts/overview.md)
- [Settings](en/settings/general.md) — General, Social, Shipping sections all live in one doc

Russian and Spanish translations mirror the same slug tree under [`ru/`](ru/) and [`es/`](es/).
