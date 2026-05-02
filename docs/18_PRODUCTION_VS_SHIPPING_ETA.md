# Production vs Shipping ETA — Раздельная коммуникация сроков

> Принцип: handmade-покупатель доверяет точному обещанию мастера и принимает диапазон от почты — но только если оба показаны раздельно.
> Последнее обновление: 2026-05-02
> Issue: #230

---

## Содержание

1. [Контекст и проблема](#1-контекст-и-проблема)
2. [Бизнес-обоснование](#2-бизнес-обоснование)
3. [Анализ рынка — что делают конкуренты](#3-анализ-рынка--что-делают-конкуренты)
4. [Психология handmade-покупателя](#4-психология-handmade-покупателя)
5. [UX-паттерны по экранам](#5-ux-паттерны-по-экранам)
6. [Техническая реализация](#6-техническая-реализация)
7. [План реализации (11-step flow)](#7-план-реализации-11-step-flow)
8. [Метрики успеха](#8-метрики-успеха)
9. [Out of scope](#9-out-of-scope)

---

## 1. Контекст и проблема

После issue #227 каждый продукт имеет два независимых временных параметра:

| Параметр | Источник | Характер |
|---|---|---|
| `productionDays` | `Product.productionDays` (мастер заводит вручную при добавлении товара) | **Точное** — мастер обещает, мастер контролирует |
| Shipping window | `_lib/shipping-options.ts` (Standard 5–7 / Express 2–3) | **Диапазон** — зависит от USPS/FedEx, не от магазина |

В реализации #227 эти два слоя смешаны в одну строку:

```
Estimated delivery: April 8–14
```

**Проблема:** покупатель не понимает, какая часть зависит от мастера, а какая от почты. При любой задержке вся ответственность падает на магазин — даже если посылка просто застряла в карьере на лишние 4 дня.

**Цель issue #230:** разделить эти два слоя визуально и текстово на каждом customer-facing экране.

---

## 2. Бизнес-обоснование

### 2.1 Прямая выручка

| Эффект | Источник данных | Оценка для нашего магазина |
|---|---|---|
| **Снижение cart abandonment** на 5–8% при чётком ETA | Baymard Institute 2024 (~22% бросают из-за непонятных сроков) | При $30K выручки/мес → +$1500–2400 |
| **Увеличение conversion** при показе **дат** вместо "5–7 days" | Baymard split-test studies | +5–8% к conversion на product detail |
| **Меньше отмен после оплаты** (BNPL refunds, Stripe disputes) | Stripe Atlas 2024: ~3% disputes связаны с "delivery longer than expected" | -$300–600/мес в комиссиях за refunds |

### 2.2 Косвенная выручка (long-term)

| Эффект | Механизм |
|---|---|
| **Рост среднего рейтинга в Reviews (#98)** | Покупатель не ставит 3⭐ за "посылка пришла позже чем я ждал" — он видел диапазон до оплаты |
| **Снижение нагрузки на саппорт** на 30–40% | "Where is my order?" тикеты падают: покупатель сам помнит "5 days crafting + 5–7 days shipping" |
| **Repeat purchase rate** | Прозрачность = доверие = повторные покупки. Etsy data 2023: магазины с чёткими сроками имеют +18% repeat buyers |
| **Меньше chargebacks** | "Item not received" chargeback почти невозможен если на checkout явно написано "delivery up to 14 days" |

### 2.3 Риск-менеджмент

Без раздельной коммуникации:
- USPS опаздывает на 3 дня → покупатель винит магазин → 1⭐ отзыв
- Покупатель ожидает товар через "5 дней" (как написано), не понимая что shipping ещё 5–7 дней → discontent

С раздельной коммуникацией:
- Покупатель видит "Crafting: 5 days" + "Shipping: 5–7 days"
- При задержке shipping — атрибуция корректна
- Магазин **разделил риск** — мастер отвечает за свою часть, USPS за свою

---

## 3. Анализ рынка — что делают конкуренты

Поресёрчены 4 ключевые US-площадки, на которые ориентируется handmade-покупатель.

### 3.1 Etsy (#1 handmade-маркетплейс в США)

**Что показывают на product detail:**
- Бейдж "Made to order" в заголовке
- Текст в описании: `"Allow 3–5 business days for processing"`
- Блок "Estimated arrival" с конкретными датами + тултип "Includes processing and shipping time"

**Чему учимся:**
- Чёткий вербальный ярлык **"processing time"** vs **"shipping"** — два разных понятия с разными названиями
- Конкретные даты, не "5–7 days"
- Тултип объясняет логику расчёта

### 3.2 Amazon Handmade

**Что показывают:**
- "Made to Order: This item ships in 2–3 weeks" — сначала упоминается срок до **отправки** (production), потом отдельно carrier transit window
- В корзине: "Ships from Crafty Maker Studio. Arrives between Apr 12–18."

**Чему учимся:**
- Сначала срок **до отправки**, ПОТОМ срок доставки
- Никогда не суммировать в одно число для primary focal point
- Имя мастера/студии — социальное доказательство handmade

### 3.3 Shopify (handmade-темы Bllack, Prestige, Empire)

**Что показывают:**
- На product detail: "Each piece is handmade with care. **Please allow 7–10 business days for crafting** before shipping. Standard shipping then takes 5–7 business days."

**Чему учимся:**
- Эмпатический язык: "with care", "please allow"
- Связка двух фаз: "**before** shipping" — явная последовательность
- Объяснение **почему** долго (handmade) — снижает раздражение

### 3.4 Uncommon Goods

**Что показывают:**
- 2 строки на product detail:
  - "Ships in 1–2 days" (для in-stock)
  - "Made to order — ships in 5–7 days" (для made-to-order)
- При checkout: "Delivery: 3–5 days after dispatch"

**Чему учимся:**
- Минималистичный паттерн — 2 строки, ничего лишнего
- "After dispatch" — ещё один способ разделить production и shipping

### 3.5 Сводные паттерны

| Паттерн | Используют | Заимствуем? |
|---|---|---|
| Разные термины для production vs shipping ("crafting" vs "shipping", "processing" vs "delivery") | Etsy, Shopify, Uncommon Goods | ✅ Да — `crafting` + `shipping` |
| Эмпатичный язык для production | Shopify, Etsy | ✅ Да — "Master crafts your piece" |
| Нейтральный язык для shipping | Все | ✅ Да |
| Конкретные даты вместо "X days" | Etsy, Amazon | ✅ Да — на checkout |
| Тултип/helper текст с объяснением | Etsy | ✅ Да — helper-строка под главной |
| Имя мастера/студии в "Ships from" | Amazon | ❌ Нет (out of scope для #230, можно потом) |

---

## 4. Психология handmade-покупателя

### 4.1 Сегменты целевой аудитории Senichka

| Сегмент | % покупок | Что важно | Как мы отвечаем |
|---|---|---|---|
| **Gift buyer** | ~40% | Уверенность что подарок придёт **к конкретной дате** | Конкретные даты на product detail + checkout, чёткое разделение чтобы покупатель сам мог посчитать буфер |
| **Self-treat buyer** | ~35% | Доверие к мастеру, прозрачность процесса | Эмпатичный язык "Master crafts your piece" — покупает не товар, а ремесло |
| **Repeat buyer** | ~15% | Знание что в этом магазине **честно** говорят сроки | Постоянство копи — в каждой точке одна и та же логика разбивки |
| **First-time browser** | ~10% | Быстро понять "это сейчас или мне ждать" | Бейдж в каталоге + первая строка на product detail |

### 4.2 Когнитивная нагрузка покупателя

При просмотре product detail покупатель за 3–5 секунд должен ответить себе:
1. **Это есть сейчас или под заказ?** (binary решение)
2. **Когда я это получу?** (date estimation)
3. **Это разумный срок для подарка/себя?** (acceptance)

Раздельная коммуникация сокращает шаг #2 — покупателю не надо мысленно складывать диапазоны, мы уже разбили их на понятные блоки.

### 4.3 Доверие и атрибуция вины

Психологический принцип: **диапазон неопределённости должен быть атрибутирован источнику**.

- "Master crafts in 5 days" → доверие мастеру (точная цифра, человек обещает)
- "Shipping 5–7 days standard" → принятие (диапазон, понятно что это carrier, не мастер)

При смешивании ("Estimated delivery 8–14 days") покупатель приписывает **всю** вину магазину при любой задержке. Это эффект **"single accountability"** — одна точка ответственности всегда тот, у кого ты заплатил.

---

## 5. UX-паттерны по экранам

### 5.1 Каталог (ProductCard) — без изменений

Уже сделано в #225/#227 — короткий бейдж на карточке:
- "Made to order — ready in 5 days"
- "One of a kind"
- "Sold out"

### 5.2 Product detail page — переделать ETA-блок

#### Текущий вариант (после #227, **плохо**):
```
[Made on order — ready in 5 business days]
```

#### Новый вариант — три сценария:

**A. `stock = 1` (одна штука готова к отправке):**
```
✅ In stock — ships within 1 business day
   Standard delivery: 5–7 business days
```
- Зелёный фон (`bg-green-50` / `dark:bg-green-950/40`)
- Главная строка — жирная
- Helper — `text-muted-foreground`

**B. `stock = 0` (под заказ):**
```
🔨 Master crafts your piece in 5 business days
   Then ships in 5–7 business days standard
```
- Accent фон (`bg-accent/20`)
- Главная строка — выделенная (commitment мастера)
- Helper — нейтральная (про почту)

**C. `stock = 0 && stockType = ONE_OF_A_KIND` (sold out):**
```
❌ Sold out — this piece was one of a kind
```
- Destructive фон
- Без помощи про shipping

### 5.3 Cart line item — только production

Покупатель в корзине ещё не выбрал shipping option, поэтому в строке товара показываем **только production** — то, что зависит от продукта:

| Состояние | Копи под названием |
|---|---|
| `productionDays === 0` | `Ready to ship today` |
| `productionDays > 0` | `Master crafts in {days} business days` |

⚠️ Shipping в cart row упоминать **не надо** — это шум, и shipping ещё не выбран.

### 5.4 Checkout order summary — три строки разбивки

#### Текущий вариант (плохо):
```
Estimated delivery: April 8–14
```

#### Новый вариант:
```
Crafting:           up to 5 business days   (если max productionDays > 0)
Shipping:           5–7 business days standard
─────────────────────────────────────────
Estimated delivery: April 8–14, 2026
```

- Каждая фаза — отдельная строка с понятным labelом
- Финальная дата — **суммарная** (логика расчёта не меняется)
- Если все товары `productionDays === 0` → строку Crafting **скрыть**

### 5.5 Order confirmation page (расширение, опционально)

В подтверждении заказа повторить ту же разбивку, плюс эмпатичный текст:
> "Your piece will be crafted with care over the next 5 business days, then shipped via USPS Standard. We'll email you when it's on its way."

⚠️ Это **расширение scope** — в #230 не входит. Можно вынести в отдельный мелкий issue (#231) или сделать в рамках более крупного "Order confirmation polish".

---

## 6. Техническая реализация

### 6.1 Источники данных (без изменений после #227)

| Параметр | Источник | Тип |
|---|---|---|
| `productionDays` | `Product.productionDays` (БД, через admin form) | `number` (точное) |
| Standard shipping window | `_lib/shipping-options.ts` → `{ businessDaysMin: 5, businessDaysMax: 7 }` | range (диапазон) |
| Express shipping window | то же → `{ businessDaysMin: 2, businessDaysMax: 3 }` | range |

**Никаких новых полей в БД, DTO, или API не требуется.**

### 6.2 Новые helper-утилиты

Создать `apps/web/src/app/[locale]/checkout/_lib/format-eta.ts` — единая точка правды для форматирования ETA-копи:

```ts
import type { ShippingOption } from './shipping-options'

type TranslateFn = ReturnType<typeof useTranslations>

/**
 * Standalone shipping window without dates — "5–7 business days standard".
 * Used as helper line on product detail and as a row on checkout summary.
 */
export function formatShippingWindow(option: ShippingOption, t: TranslateFn): string

/**
 * Production-only line for cart row — "Master crafts in 5 business days".
 * Returns null when productionDays === 0 (in stock — different copy path).
 */
export function formatProductionLine(productionDays: number, t: TranslateFn): string | null
```

Копи помещать в утилиты **нельзя** (i18n) — функции возвращают `t(key, params)`.

### 6.3 Что меняется в компонентах

| Файл | Изменение | Сложность |
|---|---|---|
| `apps/web/src/app/[locale]/shop/[slug]/_components/product-info.tsx` | Заменить single-line ETA на 2-line блок (main + helper) | Средняя |
| `apps/web/src/app/[locale]/cart/_components/cart-item-row.tsx` | Убрать shipping упоминание, оставить только production-копи | Малая |
| `apps/web/src/app/[locale]/checkout/_components/checkout-order-summary.tsx` | Single-line "Estimated delivery" → 3-line breakdown | Средняя |
| `apps/web/src/app/[locale]/checkout/_lib/format-eta.ts` (новый) | Helper-утилиты | Малая |

### 6.4 Логика расчёта суммарной даты — без изменений

В `checkout-order-summary.tsx` уже есть после #227:

```ts
const longestProductionDays = cartItems.reduce(
  (maxDays, item) => Math.max(maxDays, item.productionDays ?? 0), 0,
)
const delivery = calculateEstimatedDelivery(
  displayOption.businessDaysMin + longestProductionDays,
  displayOption.businessDaysMax + longestProductionDays,
)
```

Логика остаётся — меняется только **отображение** (вместо одной строки — три). Это снижает риск регресса в дате.

### 6.5 i18n — 8 новых ключей × 3 языка = 24 строки

| Ключ | EN |
|---|---|
| `productDetail.shipsWithinOneDay` | Ships within 1 business day |
| `productDetail.standardShippingHelper` | Standard delivery: 5–7 business days |
| `productDetail.masterCraftsLine` | Master crafts your piece in {days} business days |
| `productDetail.thenShipsHelper` | Then ships in 5–7 business days standard |
| `cartPage.readyToShipToday` | Ready to ship today |
| `cartPage.masterCraftsLine` | Master crafts in {days} business days |
| `checkoutPage.craftingLine` | Crafting: up to {days} business days |
| `checkoutPage.shippingLine` | Shipping: {min}–{max} business days {option} |

(RU и ES — переводятся при имплементации.)

### 6.6 Тесты

| Что | Тип | Файл |
|---|---|---|
| `formatShippingWindow()` корректно форматирует 5–7 / 2–3 | Unit | `_lib/__tests__/format-eta.test.ts` (новый) |
| `formatProductionLine()` возвращает `null` для 0 дней | Unit | то же |
| Product detail — 2 строки для in-stock | RTL | `product-info.test.tsx` |
| Product detail — crafting + helper для made-on-order | RTL | то же |
| Cart row — "Ready to ship today" для in-stock | RTL | `cart-item-row.test.tsx` (обновить) |
| Cart row — "Master crafts in N days" для made-on-order | RTL | то же |
| Checkout summary — 3 строки разбивки | RTL | `checkout-order-summary.test.tsx` (обновить) |
| Checkout summary — строка Crafting скрыта при 0 productionDays | RTL | то же |

---

## 7. План реализации (11-step flow)

| Step | Действие | Время |
|---|---|---|
| 1–4 | Verify #227 merged · Move #230 to In Progress · Pull main · Branch `feature/issue-230-eta-split` | 5 мин |
| 5 | Read docs (`11_UX_MINIMAL_FRICTION.md` + этот документ) | 5 мин |
| 6.1 | Создать `format-eta.ts` helper утилиту с unit тестами | 20 мин |
| 6.2 | Переделать `product-info.tsx` (2-line ETA блок) | 20 мин |
| 6.3 | Обновить `cart-item-row.tsx` (production-only копи) | 10 мин |
| 6.4 | Переделать `checkout-order-summary.tsx` (3-line breakdown) | 25 мин |
| 6.5 | i18n keys: 8 ключей × 3 языка = 24 строки | 15 мин |
| 7 | Обновить и добавить тесты (см. секцию 6.6) | 30 мин |
| 8 | `pnpm --filter web test:run` + `pnpm --filter api test` | 5 мин |
| 9 | `pnpm lint` + `pnpm format:check` | 5 мин |
| 10 | Final report + commit message | 10 мин |
| 11 | Per-file walkthrough | 15 мин |

**Итого:** ~3 часа активной работы.

---

## 8. Метрики успеха

Замеры через 30 дней после релиза, baseline = последние 30 дней до релиза #230.

| Метрика | Где смотреть | Целевое значение |
|---|---|---|
| Отношение "where is my order?" тикетов к заказам | Email logs / support inbox | ≤5% (vs ~10–15% baseline по индустрии) |
| Cart abandonment rate | GA4 / PostHog funnel | -5% к baseline |
| Average rating отзывов упоминающих сроки | Reviews (#98) с фильтром по ключевым словам "shipping/delivery/late/wait" | >4.5/5 |
| Chargebacks "item not received in time" | Stripe Dashboard | 0 в первый месяц |
| Conversion rate product detail → cart | GA4/PostHog event funnel | +3–5% к baseline |

Если хотя бы **3 из 5** метрик улучшились — feature считается успешной.

---

## 9. Out of scope

Намеренно вынесено за рамки #230 — отдельные потенциальные issues:

| Что | Куда | Когда делать |
|---|---|---|
| **Real carrier tracking** (EasyPost/Shippo/AfterShip) | #125 (уже в backlog) | После первой выручки |
| **Per-zip shipping calculation** | Новый issue | При расширении на международные продажи |
| **Capacity throttling** (если мастер перегружен — backorder со сдвигом срока) | Новый issue | После 10+ заказов в неделю |
| **Order confirmation rewrite** (расширенный copy с эмпатикой) | Новый issue (мелкий, sp:1) | Опционально вместе с #230 |
| **Email templates с разбивкой production/shipping** | Расширение `transactional emails` issue | После #230 |
| **"Ships from {studio name}"** социальное доказательство (Amazon-style) | Новый issue | Когда будет реальное имя studio в брендинге |

---

## 10. No permanent sold-out (#231)

### Проблема, обнаруженная при тестировании #230

После #230 в каталог попал пример sold-out изделия (`Black Onyx Statement Pendant`, `ONE_OF_A_KIND + stock=0`). Покупатель видит:

- Disabled кнопку "Sold out"
- Ярлык "Originally one of a kind, now gone forever"

Это **антипаттерн для handmade** — теряем продажи там, где мастер мог бы выполнить заказ.

### Research: handmade-индустрия не имеет permanent sold-out

| Магазин | Поведение при stock=0 |
|---|---|
| **Etsy (handmade)** | Никогда не показывает "Sold out". Кнопка `Add to Cart` остаётся активной. Ярлык "Made just for you" |
| **Amazon Handmade** | "Made to order" badge. Кнопка активна. Срок: "This item ships in X weeks" |
| **Shopify Custom Studio** | Любой stock=0 → "Pre-Order" / "Made to Order". Никакого "Sold out" |
| **Catbird (NYC handmade)** | НЕТ permanently sold out. "Crafted in 4 weeks" даже когда stock=0 |
| **Local Eclectic** | Sold-out существует **только** для truly limited drops (заявленных заранее) |
| **Uncommon Goods** | Различает "In stock" vs "Made to order" — оба активны |

**Ключевой инсайт:** в handmade ожидание = "мастер всегда может изготовить ещё одно". Permanently sold-out — антипаттерн.

### Бизнес-решения #231

1. **Удалить permanent sold-out UX** — все продукты orderable, независимо от stockType
2. **`productionDays` обязательное поле** на уровне backend DTO + Zod, когда `stock=0`
   - 4 уровня защиты: form → Zod → DTO → seed
3. **ONE_OF_A_KIND + stock=0** — особая копи: "Originally one of a kind — we can craft a similar piece in {days} business days"
4. **stockType остаётся** как marketing label, но не блокирует ordering

### Cross-field validation

**Backend** — `apps/api/src/products/dto/create-product.dto.ts`:
- Custom decorator `@ProductionDaysRequiredWhenOutOfStock` на поле `productionDays`
- Использует `@ValidateIf` для conditional optionality:
  - Если `stock=1` → field может быть undefined
  - Если `stock=0` → field обязателен и `>= 1`

**Frontend** — `apps/web/src/app/[locale]/admin/products/_lib/create-product-schema.ts`:
- `.superRefine()` на корне zod-схемы
- Та же логика что backend: `stock=0 && productionDays<1` → ошибка с `path: ['productionDays']`

### UX changes

| Surface | Было | Стало |
|---|---|---|
| `product-card.tsx` (catalog overlay) | Полупрозрачный overlay "Sold out" поверх фото | Удалён. Только бейдж "Made to order — N days" |
| `product-info.tsx` (product detail) | Блок "Sold out — this piece was one of a kind" + disabled CTA | Блок "Originally one of a kind — we can craft a similar piece in N days" + active CTA |
| `add-to-cart-button.tsx` | Disabled "Sold out" branch для ONE_OF_A_KIND+stock=0 | Branch удалён. Кнопка всегда активна |
| `buy-now-button.tsx` | Disabled при ONE_OF_A_KIND+stock=0 | Disabled удалён |
| `wishlist-manager.tsx` | Spec card с "Sold out" вместо CTA для ONE_OF_A_KIND+stock=0 | Удалено. CTAs показываются всегда |

### Семантика в коде

| Вычисляемая переменная | До #231 | После #231 |
|---|---|---|
| `isPermanentlySoldOut` | `stockType === 'ONE_OF_A_KIND' && stock === 0` | **удалена** |
| `isOneOfAKindReorderable` | — (не было) | `stockType === 'ONE_OF_A_KIND' && stock === 0` (только для копи) |
| `isMadeOnDemand` | `stock === 0 && !isPermanentlySoldOut` | `stock === 0` (без exclusion) |

---

## Связанные документы

- [docs/11_UX_MINIMAL_FRICTION.md](11_UX_MINIMAL_FRICTION.md) — общие принципы checkout UX
- [docs/08_ORDER_STATUS_MODEL.md](08_ORDER_STATUS_MODEL.md) — статусы заказа и их переходы
- [docs/06_ECOMMERCE_BEST_PRACTICES.md](06_ECOMMERCE_BEST_PRACTICES.md) — общие e-commerce принципы
- Issue #227 — исходная feature (binary stock + productionDays)
- Issue #230 — split production vs shipping ETA copy
- Issue #231 — no permanent sold-out + required productionDays
