# User Analytics & Marketing Data — PostHog + GA4 + Clarity

> Что собирать о пользователях, как использовать для роста конверсии и email маркетинга.
> Стек: PostHog + Google Analytics 4 + Microsoft Clarity + Facebook Pixel.
> Последнее обновление: 2026-03-23

---

## Содержание

1. [Архитектура аналитики](#1-архитектура-аналитики)
2. [Google Analytics 4 — Setup](#2-google-analytics-4--setup)
3. [PostHog — Product Analytics](#3-posthog--product-analytics)
4. [Microsoft Clarity — Session Recording](#4-microsoft-clarity--session-recording)
5. [Facebook Pixel — Ad Attribution](#5-facebook-pixel--ad-attribution)
6. [Taxonomy событий — полный список](#6-taxonomy-событий--полный-список)
7. [Ключевые воронки (Funnels)](#7-ключевые-воронки-funnels)
8. [Данные для Email Marketing (Klaviyo)](#8-данные-для-email-marketing-klaviyo)
9. [Cookie Consent — обязательно](#9-cookie-consent--обязательно)
10. [Privacy & GDPR/CCPA](#10-privacy--gdprccpa)
11. [Dashboard — что смотреть каждый день](#11-dashboard--что-смотреть-каждый-день)
12. [PostHog Setup Guide](#12-posthog-setup-guide)

---

## 1. Архитектура аналитики

### Какой инструмент для чего

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  GA4           → SEO трафик, Google Ads attribution,           │
│                  E-commerce revenue tracking, Google Search     │
│                                                                 │
│  PostHog       → Продуктовые воронки, retention, A/B тесты,    │
│                  feature flags, cohort анализ                   │
│                                                                 │
│  MS Clarity    → Session recordings, heatmaps, click maps       │
│                  "Почему пользователь ушёл?"                    │
│                                                                 │
│  Facebook Pixel → Attribution FB/Instagram реклам,             │
│                   Lookalike audiences, retargeting              │
│                                                                 │
│  Klaviyo       → Email automation: abandoned cart,              │
│                   post-purchase, win-back. Получает события     │
│                   через PostHog интеграцию или прямо           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Принцип "один источник, несколько потребителей"

Событие происходит один раз → рассылается во все системы:

```typescript
// apps/web/src/lib/analytics.ts — единая точка входа

export function trackAddToCart(product: Product, quantity: number) {
  // Все системы получают одно событие
  posthog.capture('add_to_cart', { productId: product.id, price: product.price })
  gtag('event', 'add_to_cart', { currency: 'USD', value: product.price, items: [...] })
  fbq('track', 'AddToCart', { content_ids: [product.id], value: product.price })
  klaviyo.push(['track', 'Added to Cart', { ProductId: product.id }])
}
```

---

## 2. Google Analytics 4 — Setup

### Почему GA4 обязателен

- Единственный способ видеть органический Google трафик (Search Console интеграция)
- Нужен для Google Ads conversion tracking
- E-commerce Enhanced Measurement: автоматически отслеживает purchase, view_item, и т.д.
- Бесплатно

### Установка в Next.js

```typescript
// apps/web/src/app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  return (
    <html>
      <head>
        {gaMeasurementId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}', {
                  page_title: document.title,
                  send_page_view: false  // отправляем вручную через usePathname
                });
              `}
            </Script>
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### Pageview tracking (Next.js App Router)

```typescript
// apps/web/src/components/analytics/GoogleAnalytics.tsx
'use client'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const url = pathname + searchParams.toString()
    window.gtag?.('config', measurementId, { page_path: url })
  }, [pathname, searchParams, measurementId])

  return null
}
```

### GA4 E-commerce Events (отправлять обязательно)

```typescript
// Просмотр продукта
gtag('event', 'view_item', {
  currency: 'USD',
  value: product.price,
  items: [{ item_id: product.id, item_name: product.title, price: product.price }],
})

// Add to cart
gtag('event', 'add_to_cart', {
  currency: 'USD',
  value: product.price * quantity,
  items: [{ item_id: product.id, quantity }],
})

// Begin checkout
gtag('event', 'begin_checkout', {
  currency: 'USD',
  value: cartTotal,
  items: cartItems.map(item => ({ item_id: item.productId, quantity: item.quantity })),
})

// Purchase (отправить на Order Confirmation page)
gtag('event', 'purchase', {
  transaction_id: order.id,
  value: order.total,
  currency: 'USD',
  shipping: order.shippingCost,
  items: order.items.map(item => ({ ... })),
})
```

---

## 3. PostHog — Product Analytics

### Почему PostHog вместо Mixpanel/Amplitude

- **Бесплатно до 1M событий/месяц** — Mixpanel 20M, но PostHog всё-in-one
- **Open-source** — можно self-host, нет vendor lock-in
- **Всё в одном:** funnels, retention, heatmaps, session replay, A/B тесты, feature flags
- **NestJS + Next.js SDKs** есть официальные

### Установка

```bash
pnpm add --filter web posthog-js
pnpm add --filter api posthog-node
```

### PostHog Provider (Client-side)

```typescript
// apps/web/src/providers/PostHogProvider.tsx
'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      capture_pageview: false,     // будем делать вручную
      capture_pageleave: true,     // время на странице
      autocapture: false,          // не захватывать все клики (шум)
      session_recording: {
        maskAllInputs: true,       // маскировать поля форм
        maskInputOptions: {
          password: true,          // точно маскировать пароли
          email: false,            // email можно оставить
        },
      },
      persistence: 'localStorage', // или 'memory' для строгого GDPR
      loaded: (ph) => {
        if (process.env.NODE_ENV !== 'production') {
          ph.debug()
        }
      },
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
```

### Pageview + User Identification

```typescript
// apps/web/src/components/analytics/PostHogPageView.tsx
'use client'
import { usePostHog } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'

export function PostHogPageView() {
  const posthog = usePostHog()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { currentUser } = useAuthStore()

  // Идентификация авторизованного пользователя
  useEffect(() => {
    if (currentUser) {
      posthog.identify(currentUser.id, {
        email: currentUser.email,
        role: currentUser.role,
      })
    }
  }, [currentUser, posthog])

  // Pageview
  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams}` : '')
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, posthog])

  return null
}
```

### PostHog Server-side (NestJS)

```typescript
// apps/api/src/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common'
import { PostHog } from 'posthog-node'

@Injectable()
export class AnalyticsService {
  private readonly posthog: PostHog

  constructor() {
    this.posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
      host: 'https://us.i.posthog.com',
      flushAt: 20,       // batch size
      flushInterval: 10000,  // flush every 10 seconds
    })
  }

  trackOrderCreated(userId: string, orderId: string, totalUsd: number, itemCount: number) {
    this.posthog.capture({
      distinctId: userId,
      event: 'order_created',
      properties: {
        order_id: orderId,
        total_usd: totalUsd,
        item_count: itemCount,
        $set: {
          last_order_date: new Date().toISOString(),
          total_lifetime_value_usd: totalUsd,  // обновится через identify
        },
      },
    })
  }

  trackPaymentSucceeded(userId: string, orderId: string, amountUsd: number) {
    this.posthog.capture({
      distinctId: userId,
      event: 'payment_succeeded',
      properties: { order_id: orderId, amount_usd: amountUsd },
    })
  }
}
```

---

## 4. Microsoft Clarity — Session Recording

### Почему Clarity (а не Hotjar/LogRocket)

- **Полностью бесплатно** — неограниченное количество сессий
- **Microsoft** разрабатывает и поддерживает
- Heatmaps + scroll maps + session replay
- Интеграция с GA4 из коробки

### Установка в Next.js

```typescript
// apps/web/src/app/layout.tsx
<Script id="clarity-script" strategy="afterInteractive">
  {`
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_ID}");
  `}
</Script>
```

### Что смотреть в Clarity

| Метрика | Что означает | Действие |
|---|---|---|
| **Dead clicks** | Пользователи кликают на не-кликабельные элементы | Проверь expectation vs reality |
| **Rage clicks** | Яростные клики (что-то не работает) | Баг или broken UX |
| **Quick backs** | Зашёл → сразу ушёл | Страница не оправдала ожидания |
| **Scroll depth** | Как далеко скроллят | Контент "below the fold" не видят |

---

## 5. Facebook Pixel — Ad Attribution

### Зачем при нулевом рекламном бюджете

- **Ретаргетинг позже:** когда начнёшь рекламу — уже накоплена аудитория
- **Lookalike audiences:** FB может найти похожих на твоих покупателей
- **Attribution:** если запустишь FB/Instagram рекламу — знаешь что работает

### Установка

```typescript
// apps/web/src/app/layout.tsx
<Script id="fb-pixel" strategy="afterInteractive">
  {`
    !function(f,b,e,v,n,t,s){/* ... pixel init code ... */}
    fbq('init', '${process.env.NEXT_PUBLIC_FB_PIXEL_ID}');
    fbq('track', 'PageView');
  `}
</Script>
```

### Ключевые события для e-commerce

```typescript
fbq('track', 'ViewContent', {
  content_ids: [product.id],
  content_type: 'product',
  value: product.price,
  currency: 'USD',
})

fbq('track', 'AddToCart', {
  content_ids: cartItems.map(item => item.productId),
  value: cartTotal,
  currency: 'USD',
})

fbq('track', 'InitiateCheckout', {
  num_items: cartItems.length,
  value: cartTotal,
  currency: 'USD',
})

fbq('track', 'Purchase', {
  value: order.total,
  currency: 'USD',
  content_ids: order.items.map(item => item.productId),
})
```

---

## 6. Taxonomy событий — полный список

### Naming Convention

```
категория_действие_объект
Примеры: product_viewed, cart_item_added, checkout_started, order_completed
```

### Полная таблица событий

| Событие | Где | PostHog | GA4 | FB Pixel | Klaviyo |
|---|---|---|---|---|---|
| `page_viewed` | Web client | ✅ $pageview | ✅ page_view | ✅ PageView | — |
| `product_viewed` | Product page | ✅ | ✅ view_item | ✅ ViewContent | ✅ |
| `product_searched` | Search results | ✅ | ✅ search | — | — |
| `product_not_found` | Empty search | ✅ | — | — | — |
| `cart_item_added` | Product / Cart | ✅ | ✅ add_to_cart | ✅ AddToCart | ✅ |
| `cart_item_removed` | Cart | ✅ | ✅ remove_from_cart | — | — |
| `wishlist_item_added` | Product | ✅ | — | — | — |
| `checkout_started` | Cart → Checkout | ✅ | ✅ begin_checkout | ✅ InitiateCheckout | ✅ |
| `checkout_step_completed` | Checkout each step | ✅ | ✅ checkout_progress | — | — |
| `payment_info_entered` | Payment step | ✅ | ✅ add_payment_info | ✅ AddPaymentInfo | — |
| `order_placed` | Order confirm | ✅ | ✅ purchase | ✅ Purchase | ✅ |
| `user_registered` | Registration | ✅ | ✅ sign_up | ✅ CompleteRegistration | ✅ |
| `user_logged_in` | Login | ✅ | ✅ login | — | — |
| `review_submitted` | Product page | ✅ | — | — | — |

### Свойства событий

```typescript
// Каждое событие должно включать эти базовые свойства:
interface BaseEventProperties {
  session_id: string          // PostHog session ID
  user_id?: string            // если авторизован
  page_url: string
  referrer: string
  utm_source?: string         // из URL параметров
  utm_medium?: string
  utm_campaign?: string
}

// product_viewed
interface ProductViewedProperties extends BaseEventProperties {
  product_id: string
  product_slug: string
  product_title: string
  category_slug: string
  price_usd: number
  in_stock: boolean
  stock_type: 'IN_STOCK' | 'MADE_TO_ORDER' | 'ONE_OF_A_KIND'
  image_count: number
  has_reviews: boolean
  avg_rating: number | null
}

// order_placed
interface OrderPlacedProperties extends BaseEventProperties {
  order_id: string
  total_usd: number
  item_count: number
  shipping_method: string
  payment_method: 'card' | 'apple_pay' | 'google_pay' | 'klarna'
  is_guest: boolean
  items: Array<{ product_id: string; quantity: number; price_usd: number }>
}
```

---

## 7. Ключевые воронки (Funnels)

Настроить в PostHog → Insights → Funnels.

### Funnel 1: Покупка (основная)

```
Homepage/Catalog
  → Product Page viewed
    → Add to Cart
      → Checkout Started
        → Shipping info filled
          → Payment info entered
            → Order Placed (Purchase)
```

**Что анализировать:**
- На каком шаге самый большой drop-off?
- Конверсия по устройствам (mobile vs desktop)
- Конверсия по источнику трафика (Pinterest vs Google)

### Funnel 2: Abandonment Analysis

```
Add to Cart → [ничего] = Abandoned Cart Email candidate
Checkout Started → [ничего за 30 мин] = Abandoned Checkout
```

Эти пользователи → в Klaviyo → автоматический email.

### Funnel 3: Retention

```
First Purchase → Second Purchase (within 90 days)
```

**Benchmark:** Jewelry retention ~15-25%. Если выше → отличный продукт.

### Funnel 4: New vs Returning

```
PostHog → Retention → Weekly/Monthly
```

---

## 8. Данные для Email Marketing (Klaviyo)

### Какие данные передавать в Klaviyo

| Событие | Данные | Зачем |
|---|---|---|
| User registered | email, source | Welcome series |
| Product viewed | email, product_id, product_title, price, image_url | Browse abandonment email |
| Add to Cart | email, cart_items, cart_total | Abandoned cart email |
| Order placed | email, order_id, items, total, estimated_delivery | Order confirmation |
| Order shipped | email, tracking_number, carrier, estimated_delivery | Shipping notification |
| Order delivered | email, order_id | Review request (7 дней после) |
| Back in stock | email (из wishlist) | "Your wishlist item is back!" |

### Обязательные Klaviyo Flows (email автоматизация)

| Flow | Trigger | Timing | Доход |
|---|---|---|---|
| **Abandoned Cart** | Cart abandoned > 1 час | Email 1: 1 час, Email 2: 24 часа | ⭐⭐⭐⭐⭐ Самый прибыльный |
| **Welcome Series** | Registration | Email 1: мгновенно, Email 2: 3 дня | ⭐⭐⭐⭐ |
| **Post-Purchase** | Order delivered + 7 дней | "How do you like your jewelry? Leave a review" | ⭐⭐⭐ |
| **Win-Back** | No purchase in 90 days | "We miss you, here's 10% off" | ⭐⭐⭐ |
| **Birthday** | Birthday - 7 days (если дал) | "Happy birthday! Here's a gift" | ⭐⭐ |
| **Back in Stock** | Product restocked | Мгновенно | ⭐⭐⭐⭐ |

### Интеграция PostHog → Klaviyo

PostHog имеет встроенную интеграцию с Klaviyo:

```
PostHog → Settings → Integrations → Klaviyo
  → Enter API key
  → Map events: posthog.capture('order_placed') → Klaviyo 'Placed Order'
```

Или прямой Klaviyo SDK:

```typescript
// apps/web/src/lib/klaviyo.ts
declare global {
  interface Window {
    _learnq: Array<[string, ...unknown[]]>
  }
}

export function klaviyoIdentify(email: string, properties?: Record<string, unknown>) {
  window._learnq = window._learnq || []
  window._learnq.push(['identify', { $email: email, ...properties }])
}

export function klaviyoTrack(eventName: string, properties: Record<string, unknown>) {
  window._learnq = window._learnq || []
  window._learnq.push(['track', eventName, properties])
}
```

---

## 9. Cookie Consent — обязательно

**До GA4, PostHog, FB Pixel, Clarity — нужно согласие пользователя** (GDPR для EU, CCPA для California).

Это Issue #107 (`feat: Cookie consent banner`).

### Схема работы

```typescript
// apps/web/src/providers/AnalyticsProvider.tsx
'use client'
import { useEffect } from 'react'
import { useCookieConsent } from '@/hooks/useCookieConsent'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { hasConsent, consentCategories } = useCookieConsent()

  useEffect(() => {
    if (!hasConsent) return

    // GA4
    if (consentCategories.analytics) {
      initGA4()
    }

    // PostHog
    if (consentCategories.analytics) {
      initPostHog()
    }

    // FB Pixel
    if (consentCategories.marketing) {
      initFBPixel()
    }
  }, [hasConsent, consentCategories])

  return <>{children}</>
}
```

### Категории consent

```typescript
interface ConsentCategories {
  necessary: true    // всегда true, нельзя отключить (auth cookies, cart)
  analytics: boolean // GA4, PostHog, Clarity
  marketing: boolean // FB Pixel, Google Ads remarketing
}
```

---

## 10. Privacy & GDPR/CCPA

### Что нужно для GDPR/CCPA compliance

| Требование | Решение |
|---|---|
| Cookie consent | Issue #107 — consent banner до аналитики |
| Privacy Policy | Issue #105 — обязательная страница |
| Terms of Service | Issue #106 — обязательная страница |
| Right to deletion | `DELETE /api/users/me` endpoint |
| Data export | `GET /api/users/me/data` (post-MVP) |
| IP anonymization | GA4: включено по умолчанию. PostHog: `ip: false` в init |

### PostHog GDPR mode

```typescript
posthog.init(key, {
  persistence: 'memory',        // не сохранять в localStorage без consent
  ip: false,                    // не собирать IP
  disable_persistence: true,    // до получения consent
})

// После согласия:
posthog.set_config({ disable_persistence: false, persistence: 'localStorage' })
```

---

## 11. Dashboard — что смотреть каждый день

### Ежедневные (5 минут)

```
GA4 Realtime → Кто сейчас на сайте, откуда пришли
Sentry → Новые ошибки вчера
UptimeRobot → Все мониторы зелёные?
```

### Еженедельные (15 минут, понедельник)

```
GA4 → Traffic этой недели vs прошлой
PostHog → Purchase funnel: где drop-off?
PostHog → New vs returning users ratio
Klaviyo → Abandoned cart recovery rate
Sentry → Error triage (см. docs/15_ERROR_TRACKING_ALERTING.md)
```

### Ежемесячные (30 минут)

```
GA4 → Revenue, conversion rate, top landing pages, top exit pages
PostHog → Retention cohorts: возвращаются ли покупатели?
Clarity → Heatmaps: что работает, что нет на product pages
PostHog → A/B test results (если запущены)
```

### Ключевые метрики e-commerce

| Метрика | Где смотреть | Хорошо | Плохо |
|---|---|---|---|
| Conversion Rate | GA4 / PostHog | > 1.5% | < 0.5% |
| Add to Cart Rate | PostHog Funnel | > 5% | < 2% |
| Cart Abandonment | PostHog | < 70% | > 85% |
| Avg Order Value | GA4 E-commerce | > $50 | < $30 |
| Return Customer Rate | PostHog Retention | > 15% | < 5% |
| Email Open Rate | Klaviyo | > 25% | < 15% |
| Abandoned Cart Recovery | Klaviyo | > 5% | < 2% |

---

## 12. PostHog Setup Guide

### 1. Создать аккаунт

Перейти на posthog.com → Create account → US Cloud region

### 2. Получить API ключи

Project Settings → API Keys:
- `NEXT_PUBLIC_POSTHOG_KEY` = `phc_abc...` (для frontend)
- `POSTHOG_API_KEY` = `phx_xyz...` (для backend NestJS)

### 3. Установить переменные

```bash
# apps/web/.env.local
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# apps/api/.env
POSTHOG_API_KEY=phx_xxx
```

### 4. Создать ключевые Insights в PostHog

После первых данных:
- **Insight: Purchase Funnel** (Funnels → перечисли события из §7)
- **Insight: Daily Active Users** (Trends → $pageview → daily)
- **Insight: Revenue by day** (Trends → order_placed → sum of total_usd)
- **Insight: Top Products** (Trends → product_viewed → breakdown by product_slug)
- **Dashboard: "E-commerce Overview"** — собери всё выше

### 5. Session Recording

PostHog → Session Recording → Settings:
- Record sessions: 100% (при < 100 users/day)
- Link to PostHog в Sentry: когда ошибка → видишь сессию где она произошла
