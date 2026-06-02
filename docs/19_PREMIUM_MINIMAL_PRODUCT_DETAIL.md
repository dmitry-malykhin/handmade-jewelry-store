# Premium-Minimal Product Detail UX

> Принцип: trust + provenance + concrete delivery date — без aggressive sales tactics, которые удешевляют премиум-бренд.
> Последнее обновление: 2026-05-03
> Issue: #232

---

## Содержание

1. [Контекст и цель](#1-контекст-и-цель)
2. [Бизнес-обоснование](#2-бизнес-обоснование)
3. [Что НЕ делаем (rejected approaches)](#3-что-не-делаем-rejected-approaches)
4. [Анализ конкурентов](#4-анализ-конкурентов)
5. [Финальный design system для product detail](#5-финальный-design-system-для-product-detail)
6. [Техническая реализация](#6-техническая-реализация)
7. [План реализации (11-step flow)](#7-план-реализации-11-step-flow)
8. [Метрики успеха](#8-метрики-успеха)
9. [Out of scope](#9-out-of-scope)

---

## 1. Контекст и цель

После #227/#230/#231 product detail имеет функциональный UX, но **generic** — без узнаваемого премиум-качества. Senichka позиционируется в одном ряду с Catbird ($60–$300), Mejuri ($40–$200), Aurate ($90–$400). При этих ценах покупатель ожидает определённого UX-кода: trust, provenance, certainty.

**Goal:** добавить 4 точечных улучшения на product detail, которые:
1. Усиливают доверие через trust signals
2. Делают maker'a видимым (provenance)
3. Дают конкретную дату вместо "5–7 days" диапазона
4. Refine'ят stock indicator от colored block к минималистичному dot-style

Всё — в premium-min tone. Никакой scarcity, urgency, social proof popovers.

---

## 2. Бизнес-обоснование

### Прямая выручка — research-backed conversion impact

| Приём | Δ conversion | Источник |
|---|---|---|
| Trust badges/signals под CTA | **+2–4%** (checkout) | Baymard Institute 2024 — основано на 50+ split-tests |
| Concrete delivery date vs "X-Y days" range | **+5–8%** (product detail → cart) | Baymard split-test studies |
| Maker provenance ("Made in [city]") | **+3–6%** на premium handmade | Etsy Seller Handbook 2023 |
| Visual hierarchy refinement (clean vs colored block) | Subjective | Mejuri / Catbird brand guidelines |

При $30K выручки/мес и совокупном эффекте +10–18% — это **+$3K–$5.4K/мес** только от этих 4 правок.

### Косвенная выручка (long-term)

| Эффект | Механизм |
|---|---|
| **Aligned with premium positioning** | Mejuri / Catbird / Aurate выглядят как premium бренд именно из-за этих сигналов. Без них — выглядит как Etsy seller. |
| **Снижение возвратов** | Concrete delivery date устанавливает правильные ожидания → меньше "I expected it sooner" разочарований |
| **Better word-of-mouth** | Клиенты premium-magazinov делятся опытом. "Crafted in NYC" звучит лучше чем "shipped from warehouse" |
| **Foundation для post-launch optimization** | Когда analytics приедет (PostHog #119), будем оптимизировать на этом фундаменте, а не на generic UX |

### Risk анализ — что мы НЕ оптимизируем

| Что игнорируем | Почему |
|---|---|
| Short-term clicks с aggressive UX | Потенциал: +5–10% conversion. Цена: повредит премиум-восприятию навсегда |
| A/B testing инфраструктура | Не настроена. Будет post-launch (#147 QA + #119 PostHog) |
| Personalization | Нет user data. Premature |
| Live chat / live operator | Не нужен на $60–$150 SKU |

---

## 3. Что НЕ делаем (rejected approaches)

Нужно явно зафиксировать, чего избегаем — потому что эти приёмы будут предложены AI / советчиками, и важно иметь готовый ответ "почему нет".

### Rejected: Countdown timers

> "Order in next 2:34:21 for delivery by [date]"

**Почему отклонено:** на премиум-брендах смотрится как ad spam. Mejuri использует БЕЗ countdown ("Order in next 4h for delivery by [date]") — это OK потому что без visible счётчика. Visible countdown = AliExpress-vibe.

### Rejected: Scarcity ("Only 1 left")

> "🔥 Only 1 left!"

**Почему отклонено:** для нашего магазина stock=1 — это default state (handmade, всегда 1 экземпляр). Показывать как scarcity — манипуляция. Catbird/Mejuri никогда не используют, даже когда у них реально мало товара.

### Rejected: Social proof popovers

> "John from NYC just bought this"  
> "12 people viewing this now"

**Почему отклонено:** все знают что это автоматические скрипты, не реальные данные. Премиум-брендам несовместимо.

### Rejected: Countdown progress bars / scarcity meters

> "🔥 Selling fast — 73% claimed"

**Почему отклонено:** for handmade where stock=1, smetering имеет нулевой смысл. Просто визуальный шум.

### Rejected: Bold/red CTAs

> Большая красная кнопка "BUY NOW!"

**Почему отклонено:** Mejuri / Catbird используют outline-style или subtle solid CTAs. Большая красная — paramount of cheap-vibe.

### Rejected: Process diagrams

> Schematic Order → Craft → Ship → Deliver с иконками

**Почему отклонено:** education-y для DIY-ниши, а не премиум-jewelry. Premium clients это и так понимают.

---

## 4. Анализ конкурентов

### Catbird (NYC handmade premium, $60–$300)

URL pattern: `catbirdnyc.com/products/...`

**Stock indicator:**
- Простой текст под price: "Ships in 3-4 weeks" или "Ready to ship in 2 days"
- Без colored block, без иконок
- Цвет — обычный foreground

**Trust block:**
- Маленькая строка под CTA: "Free shipping over $250 · Free returns"
- Один-line, серый цвет, без иконок
- Никаких эмодзи

**Maker info:**
- Короткая строка "Made in NYC" в materials section
- Линк на "About" — отдельная страница

**Estimated delivery:**
- "Standard delivery: arrives by Apr 14"
- Конкретная дата, не диапазон
- Один-line

**CTA:**
- "Add to Bag" — outline-style, без яркости
- Hover — становится solid, всё ещё brand-color

### Mejuri (Toronto premium minimalist, $40–$200)

**Stock indicator:**
- "Ready to Ship" или "Made to Order — ships by Apr 12"
- Просто текст, маленький, серый

**Trust block:**
- "Free shipping & easy returns" — серая строка под CTA
- Без иконок

**Maker info:**
- "Designed in Toronto, made in Italy" — factual
- В materials section, не выпячено

**Estimated delivery:**
- "Order in next 4h for delivery by Apr 14"
- ОЧЕНЬ конкретно, но без visible countdown

**CTA:**
- "Add to Bag" — solid black на белом фоне
- Простая, premium

### Aurate (NYC sustainable premium, $90–$400)

**Stock indicator:**
- "In Stock" — зелёный мелкий текст
- "Made to Order: 4-6 weeks" — серый текст

**Trust block:**
- 3 элемента с маленькими иконками + текст: returns, secure, sustainable
- Размер 12px, серый цвет

**Maker info:**
- "Made in NYC studio" — выделено через small heading
- Sustainability angle — separate section

**Estimated delivery:**
- Точная дата с лёгким цветовым акцентом

### Wwake (LA premium delicate, $80–$500)

**Stock indicator:**
- Минимально: краткое предложение
- "Pieces are made to order — ships in approximately 4-6 weeks"

**Trust:**
- Под CTA одна строка с pipe-separators
- "Complimentary shipping · Lifetime warranty · 100-day returns"

**Maker:**
- "Made in LA" в Materials section

### Local Eclectic (curated handmade, $30–$200)

**Stock indicator:**
- "In stock" / "Made to order — 2–4 weeks"
- Краткая строка

**Trust:**
- "Free U.S. shipping over $75" под CTA

**Maker:**
- Brand story в отдельной секции — линк "Meet the artist"

### Сводные паттерны

| Pattern | Frequency | Adopted in #232? |
|---|---|---|
| Stock-state как короткий текст (не block) | 5/5 | ✅ Yes |
| Trust signals под CTA, маленьким серым шрифтом | 5/5 | ✅ Yes |
| Конкретная дата доставки | 4/5 | ✅ Yes |
| Maker provenance inline | 4/5 | ✅ Yes |
| Process diagram | 0/5 | ❌ Reject |
| Countdown / scarcity | 0/5 | ❌ Reject |
| Big colored CTA | 0/5 | ❌ Already not doing |
| Иконки рядом с trust signals | 2/5 | ⚠️ Optional — обсудим |

---

## 5. Финальный design system для product detail

### 5.1 Stock state indicator — три варианта

**Pattern:** маленькая цветная точка `●` + текст. Без colored backgrounds, без border blocks.

#### A. In stock (`stock=1`)

```
●  In stock — ready to ship today
   Standard delivery: 5–7 business days · arrives by Apr 14
```

- Точка: `bg-green-600 dark:bg-green-400`
- Главная строка: `text-sm font-medium text-foreground`
- Helper: `text-xs text-muted-foreground`
- Date: `text-xs text-muted-foreground` (или с лёгким акцентом)

#### B. Made to order (`stock=0`, кроме ONE_OF_A_KIND)

```
●  Made to order — crafted in 5 business days
   Then ships in 5–7 business days · arrives by Apr 22
```

- Точка: `bg-amber-500 dark:bg-amber-400`
- Остальное идентично

#### C. ONE_OF_A_KIND reorderable (`stock=0` + ONE_OF_A_KIND)

```
●  Originally one of a kind — re-crafted in 2 business days
   Then ships in 5–7 business days · arrives by Apr 13
```

- Точка: `bg-muted-foreground` (нейтрально)
- Тон: factual, не destructive

### 5.2 Trust block (под CTA)

Pattern:
```
Free returns within 30 days  ·  Secure checkout  ·  Handcrafted in [city]
```

- Размер: `text-xs`
- Цвет: `text-muted-foreground`
- Разделитель: точка `·` с пробелами
- Без иконок (premium-минимализм; если решим добавить — small/uniform/один цвет)
- На narrow viewports: stack вертикально

### 5.3 Maker provenance line

Pattern:
```
Crafted in our Senichka studio
```

- Размещение: после description, перед dimensions
- Размер: `text-sm`
- Цвет: `text-muted-foreground`
- Один factual sentence
- Link опционально: "About the studio →" (post-MVP — separate page)

### 5.4 Estimated delivery date

Pattern:
```
... arrives by Apr 14
```

- Появляется в helper-line stock indicator (см. 5.1)
- Использует `calculateOrderEta` из #230 + `formatDeliveryRange` (или новый `formatSingleDeliveryDate`)
- Latest date — самая правдивая (under-promise, over-deliver)

---

## 6. Техническая реализация

### 6.1 Новые/изменённые файлы

| Файл | Что меняется | Сложность |
|---|---|---|
| `apps/web/src/lib/constants/studio.ts` (NEW) | `STUDIO_NAME`, `STUDIO_CITY` константы | XS |
| `apps/web/src/app/[locale]/products/[slug]/_components/product-info.tsx` | Stock indicator: dot + text · Trust block · Maker line · Concrete delivery date | M |
| `apps/web/src/app/[locale]/checkout/_lib/format-eta.ts` | Optional: `formatLatestDeliveryDate(option, productionDays)` helper | XS |
| `apps/web/messages/{en,ru,es}.json` | ~10 новых i18n ключей | S |

### 6.2 Studio constants

```ts
// apps/web/src/lib/constants/studio.ts

/**
 * Senichka studio identity. Used across product detail, footer, about page,
 * and email templates. Single source of truth — change here to update everywhere.
 */
export const STUDIO_NAME = 'Senichka'
export const STUDIO_CITY = 'Irvine, CA' // адрес мастера; placeholder, обновим под бренд
```

Если studio-info нужны на server и client — экспорт строк безопасен (нет process.env).

### 6.3 New i18n keys

| Ключ | EN value |
|---|---|
| `productDetail.inStockMainLine` | "In stock — ready to ship today" *(replaces existing — slight wording change)* |
| `productDetail.deliveryByDate` | "arrives by {date}" |
| `productDetail.trustReturns` | "Free returns within 30 days" |
| `productDetail.trustSecure` | "Secure checkout" |
| `productDetail.trustHandcrafted` | "Handcrafted in {city}" |
| `productDetail.makerLine` | "Crafted in our {studio} studio" |

(2 keys reused unchanged: `inStockHelperLine`, `madeOnDemandHelperLine`. Plus existing `madeOnDemandMainLine`, `oneOfAKindReorderableMain` get slight rewording.)

### 6.4 Logic для concrete delivery date

В `product-info.tsx` рассчитываем для **standard shipping** (default option):

```ts
const standardOption = SHIPPING_OPTIONS.find((o) => o.id === 'standard')!
const productionDays = product.stock === 0 ? product.productionDays : 0
const delivery = calculateOrderEta(productionDays, standardOption)
// .latest — самая поздняя из range; under-promise, over-deliver
const arriveByDate = formatDeliveryRange(delivery.earliest, delivery.latest).split('–').pop()?.trim()
```

Hmm — `formatDeliveryRange` возвращает range "Apr 8–14". Нам нужна одна дата. Создадим помощника:

```ts
// format-eta.ts addition
export function formatLatestDeliveryDate(productionDays: number, option: ShippingOption): string {
  const delivery = calculateOrderEta(productionDays, option)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(delivery.latest)
}
```

### 6.5 Tests

- Existing tests — `cart-item-row.test.tsx`, `checkout-order-summary.test.tsx` — не должны сломаться (мы меняем только product-info.tsx + добавляем formatter)
- `format-eta.test.ts` — добавить тест для `formatLatestDeliveryDate`
- `product-info.tsx` — Server Component, не имеет unit-тестов; покрытие через E2E (#45)

---

## 7. План реализации (11-step flow)

| Step | Действие | Время |
|---|---|---|
| 1–4 | Verify previous merged · Move #232 to In Progress · Pull main · Branch | 5 мин |
| 5 | Re-read this doc | 2 мин |
| 6.1 | Create `lib/constants/studio.ts` | 5 мин |
| 6.2 | Add `formatLatestDeliveryDate` to `format-eta.ts` + unit test | 15 мин |
| 6.3 | Refactor `product-info.tsx`: stock dot + trust block + maker line + delivery date | 40 мин |
| 6.4 | i18n: 5 new keys + 2 reworded × 3 langs | 15 мин |
| 7 | Update existing tests if assertions break (likely none) | 10 мин |
| 8 | `pnpm test:run` (web + api) | 5 мин |
| 9 | `pnpm lint` + `pnpm format:check` | 5 мин |
| 10 | Final report + commit message | 10 мин |
| 11 | Per-file walkthrough | 10 мин |

**Итого:** ~2 часа активной работы.

---

## 8. Метрики успеха

Замеры через 30 дней после релиза + первого организического трафика, baseline = аналитика после первых 1000 visits на /products/[slug].

| Метрика | Где смотреть | Целевое значение |
|---|---|---|
| Product detail → Add to cart conversion | GA4 / PostHog event funnel | +5% к baseline |
| Bounce rate на product detail | GA4 | -3% к baseline |
| Avg time on product detail | GA4 | +10% (читают provenance, trust signals) |
| Качество отзывов (про "expectations") | Reviews (#98) | >4.5/5 на отзывы упоминающие сроки/доставку |

Если хотя бы 2 из 4 метрик улучшились — feature успешна.

---

## 9. Out of scope

Намеренно вынесено за рамки #232:

| Что | Куда | Когда |
|---|---|---|
| **Trust signals на checkout** | Расширение в follow-up issue | Если данные покажут last-step abandonment |
| **Maker bio page** | Новый issue | Когда будут реальные фото мастера |
| **Iconography для trust block** | Re-evaluate post-launch | Если данные покажут что текст недостаточен |
| **A/B testing infra** | #147 (QA infra) + #119 (PostHog) | Уже в backlog |
| **Структурированные reviews для конкретного stock state** | Post-launch | Когда будет 50+ reviews |
| **Email templates с теми же signals** | Расширение Resend transactional emails | Follow-up |
| **Newsletter signup на product detail** | Уже есть в Footer (#96) | Не дублируем |

---

## Связанные документы

- [docs/11_UX_MINIMAL_FRICTION.md](11_UX_MINIMAL_FRICTION.md) — общие принципы checkout UX
- [docs/18_PRODUCTION_VS_SHIPPING_ETA.md](18_PRODUCTION_VS_SHIPPING_ETA.md) — split production vs shipping ETA
- Issue #227 — binary stock + productionDays
- Issue #230 — split production vs shipping copy
- Issue #231 — no permanent sold-out
- Issue #232 — это (premium-min product detail polish)
