# shopping-feed-validate (custom)

**Effort:** medium. **Impact:** high — критично для Google Shopping и Pinterest revenue.

## Что делает

Валидирует output `/feed/google-shopping` против Google Merchant Center спеки:
- Required fields: `id`, `title`, `description`, `link`, `image_link`, `price`, `availability`, `condition`, `brand`, `gtin` (optional)
- Format compliance: price as "89.00 USD", availability enum
- Plus Pinterest-вариант: similar но другой формат (Product Pin format)
- GS1 цены, GTIN/EAN если есть
- Multi-locale variants

## Trigger

- User: `/feed-validate`
- Scheduled via `/schedule` — еженедельная валидация

## SKILL.md

````markdown
---
name: shopping-feed-validate
description: Use when validating Google Shopping or Pinterest product feeds (apps/web/src/app/feed/google-shopping/ output). Checks required Merchant Center fields, format compliance (price "89.00 USD", availability enums), Pinterest Product Pin format, GTIN if present, multi-locale variants.
---

# shopping-feed-validate

## Sources

- Google Merchant Center spec: https://support.google.com/merchants/answer/7052112
- Pinterest catalog spec: https://help.pinterest.com/business/article/catalogs

## Checks for Google Shopping

| Field | Required | Format | Notes |
| --- | --- | --- | --- |
| `id` | yes | unique | use SKU |
| `title` | yes | ≤ 150 chars | localized |
| `description` | yes | ≤ 5000 chars | localized, no HTML |
| `link` | yes | absolute URL | with `/<locale>/products/<slug>` |
| `image_link` | yes | absolute URL | ≥ 100×100 px |
| `additional_image_link` | optional | array | up to 10 |
| `availability` | yes | `in stock` / `out of stock` / `preorder` / `backorder` | matches StockType |
| `price` | yes | `"89.00 USD"` | space-separated currency |
| `sale_price` | optional | same format | if on sale |
| `sale_price_effective_date` | optional | ISO 8601 / ISO 8601 | sale window |
| `condition` | yes | `new` | always for handmade |
| `brand` | yes | text | always "Handmade Jewelry" |
| `gtin` | strongly recommended | 8/12/13/14 digits | if assigned |
| `mpn` | optional | text | use SKU as fallback |
| `google_product_category` | yes | text or ID | "Jewelry > Rings" etc. |
| `product_type` | optional | text | our internal category path |
| `gender` | optional | `unisex` / `female` / `male` | jewelry usually unisex |
| `age_group` | optional | `adult` | |
| `material` | recommended | text | "Sterling Silver 925" |
| `color` | recommended | text | gemstone color or metal |
| `shipping` | recommended | object | country + price |

## Checks for Pinterest

Pinterest accepts Google feed format + additional fields:
- `product_pin_title` — shorter version (≤ 100 chars) of `title`
- `pin_description` — Pinterest-tailored copy
- `product_pin_video_link` — if there's a video

## Procedure

1. Trigger feed generation:
   ```bash
   pnpm --filter web build
   curl http://localhost:3100/feed/google-shopping.xml > /tmp/feed.xml
   curl http://localhost:3100/feed/pinterest.xml > /tmp/pinterest.xml
   ```
2. Parse XML (or JSON if our endpoint returns JSON).
3. Validate each product:
   - All required fields present
   - Format matches spec
   - Image URL returns 200
   - Link URL returns 200 + matches expected pattern
   - Price has currency
   - GTIN checksum valid (if present)
4. Aggregate report.

## Output

```
Google Shopping feed validation:

Total products: 47
✓ All required fields: 47/47
✓ Image URLs reachable: 47/47
✗ GTIN: 12/47 have valid GTIN (35 missing — OK if not assigned)
✗ Sale price: 3 products have sale_price without sale_price_effective_date
✗ Material: 5 products missing material attribute

Pinterest feed validation:
✓ Same products with required pin fields
⚠ 8 products have title >100 chars (will be truncated in pin)

Critical: 0
Warnings: 16
```

## Hard rules

- Always validate against test feed before production deploy
- GTIN — never invent. If not assigned, omit field (better than fake)
- Sale price MUST have effective date — Google rejects feed otherwise
- Multi-locale: separate feed per locale (`/ru/feed/google-shopping.xml`)
- Currency in feed = display currency for that locale (RU → RUB, ES → EUR, EN → USD)

## Источник

- Google Merchant spec link above
- Pinterest catalogs link above
- docs/06_ECOMMERCE_BEST_PRACTICES.md
````

## Зависимости

- Feed endpoint в `apps/web/src/app/feed/google-shopping/` (уже есть согласно roadmap)
- Pinterest feed endpoint
- Product model с jewelry-specific attributes (material, gemstone)

## Источник

- https://support.google.com/merchants/answer/7052112
- https://help.pinterest.com/business/article/catalogs
- docs/12_PLAN_PERSONAL.md (POST-MVP feeds task)
