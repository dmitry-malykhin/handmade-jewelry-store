# jsonld-audit (custom)

**Effort:** low. **Impact:** high.

## Что делает

Валидирует JSON-LD на странице:
- Проверка по Schema.org + Google Rich Results validator
- Наличие jewelry-specific полей: `material`, `gemstone`, `ringSize` (custom property `additionalProperty`)
- `offers.priceCurrency`, `availability`, `priceValidUntil`
- `aggregateRating` если есть reviews
- `brand` всегда
- `image` — multiple URLs

## Trigger

- User: `/jsonld-audit <url>` или `/jsonld-audit apps/web/src/app/[locale]/products/[slug]/page.tsx`
- Auto-suggest на любую правку `ProductJsonLd` компонента

## SKILL.md шаблон

````markdown
---
name: jsonld-audit
description: Use when reviewing JSON-LD structured data on product/category pages, or after editing the ProductJsonLd component. Validates JSON-LD against Schema.org and Google Rich Results, ensures jewelry-specific fields are present (material, gemstone, ring size as additionalProperty), and verifies offers.priceCurrency, availability, aggregateRating, brand.
---

# jsonld-audit

## Inputs

- URL of page to audit OR path to component file
- Product slug if auditing a single product

## Checks

### Required Schema.org fields

| Field | Required | Notes |
| --- | --- | --- |
| `@context` | yes | `"https://schema.org"` |
| `@type` | yes | `"Product"` for product pages |
| `name` | yes | localized |
| `description` | yes | localized, ≤ 5000 chars |
| `sku` | yes | unique |
| `image` | yes | array, ≥ 1 URL, absolute |
| `brand` | yes | `{ @type: "Brand", name: "Handmade Jewelry" }` |
| `offers` | yes | with `price`, `priceCurrency`, `availability` |
| `aggregateRating` | if reviews exist | with `ratingValue`, `reviewCount` |

### Offers sub-fields

```json
{
  "@type": "Offer",
  "price": "89.00",
  "priceCurrency": "USD",
  "availability": "https://schema.org/InStock",
  "priceValidUntil": "2027-01-01",
  "url": "https://handmade-jewelry.com/products/silver-ring",
  "itemCondition": "https://schema.org/NewCondition"
}
```

`availability` mapping:
- `IN_STOCK` → `"https://schema.org/InStock"`
- `OUT_OF_STOCK` → `"https://schema.org/OutOfStock"`
- `PREORDER` → `"https://schema.org/PreOrder"`

### Jewelry-specific extensions

For Google Shopping richer results — use `additionalProperty`:

```json
{
  "additionalProperty": [
    { "@type": "PropertyValue", "name": "Material", "value": "Sterling Silver 925" },
    { "@type": "PropertyValue", "name": "Gemstone", "value": "Moonstone" },
    { "@type": "PropertyValue", "name": "Weight", "value": "5g" },
    { "@type": "PropertyValue", "name": "Ring Size US", "value": "7" }
  ]
}
```

### Multi-locale

Each locale (EN/RU/ES) has separate JSON-LD. Localize:
- `name`
- `description`
- `offers.url` (must point to `/<locale>/products/<slug>`)
- `availability` — same machine value (Schema.org URLs are English, that's the spec)

## Procedure

1. Load page or extract JSON-LD from component.
2. Validate against Schema.org schema.
3. Cross-reference with our `apps/web/src/components/features/seo/ProductJsonLd.tsx`.
4. Run mock validation against Google Rich Results (WebFetch к `https://search.google.com/test/rich-results?url=<url>`).
5. Report findings.

## Output

```
JSON-LD audit for /en/products/silver-moonstone-ring:

✓ @context, @type
✓ name, description, sku, image
✓ brand
✓ offers.price = 89.00 USD
✓ offers.availability = InStock
✓ aggregateRating: 4.8 / 23 reviews
✗ additionalProperty.Material — MISSING (recommended for jewelry rich results)
✗ priceValidUntil — MISSING (recommended)

3 errors / 0 critical / 2 warnings
```
````

## Зависимости

- `apps/web/src/components/features/seo/ProductJsonLd.tsx` (existing)
- Prisma product model with `additionalProperties` JSON field or related table

## Источник

- docs/05_SEO_RULES.md
- https://schema.org/Product
- https://developers.google.com/search/docs/appearance/structured-data/product
