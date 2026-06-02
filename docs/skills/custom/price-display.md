# price-display (custom)

**Priority:** 5 (top-5).
**Effort:** low.
**Impact:** high — самый дорогой класс багов (деньги).

## Что делает

Гарантирует инварианты цены:

1. Storage — `Int` cents в USD, имя поля `*Cents`.
2. Display — через `formatPriceInDollars()` из `apps/web/src/lib/pricing-constants.ts`.
3. Markup — `<data value={cents / 100}>{formatted}</data>` (Schema.org-friendly).
4. Multi-currency — конвертация на render через ExchangeRate-API, **никогда** store converted.
5. EU локали — показ VAT-inclusive + текстом "VAT included".
6. BNPL — если `cents >= 5000` (Klarna min) — render `<InstallmentPreview />`.

## Trigger

- User: `/price-display ProductCard.tsx`
- Hook (опционально): на любую правку файла где упоминается `price|amount|total` в `apps/web/src/`
- Auto-suggest когда `new-feature-component` создаёт компонент с ценой

## Установка

Создать `.claude/skills/price-display/SKILL.md`:

````markdown
---
name: price-display
description: Use whenever a file displays or computes a price, mentions cents/dollars/EUR/RUB, or imports from lib/pricing. Enforces: USD-cents storage, display-time conversion, <data value=...> semantic tag, BNPL installment preview when threshold met, and EU VAT-inclusive flag.
---

# price-display

## Inputs

1. **Target file** — path to component that displays price.
2. **Price source** — variable name in file (e.g. `product.priceCents`).
3. **Layout context** — list view (compact), detail page (full with installments), checkout summary, etc.

## Invariants

### Storage (verify in Prisma schema + DTO)

- Field name ends with `Cents` — `priceCents`, `subtotalCents`, `discountCents`.
- Field type — `Int` (Prisma) / `number` (TypeScript) representing integer cents.
- **Never** `Float` or `Decimal` (precision issues).
- Currency — always USD at storage.

If file violates — report and fix:
- `price: 89.00` → `priceCents: 8900`
- `amount: Decimal` → `amountCents: Int`

### Display

Use `formatPriceInDollars(cents, locale, currency)` from `apps/web/src/lib/pricing-constants.ts`:

```ts
import { formatPriceInDollars } from '@/lib/pricing-constants'
import { useExchangeRate } from '@/hooks/queries/useExchangeRate'

const { locale, currency } = useLocaleCurrency()
const { data: rate } = useExchangeRate({ from: 'USD', to: currency })

const displayed = formatPriceInDollars(product.priceCents, locale, currency, rate)
```

### Markup (semantic)

```tsx
<data value={(product.priceCents / 100).toFixed(2)}>
  {displayed}
</data>
```

`<data>` is a semantic HTML element with `value` attribute — machine-readable price. Required for JSON-LD schema parsing (Google Shopping reads it).

### Multi-currency rules

- Convert at **render time**, never at storage.
- Use `useExchangeRate()` hook (Client) or `getExchangeRate()` (Server) — both fetch from ExchangeRate-API with 1-hour cache.
- Fallback to USD if rate fetch fails — log to Sentry, don't break UX.
- **Never** invoke conversion in Service layer (apps/api). Server returns cents in USD; conversion is presentation concern.

### EU VAT rules

If `locale.startsWith('eu-')` or locale in EU list (`it`, `de`, `fr`, `es`, `nl`, ...):

```tsx
<>
  <data value={cents / 100}>{displayed}</data>
  <span className="text-muted-foreground text-xs">
    {t('product.vatIncluded')}
  </span>
</>
```

Note: en-GB after Brexit is NOT EU (no VAT-inclusive requirement on the product page; VAT is calculated at checkout).

### BNPL Installment Preview

If `priceCents >= 5000` (Klarna minimum is $50):

```tsx
import { InstallmentPreview } from '@/components/features/checkout/InstallmentPreview'

<>
  <data value={cents / 100}>{displayed}</data>
  <InstallmentPreview cents={priceCents} />
  {/* Renders: "or 4 payments of $22.25 with Klarna" */}
</>
```

`InstallmentPreview` component lives in [apps/web/src/lib/installment-preview.ts](../../../apps/web/src/lib/installment-preview.ts) (already exists per docs/runbooks/stripe-bnpl-setup.md).

## Hard rules

1. **No raw arithmetic** on price in JSX — use helpers.
2. **No `.toFixed(2)` direct** — use `formatPriceInDollars()`.
3. **No `*100` / `/100`** outside `lib/pricing-constants.ts` and JSX `<data value=...>`.
4. **No `'$' + price`** — locale formatter handles symbol.
5. **No display logic in apps/api** — API returns USD cents only.

## Snapshot tests

After scaffolding/refactoring a price display, add to `__snapshots__/`:

```ts
describe('ProductCard price', () => {
  it('formats $89.00 in en-US', () => { ... })
  it('formats €82.00 in es-EU with VAT', () => { ... })
  it('formats ₽7800 in ru-RU', () => { ... })
  it('shows InstallmentPreview when >= $50', () => { ... })
  it('hides InstallmentPreview when < $50', () => { ... })
})
```

## Procedure

1. Detect price expressions in target file.
2. Check Storage: `*Cents` suffix + `Int`. If wrong — propose fix.
3. Rewrite Display to use `formatPriceInDollars`.
4. Wrap in `<data value=...>`.
5. Add VAT label if EU locale possible.
6. Add `InstallmentPreview` if `cents >= 5000`.
7. Add snapshot test covering USD/EUR/RUB + VAT + BNPL cases.
````

## Trade-offs

- VAT rules — only Western EU + UK. Прочая Europe (Norway, Switzerland) — separate
- Exchange rate from external API → cache miss adds ~100-200ms latency. Mitigated by 1-hour cache
- BNPL threshold hardcoded at $50 — Klarna minimum. Afterpay minimum is also $35 (varies by region). Использовать общий threshold $50 для UX consistency

## Зависимости

- `apps/web/src/lib/pricing-constants.ts` — formatter
- `apps/web/src/hooks/queries/useExchangeRate.ts` — rate fetcher
- `apps/web/src/lib/installment-preview.ts` — BNPL helper
- ExchangeRate-API key in env

## Источник

- docs/09_MULTI_CURRENCY.md
- docs/runbooks/stripe-bnpl-setup.md
- CLAUDE.md → "Prices stored in USD cents — convert to other currencies at display time"
