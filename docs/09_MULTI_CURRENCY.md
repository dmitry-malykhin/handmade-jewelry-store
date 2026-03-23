# Multi-Currency Support — Handmade Jewelry Store

> Анализ требований, стоимости и технической реализации поддержки нескольких валют.
> Статус: **Post-MVP** — не блокирует запуск, внедрить после первых 100 продаж.
> Последнее обновление: 2026-03-23

---

## Содержание

1. [Нужно ли это и когда](#1-нужно-ли-это-и-когда)
2. [Какие валюты и рынки](#2-какие-валюты-и-рынки)
3. [Архитектурные решения](#3-архитектурные-решения)
4. [Exchange Rate API — выбор и стоимость](#4-exchange-rate-api--выбор-и-стоимость)
5. [Stripe и мультивалютность](#5-stripe-и-мультивалютность)
6. [Налоги — главное препятствие для EU](#6-налоги--главное-препятствие-для-eu)
7. [Изменения в схеме БД](#7-изменения-в-схеме-бд)
8. [Frontend — Currency Switcher](#8-frontend--currency-switcher)
9. [Backend — Currency Service](#9-backend--currency-service)
10. [Пошаговый план внедрения](#10-пошаговый-план-внедрения)
11. [Итоговые затраты](#11-итоговые-затраты)

---

## 1. Нужно ли это и когда

### Почему не MVP

Для старта (первые 6-12 месяцев):
- Целевой рынок — **США** (USD). Etsy, Amazon Handmade, Shopify — все крупные игроки допускают цены только в USD для US-магазинов
- Stripe автоматически конвертирует USD → карта покупателя при оплате (даже если покупатель из Европы)
- Сложность: multi-currency добавляет ~2 недели разработки + налоговую головную боль

### Когда внедрять

Индикаторы, что пора:
- **>20% трафика из EU/UK/CA** (по Google Analytics)
- **Жалобы на "confused by USD prices"** в отзывах или email
- **$5k+ MRR** — есть бюджет на доп. инфраструктуру

---

## 2. Какие валюты и рынки

| Валюта | Рынок | Потенциал | Сложность |
|---|---|---|---|
| USD | США | Основной (100%) | Есть (база) |
| CAD | Канада | Высокий (близкая культура) | Низкая |
| GBP | Великобритания | Средний | Средняя |
| EUR | EU (20+ стран) | Высокий | Высокая (VAT!) |
| AUD | Австралия | Низкий | Низкая |

### Рекомендуемая очерёдность

1. **USD** — старт (MVP)
2. **CAD + GBP** — первые 6 месяцев после запуска (простые рынки, нет VAT сложности)
3. **EUR** — после решения вопроса с EU VAT / OSS scheme
4. **AUD** — по требованию

---

## 3. Архитектурные решения

### Ключевое решение: хранить в USD, конвертировать при отображении

```
DB:       price = $68.00 USD (всегда USD)
          ↓
Backend:  ExchangeRateService.convert(68.00, 'USD', 'EUR') = €62.50
          ↓
Frontend: показывает €62.50
          ↓
Stripe:   PaymentIntent создаётся в EUR (€62.50) — Stripe нативно поддерживает
```

**Почему не хранить в нескольких валютах?**
- Курсы меняются → нужно постоянно обновлять все цены
- Аналитика усложняется (нужен "canonical" USD для сравнения)
- Stripe best practice: хранить в base currency, конвертировать в presentment currency

### Кеширование курсов

Курсы обновлять раз в час (не на каждый запрос!):
```
Redis / in-memory cache:
  key: "exchange_rates:USD"
  value: { EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.54 }
  TTL: 3600 seconds (1 hour)
```

Если Redis нет (MVP) — кеш в памяти NestJS singleton (достаточно для начала).

---

## 4. Exchange Rate API — выбор и стоимость

### Сравнение провайдеров

| Провайдер | Free Tier | Paid | Обновления | Рекомендация |
|---|---|---|---|---|
| **ExchangeRate-API** | 1,500 req/month | $10/mo (100k req) | Ежечасно | ✅ Лучший free tier |
| **Open Exchange Rates** | 1,000 req/month | $12/mo | Ежечасно | Хороший |
| **Fixer.io** | 100 req/month | $10/mo | Ежечасно | Слабый free |
| **CurrencyFreaks** | 1,000 req/month | $8/mo | Ежечасно | Альтернатива |
| **Frankfurter** | Бесплатно (ECB) | Бесплатно | Ежедневно | Только EUR |

### Вывод

**ExchangeRate-API** на free tier:
- 1,500 req/month ≈ 50 req/day
- При кешировании на 1 час: 24 req/day для 4 валют — укладывается в лимит
- При росте нагрузки переход на paid ($10/mo) без смены API

---

## 5. Stripe и мультивалютность

### Как работает presentment currency в Stripe

```typescript
// При создании PaymentIntent
const paymentIntent = await stripe.paymentIntents.create({
  amount: 6250,         // €62.50 в центах
  currency: 'eur',      // presentment currency (что видит покупатель)
  // Stripe автоматически конвертирует в USD для вашего Stripe account balance
})
```

### Что нужно включить в Stripe Dashboard

1. **Multi-currency settlements** — Stripe > Settings > Payouts
2. **Automatic currency conversion** — включено по умолчанию
3. Stripe fee: **2.9% + $0.30** — одинаково для всех валют
4. Stripe берёт ~1% за конвертацию (если оплата в EUR, вывод в USD)

### Apple Pay / Google Pay + multi-currency

Apple Pay и Google Pay автоматически поддерживают любую валюту Stripe. Никаких дополнительных действий не требуется.

### Refunds в мультивалютном сценарии

При возврате Stripe делает refund в той валюте, в которой был платёж:
```
Покупатель платил €62.50 → refund €62.50
(Вы теряете конвертационные потери если USD/EUR курс изменился)
```

Это стандартное поведение — документировать в политике возврата.

---

## 6. Налоги — главное препятствие для EU

### Проблема EU VAT

При продаже в страны EU:
- Если продажи в EU > **€10,000/год** — нужно зарегистрировать VAT в EU
- OSS scheme (One-Stop Shop) позволяет платить VAT централизованно через одну страну EU
- Ставки VAT: Германия 19%, Франция 20%, Испания 21% и т.д.

### Варианты решения

| Вариант | Стоимость | Когда |
|---|---|---|
| **Игнорировать EU** (<$10k/year) | $0 | До ~€10k/year в EU продажах |
| **TaxJar** (US + EU) | $19-99/mo | При серьёзных EU продажах |
| **Avalara** | $50-200/mo | Enterprise уровень |
| **Quaderno** | $49/mo | Хорошо для маленьких магазинов |
| **DIY OSS registration** | Время + бухгалтер | Самостоятельно |

### Практическая рекомендация

**До €10,000 в год от EU покупателей** (что долго при нашем объёме):
- Просто добавить CAD и GBP (нет сложных EU VAT правил)
- EUR добавить, но добавить в Terms of Service пункт "Prices shown exclude VAT"
- При пересечении €10k → подключить TaxJar ($19/mo)

---

## 7. Изменения в схеме БД

### UserPreference (после реализации Auth)

```prisma
model UserPreference {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id])
  currency     String   @default("USD")   // ISO 4217: USD, EUR, GBP, CAD, AUD
  locale       String   @default("en-US") // BCP 47: en-US, de-DE, fr-FR, en-CA
  measurementSystem String @default("imperial") // "imperial" | "metric"
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### Order — добавить currency fields

```prisma
model Order {
  // ... существующие поля ...
  currency         String   @default("USD")    // в какой валюте оформлен заказ
  exchangeRateAtOrder Decimal? @db.Decimal(10, 6) // курс на момент заказа (для аудита)
  totalInCurrency  Decimal? @db.Decimal(10, 2) // сумма в валюте покупателя
}
```

**Зачем `exchangeRateAtOrder`?** Если пришёл спор — вы точно знаете, по какому курсу была сумма.

### Без изменений в Product

Цены в `Product` всегда в USD. Конвертация только на уровне отображения.

---

## 8. Frontend — Currency Switcher

### Компонент в Header

```tsx
// Позиция: правый верхний угол, рядом с языковым переключателем
// Пример: $ USD ▼ → выпадает EUR, GBP, CAD

<CurrencySelector />
```

### Хранение выбора

1. **Без авторизации**: `localStorage.setItem('preferredCurrency', 'EUR')`
2. **С авторизацией**: синхронизировать с `UserPreference.currency` в БД
3. **По умолчанию**: определять по IP геолокации (Vercel предоставляет headers: `x-vercel-ip-country`)

### Форматирование цен

```typescript
// packages/shared/src/utils/formatCurrencyPrice.ts
export function formatCurrencyPrice(
  amountInUsd: number,
  targetCurrency: string,
  exchangeRate: number,
): string {
  const convertedAmount = amountInUsd * exchangeRate
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: targetCurrency,
    minimumFractionDigits: 2,
  }).format(convertedAmount)
}
// formatCurrencyPrice(68, 'EUR', 0.92) → "€62.56"
// formatCurrencyPrice(68, 'GBP', 0.79) → "£53.72"
```

### Disclaimer под ценой

```
€62.56 EUR
Prices shown in EUR are approximate. You will be charged in EUR at checkout.
```

---

## 9. Backend — Currency Service

```typescript
// apps/api/src/currency/currency.service.ts

@Injectable()
export class CurrencyService implements OnModuleInit {
  private cachedRates: Record<string, number> = {}
  private ratesCachedAt: Date | null = null

  async onModuleInit() {
    await this.refreshExchangeRates()
  }

  async getExchangeRates(): Promise<Record<string, number>> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (!this.ratesCachedAt || this.ratesCachedAt < oneHourAgo) {
      await this.refreshExchangeRates()
    }
    return this.cachedRates
  }

  async convertFromUsd(amountInUsd: number, targetCurrency: string): Promise<number> {
    const rates = await this.getExchangeRates()
    const rate = rates[targetCurrency] ?? 1
    return Math.round(amountInUsd * rate * 100) / 100 // round to 2 decimal places
  }

  private async refreshExchangeRates() {
    // GET https://v6.exchangerate-api.com/v6/{API_KEY}/latest/USD
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/latest/USD`,
    )
    const data = await response.json()
    this.cachedRates = data.conversion_rates // { EUR: 0.92, GBP: 0.79, ... }
    this.ratesCachedAt = new Date()
  }
}
```

---

## 10. Пошаговый план внедрения

### Фаза 1 — CAD + GBP (1 неделя разработки)

1. Подключить ExchangeRate-API (free tier)
2. Создать `CurrencyService` с кешированием
3. `GET /api/currencies/rates` endpoint
4. `CurrencySelector` компонент во frontend
5. `formatCurrencyPrice()` утилита в shared пакет
6. Хранить выбор в localStorage
7. При оформлении заказа — создавать PaymentIntent в выбранной валюте

### Фаза 2 — EUR + VAT awareness (2 недели)

1. Добавить EUR в список
2. Подключить TaxJar или добавить disclaimer о VAT
3. Добавить `UserPreference.currency` синхронизацию с БД
4. Геолокационное определение валюты по умолчанию

### Фаза 3 — Full multi-currency (1 неделя)

1. AUD и другие по запросу
2. `Order.currency` и `exchangeRateAtOrder` в БД
3. Аналитика в разных валютах

---

## 11. Итоговые затраты

| Компонент | MVP | Post-MVP (CAD+GBP) | Post-MVP (EUR+VAT) |
|---|---|---|---|
| Exchange Rate API | $0 | $0 (free tier) | $10/mo |
| Stripe (конвертация) | $0 | ~1% от EU/UK продаж | ~1% |
| TaxJar (VAT) | $0 | $0 | $19-99/mo |
| Разработка | $0 | ~1 неделя | ~2 недели |
| **Итого/мес** | $0 | $0 | **$29-109/mo** |

### Вывод

Мультивалютность — это не технически сложно, это **регуляторно сложно** (EU VAT).
CAD + GBP можно добавить почти без доп. затрат через 1-2 месяца после запуска.
EUR — только после решения вопроса с VAT-регистрацией.

**Не блокирует MVP. Запускаемся на USD, добавляем по мере роста трафика.**
