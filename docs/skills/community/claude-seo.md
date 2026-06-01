# claude-seo

**Priority:** P0 — критичен для revenue thesis (SEO + Google Shopping + Pinterest).
**Source:** github.com/AgricIDaniel/claude-seo (7.8k ★, v2.0.0, 271 тестов).

## Что делает

Универсальный SEO skill — 6 sub-skills:

| Sub-skill | Назначение |
| --- | --- |
| `/seo audit` | Полный technical SEO audit страницы |
| `/seo schema` | Валидация JSON-LD по Schema.org + Google Rich Results |
| `/seo geo` | Generative Engine Optimization — LLM-aware (Bing AI, Perplexity, Google SGE) |
| `/seo technical` | Robots.txt, sitemap.xml, meta robots, redirects |
| `/seo content` | E-E-A-T, internal linking, content quality |
| `/seo local` | Local SEO (для retail с физ. адресом — пока не наш case) |

Findings — falsifiable (не "общие рекомендации", а "вот тут JSON-LD без offers.priceCurrency").

## Установка

```bash
/plugin marketplace add AgricIDaniel/claude-seo
/plugin install claude-seo@agricidaniel-claude-seo --scope project
```

После установки — `/skills` покажет sub-команды.

## Использование

### При создании product page (W4-W5)

```
/seo schema apps/web/src/app/[locale]/products/[slug]/page.tsx
```

— проверит, что JSON-LD содержит:
- `@type: Product`
- `name`, `description`, `sku`
- `offers` с `price`, `priceCurrency`, `availability`
- `aggregateRating` если есть отзывы
- `brand`
- `image` array

### W8 — SEO sprint (#36)

```
/seo audit https://localhost:3100/ru/products/silver-moonstone-ring
```

— Все основные правила сразу: meta title/description uniqueness, canonical, hreflang для 3 локалей, slug-URL, LCP image priority, og:image.

### Continuous — auto schedule

```
/schedule daily /seo audit https://handmade-jewelry.com/products/best-seller-1
```

— ежедневный SEO audit топ-продаваемого продукта, alert если что-то деградировало.

## Совпадение с docs/05_SEO_RULES.md

| Наше правило | Покрывает claude-seo |
| --- | --- |
| Unique title/description | yes (`/seo audit`) |
| Canonical URL | yes (`/seo technical`) |
| OpenGraph | yes (`/seo audit`) |
| JSON-LD on product pages | yes (`/seo schema`) |
| Slug URLs | yes (`/seo technical`) |
| Core Web Vitals | частично — pair с `chrome-devtools-mcp` |
| Hreflang for EN/RU/ES | yes (`/seo technical`) |

## Интеграция с custom skill

`/seo schema` лежит в фундамент нашего custom [jsonld-audit.md](../custom/jsonld-audit.md), который делает jewelry-specific проверки (наличие brand, GTIN если есть, weight/dimensions в structured data для Google Shopping).

`/seo audit` — generic; `seo-page-audit` (custom) — добавляет наши специфичные требования (3 локали, BNPL price markers, измерения метрик/имперских).

## Trade-offs

- v2.0.0 — недавний релиз (май 2026), есть edge cases (особенно в `/seo geo` — LLM SEO молодая область)
- Не заменяет Google Search Console / Ahrefs / Semrush — даёт on-page анализ, не tracking rank
- `/seo local` пока не релевантен (мы online-only)

## Безопасность

Vendor-owned-like: один автор с прозрачной историей. 271 тест — серьёзный maintenance signal. Но всё-таки проверить SKILL.md перед install (см. [security.md](../security.md)).

## Источник

- https://github.com/AgricIDaniel/claude-seo
- docs/05_SEO_RULES.md
