# seo-page-audit (custom)

**Effort:** medium. **Impact:** high.

## Что делает

Проверяет страницу на:
- Уникальные `title`, `description`, OpenGraph
- `canonical` URL присутствует
- `hreflang` для 3 локалей правильно проставлен
- Slug-based URL, не `/products/42`
- LCP image имеет `priority={true}`
- JSON-LD корректен (делегирует `/jsonld-audit` если product)
- BNPL price markers если цена ≥ $50
- Измерения метрик/имперских — пара показана если возможно

## Trigger

- User: `/seo-audit <url>` или `/seo-audit <file>`
- Auto-suggest когда `new-page` создаёт новую страницу

## SKILL.md

````markdown
---
name: seo-page-audit
description: Use when reviewing a Next.js page (apps/web/src/app/[locale]/.../page.tsx) for SEO compliance. Checks unique metadata, canonical, hreflang for all 3 locales, slug-based URL, LCP priority image, JSON-LD, BNPL markers, measurement display.
---

# seo-page-audit

## Inputs

- Page file path or URL

## Checks

### Metadata

1. **Unique `title`** via `generateMetadata` — not just static `metadata` (which would duplicate across params).
2. **`description`** localized, 120-160 chars.
3. **OpenGraph**:
   - `og:title`, `og:description`, `og:type` (`product` for products)
   - `og:image` absolute URL, ≥ 1200×630
   - `og:locale` matches current locale (`en_US`, `ru_RU`, `es_ES`)
4. **`canonical`** URL set in `metadata.alternates.canonical`.
5. **`hreflang`** alternates:
   ```ts
   alternates: {
     canonical: `/en/products/${slug}`,
     languages: {
       'en-US': `/en/products/${slug}`,
       'ru-RU': `/ru/products/${slug}`,
       'es-ES': `/es/products/${slug}`,
     }
   }
   ```

### URL structure

- Path uses `slug`, not `id`: `/products/silver-ring` not `/products/42` ✓
- Locale prefix present: `/en/products/...`
- No trailing slash

### LCP image

- First `<Image>` in page tree has `priority={true}`
- Explicit `width` and `height`
- Descriptive `alt`

### JSON-LD (if product/category page)

- Delegate to `/jsonld-audit` skill

### BNPL markers (if product with price)

- `InstallmentPreview` rendered if `priceCents >= 5000`

### Measurement display

- If product has dimensions/weight → `useMeasurementSystem()` used, NOT raw values

### Server Component

- Page is Server Component (no `'use client'` at top of `page.tsx`)
- Heavy client logic moved to `_components/*.client.tsx`

### Static generation

- For product/category pages: `generateStaticParams` exists OR explicit dynamic SSR justified
- `revalidate` set explicitly (ISR window)

## Report format

```
SEO audit: apps/web/src/app/[locale]/products/[slug]/page.tsx

✓ Server Component
✓ generateMetadata exports unique title per slug
✓ hreflang covers en/ru/es
✓ canonical present
✗ First Image missing priority={true} — line 47
✗ alt="" on hero image — line 47 (block per CLAUDE.md)
✓ JSON-LD via ProductJsonLd component
⚠ BNPL marker missing — product price $89 ≥ $50 threshold
✓ Measurement uses useMeasurementSystem
✓ Slug-based URL
✓ revalidate = 3600

2 errors / 1 warning
```

## Hard rules

1. **All findings link to file:line** for navigation
2. **Block on**: missing canonical, missing hreflang, raw `id` URL, missing alt, no metadata
3. **Warn on**: missing OG image, missing BNPL marker, missing breadcrumbs JSON-LD
````

## Зависимости

- `next-intl` для locales
- `next/image` для LCP detection
- `apps/web/src/components/features/seo/` компоненты

## Источник

- docs/05_SEO_RULES.md
- CLAUDE.md → SEO правила
