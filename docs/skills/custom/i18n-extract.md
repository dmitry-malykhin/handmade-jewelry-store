# i18n-extract (custom)

**Effort:** medium. **Impact:** high.

## Что делает

Сканит компонент: любой строковый литерал в JSX, `aria-label`, `placeholder`, `title`, `alt` → выносит в `messages/*.json` под ближайший namespace + заменяет на `t('...')`.

Дополняет `/i18n-sync` — тот синхронизирует существующие, этот **извлекает** hardcoded strings.

## Trigger

- User: `/i18n-extract <file>`
- Auto-suggest когда `seo-page-audit` находит hardcoded text

## SKILL.md

````markdown
---
name: i18n-extract
description: Use when migrating a component from hardcoded strings to useTranslations(). Scans the file for string literals in JSX, aria-label/placeholder/title/alt, extracts them to apps/web/messages/{en,ru,es}.json under the closest namespace, and replaces with t('key') calls.
---

# i18n-extract

## Inputs

- Target file path

## Procedure

1. **Parse** the file AST (or grep + careful match).
2. **Identify hardcoded strings:**
   - JSX text children: `<span>Add to cart</span>`
   - JSX attributes: `aria-label="Search"`, `placeholder="Email"`, `title="Close"`, `alt="..."`
   - String literals returned from event handlers: `setError('Required')`
3. **Skip:**
   - Strings inside test files (`.spec.tsx`)
   - Schema.org JSON-LD strings (those are content, not UI — but localize URL-based fields)
   - Class names, prop values that are identifiers (`variant="ghost"`)
   - `displayName`, `key` props
4. **Determine namespace** from component path:
   - `components/features/product/*` → `product`
   - `components/features/cart/*` → `cart`
   - `components/features/checkout/*` → `checkout`
   - `components/ui/*` → flag for manual decision (UI primitives shouldn't have strings)
5. **Generate key** from content:
   - "Add to cart" → `addToCart`
   - "Out of stock" → `outOfStock`
   - "View 24 reviews" → `viewReviews` (with `{count}` interpolation)
6. **Edit file** — replace literals with `t('key')`.
7. **Add to `messages/en.json`** (EN value = original literal).
8. **Invoke `/i18n-sync`** to propagate to RU/ES.

## Example

Before:
```tsx
export function ProductCard({ product }: Props) {
  return (
    <article>
      <h3>{product.name}</h3>
      <button aria-label="Add to cart">Add to cart</button>
      <p>Sterling silver — handmade</p>
    </article>
  )
}
```

After:
```tsx
import { useTranslations } from 'next-intl'

export function ProductCard({ product }: Props) {
  const t = useTranslations('product')
  return (
    <article>
      <h3>{product.name}</h3>
      <button aria-label={t('addToCart')}>{t('addToCart')}</button>
      <p>{t('subtitle')}</p>
    </article>
  )
}
```

`messages/en.json` augmented:
```json
{
  "product": {
    "addToCart": "Add to cart",
    "subtitle": "Sterling silver — handmade"
  }
}
```

Then `/i18n-sync` adds RU/ES.

## Hard rules

1. **camelCase keys**
2. **Reuse existing keys** if same string already exists in namespace
3. **ICU MessageFormat for plurals**: `viewReviews` → `"View {count, plural, one {1 review} other {# reviews}}"`
4. **Server vs Client**: if file is Server Component → use `getTranslations()`, if Client → `useTranslations()`
5. **Don't extract product names / database content** — those come from API, not translations
6. **Skip Schema.org enums** (`https://schema.org/InStock` — machine-readable, not localized)

## Edge cases

- **Tooltips with HTML/markup**: use `t.rich('key', { strong: (chunks) => <strong>{chunks}</strong> })`
- **Date/time**: don't extract dates as strings — use `<FormatDate>` or `Intl.DateTimeFormat`
- **Numbers/currencies**: don't extract — use `formatPriceInDollars` etc.

## Trade-offs

- AST-based parsing более точен, regex может пропустить edge cases
- Auto-generated keys могут конфликтовать с существующими — проверка обязательна
- Russian/Spanish formal vs informal tone — авто-перевод может ошибаться, требует ревью
````

## Зависимости

- `/i18n-sync` skill (для RU/ES propagation)
- `next-intl`
- Существующая namespace структура

## Источник

- CLAUDE.md → i18n правила
- next-intl docs
