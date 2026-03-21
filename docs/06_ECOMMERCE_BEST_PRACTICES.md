# E-Commerce Best Practices — Handmade Jewelry Store

> Анализ современных практик для ювелирного e-commerce магазина.
> Документ охватывает: продвижение, accessibility, рекламу, платёжные системы, архитектуру.
> Всё что нужно предусмотреть ДО того как это станет дорого переделывать.

---

## 1. Маркетинговые каналы — что предусмотреть в архитектуре

### Google Shopping (бесплатные листинги)

Самый недооценённый канал для ювелирки. Google Shopping Tab — бесплатные показы товаров.
Требует: Google Merchant Center аккаунт + JSON-LD разметка на страницах продуктов.

**Что заложить в архитектуру сейчас:**
```tsx
// Обязательные поля в JSON-LD для Google Shopping (см. 05_SEO_RULES.md)
const productJsonLd = {
  '@type': 'Product',
  name: product.title,
  image: product.images,          // минимум 1 изображение, 800x800+
  description: product.description,
  sku: product.id,                // ← добавить SKU в DB schema
  brand: { '@type': 'Brand', name: 'Your Brand Name' },
  offers: {
    '@type': 'Offer',
    price: product.price,
    priceCurrency: 'USD',
    availability: product.stock > 0
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    shippingDetails: {            // ← влияет на показ в Shopping
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'USD' },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
        transitTime: { '@type': 'QuantitativeValue', minValue: 3, maxValue: 7, unitCode: 'DAY' },
      },
    },
  },
  aggregateRating: {              // ← если будут отзывы — влияет на CTR в выдаче
    '@type': 'AggregateRating',
    ratingValue: product.avgRating,
    reviewCount: product.reviewCount,
  },
}
```

**Дополнения к DB Schema (#17):**
```prisma
model Product {
  // существующие поля...
  sku          String?   // артикул для Google Shopping
  weight       Float?    // граммы — для расчёта доставки
  material     String?   // "Sterling Silver 925" — поисковые запросы
  avgRating    Float     @default(0)
  reviewCount  Int       @default(0)
}

model Review {           // добавить в схему сейчас, реализовать в W7+
  id        String   @id @default(cuid())
  rating    Int      // 1-5
  comment   String?
  userId    String
  productId String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  product   Product  @relation(fields: [productId], references: [id])

  @@unique([userId, productId])  // один отзыв от пользователя на продукт
}

model Wishlist {          // добавить в схему сейчас
  id        String   @id @default(cuid())
  userId    String   @unique
  products  Product[]
  user      User     @relation(fields: [userId], references: [id])
}
```

---

### Pinterest — главный канал для ювелирки

Pinterest даёт до 40% органического трафика ювелирным магазинам.
Пользователи Pinterest активно ищут украшения и покупают.

**Что нужно:**
1. **Rich Pins** — расширенные пины с ценой и наличием автоматически из Open Graph
2. **Pinterest Tag** — пиксель для ретаргетинга
3. **Изображения 2:3** (1000×1500px) — стандарт Pinterest, не квадрат

```tsx
// В metadata каждой страницы продукта — Pinterest читает это
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    openGraph: {
      images: [{
        url: product.images[0],
        width: 1000,
        height: 1500,    // ← 2:3 для Pinterest
        alt: product.title,
      }],
    },
    // Pinterest специфичные теги
    other: {
      'pinterest:description': product.description.slice(0, 500),
      'pinterest:media': product.images[0],
    },
  }
}
```

**Pinterest Tag — в layout.tsx (Client Component):**
```tsx
// src/components/shared/PinterestTag.tsx — добавить в W9
'use client'
export function PinterestTag() {
  // Pinterest base code — аналог Facebook Pixel
  // Добавить после получения Pinterest Business аккаунта
}
```

---

### Instagram Shopping

Требует Facebook Catalog + Meta Business Suite.
Instagram покупатели конвертируются лучше всего для украшений ручной работы.

**Архитектурное требование:** изображения продуктов должны быть доступны по постоянным URL (не presigned S3 URL которые истекают). Использовать CloudFront CDN с постоянными URL.

---

### Facebook / Meta Ads

**Facebook Pixel** — должен быть с первого дня продаж.
Без пикселя невозможно создать lookalike аудитории и ретаргетинг.

```tsx
// src/components/shared/FacebookPixel.tsx
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { FB_PIXEL_ID, pageview } from '@/lib/fpixel'

export function FacebookPixel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    pageview()
  }, [pathname, searchParams])

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  )
}
```

```ts
// src/lib/fpixel.ts — события которые нужно трекать
export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID

export const pageview = () => window.fbq?.('track', 'PageView')

// Вызывать при добавлении в корзину
export const addToCart = (product: Product) =>
  window.fbq?.('track', 'AddToCart', {
    content_ids: [product.id],
    content_name: product.title,
    value: product.price,
    currency: 'USD',
  })

// Вызывать при начале оформления
export const initiateCheckout = (cartTotal: number) =>
  window.fbq?.('track', 'InitiateCheckout', { value: cartTotal, currency: 'USD' })

// Вызывать при успешной оплате
export const purchase = (orderId: string, total: number) =>
  window.fbq?.('track', 'Purchase', { value: total, currency: 'USD' })
```

---

### Google Analytics 4 + Enhanced E-commerce

GA4 с e-commerce событиями — обязательно для понимания воронки продаж.

```ts
// src/lib/gtag.ts
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

// Ключевые события для ювелирного магазина:
export const events = {
  viewItem: (product: Product) =>
    window.gtag?.('event', 'view_item', {
      currency: 'USD',
      value: product.price,
      items: [{ item_id: product.id, item_name: product.title, price: product.price }],
    }),

  addToCart: (product: Product) =>
    window.gtag?.('event', 'add_to_cart', { ... }),

  beginCheckout: (items: CartItem[]) =>
    window.gtag?.('event', 'begin_checkout', { ... }),

  purchase: (order: Order) =>
    window.gtag?.('event', 'purchase', {
      transaction_id: order.id,
      value: order.total,
      currency: 'USD',
      items: order.items.map(item => ({ ... })),
    }),
}
```

**Переменные окружения добавить в `.env.example`:**
```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FB_PIXEL_ID=
NEXT_PUBLIC_PINTEREST_TAG_ID=
```

---

## 2. Платёжные системы — архитектурные решения

### Stripe — основа (Issue #29, #30)

Уже запланирован. Важные дополнения которые нужно предусмотреть:

**Apple Pay / Google Pay — через Stripe Payment Request Button:**
```tsx
// Конверсия вырастает на 20-30% когда есть Apple/Google Pay
// Stripe Elements поддерживает из коробки — просто включить
const paymentRequest = stripe.paymentRequest({
  country: 'US',
  currency: 'usd',
  total: { label: 'Handmade Jewelry Store', amount: totalInCents },
  requestPayerName: true,
  requestPayerEmail: true,
})
```

**Stripe Radar** — встроенная защита от мошенничества. Включается автоматически.

**Webhook обработка** — уже в Issue #29, но важно:
```ts
// Статусы которые НУЖНО обрабатывать:
// payment_intent.succeeded       → создать заказ
// payment_intent.payment_failed  → уведомить пользователя
// charge.dispute.created         → алерт в Slack/email (чарджбек)
// charge.refunded                → обновить статус заказа
```

### Buy Now Pay Later (BNPL) — критично для ювелирки

Украшения — дорогостоящая покупка. BNPL увеличивает конверсию на 20-40%.

**Klarna** (через Stripe) — самый популярный в США/Европе:
```ts
// Подключается как метод оплаты в Stripe — дополнительных интеграций не нужно
payment_method_types: ['card', 'klarna', 'afterpay_clearpay']
```

**Afterpay** — популярен у молодёжи 18-35 (целевая аудитория ювелирки):
- Также через Stripe, нет отдельной интеграции
- Показывать "4 payments of $X" на странице продукта — повышает конверсию

```tsx
// src/components/features/catalog/InstallmentBadge.tsx
// Показывать на карточке и странице продукта
export function InstallmentBadge({ price }: { price: number }) {
  if (price < 35) return null  // BNPL не показывать для дешёвых товаров
  return (
    <p className="text-sm text-muted">
      or 4 × ${(price / 4).toFixed(2)} with <strong>Afterpay</strong>
    </p>
  )
}
```

### Налоги — TaxJar или Stripe Tax

Продажи в разных штатах США требуют разного налога (Sales Tax).
Stripe Tax автоматически считает — подключается в один клик в Stripe Dashboard.
Добавить в `.env.example`: `STRIPE_TAX_RATE_ID=`

### Мультивалютность — предусмотреть сейчас

```ts
// Не хардкодить '$' — использовать Intl.NumberFormat
export function formatPrice(price: number, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(price)
}
// '$29.99' в USA, '€27.50' в EU, '£23.99' в UK
```

---

## 3. Accessibility (a11y) — WCAG 2.1 AA

Доступность = больше пользователей + лучшее SEO + защита от судебных исков (в США активно судятся за недоступные магазины).

### Обязательные правила

**Цветовой контраст:**
```
Текст на фоне — минимум 4.5:1 (WCAG AA)
Крупный текст (18px+) — минимум 3:1
Интерактивные элементы — минимум 3:1

Проверка: https://webaim.org/resources/contrastchecker/
```

**Keyboard navigation — весь магазин должен работать без мыши:**
```tsx
// ✅ Focus trap в модальном окне корзины
// ✅ Escape закрывает модальные окна
// ✅ Tab работает по всем интерактивным элементам
// ✅ Enter/Space активирует кнопки

// Skip navigation — первая ссылка на странице
// src/components/shared/SkipNavLink.tsx
export function SkipNavLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
    >
      Skip to main content
    </a>
  )
}
// Добавить в layout.tsx перед <header>
// <main id="main-content"> — якорь
```

**ARIA для интерактивных элементов:**
```tsx
// Корзина — сообщать об изменениях скринридерам
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {cartMessage}  {/* "Silver ring added to cart. 3 items total." */}
</div>

// Количество товаров в иконке корзины
<button aria-label={`Cart, ${itemCount} items`}>
  <CartIcon aria-hidden="true" />
  <span aria-hidden="true">{itemCount}</span>
</button>

// Изображения в галерее
<button
  aria-label={`View image ${index + 1} of ${images.length}`}
  aria-current={index === currentIndex}
>

// Форма поиска
<input
  type="search"
  aria-label="Search products"
  aria-autocomplete="list"
  aria-expanded={isOpen}
  aria-controls="search-results"
/>
<ul id="search-results" role="listbox">...</ul>
```

**Loading states для скринридеров:**
```tsx
// Не просто спиннер — сообщить что происходит
<div role="status" aria-label="Loading products">
  <Spinner aria-hidden="true" />
  <span className="sr-only">Loading products, please wait...</span>
</div>
```

### Инструменты проверки a11y

```
axe DevTools (Chrome extension) — автоматическая проверка
NVDA (Windows) + Chrome — скринридер, бесплатно
VoiceOver (Mac) + Safari — встроенный скринридер, Cmd+F5
Lighthouse Accessibility score — цель 95+
```

---

## 4. Производительность и архитектура

### Стратегия рендеринга страниц

```
Страница             Стратегия      Почему
─────────────────────────────────────────────────────────
/                    ISR 1h         Меняется редко
/products            ISR 5min       Каталог — часто добавляют товары
/products/[slug]     ISR 1h         Продукт — цена/наличие важны
/cart                CSR (client)   Персональные данные, нет кеша
/checkout            CSR (client)   Персональные данные
/account             SSR            Защищённые данные пользователя
```

```tsx
// ISR — Incremental Static Regeneration
// Страница рендерится статически, обновляется каждые N секунд
// src/app/(shop)/products/[slug]/page.tsx

export const revalidate = 3600  // 1 час — обновлять статику

// Или динамически:
export async function generateStaticParams() {
  const products = await getAllProductSlugs()
  return products.map(p => ({ slug: p.slug }))
}
// Next.js пре-генерирует все страницы продуктов при билде
// Новые продукты добавляются через On-Demand Revalidation
```

### Изображения — критично для ювелирки

Качество фото = продажи. Нужна правильная инфраструктура:

```ts
// next.config.ts — добавить после W9 (AWS S3 + CloudFront)
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-cloudfront-domain.cloudfront.net',
      },
    ],
    formats: ['image/avif', 'image/webp'],  // AVIF = 50% меньше WebP
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}
```

**Стандарты фото для ювелирного магазина:**
```
Главное фото:   800×800px, белый фон, AVIF/WebP
На модели:      1000×1500px (2:3 для Pinterest)
Детали:         1200×900px, макро-съёмка
Минимум фото:   3-5 на продукт (разные ракурсы)
```

### Кеширование — правильная стратегия

```ts
// apps/api — HTTP кеш-заголовки для публичных эндпоинтов
@Get('products')
@Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
async getProducts() { ... }

// Персональные эндпоинты — без кеша
@Get('cart')
@UseGuards(JwtAuthGuard)
@Header('Cache-Control', 'private, no-store')
async getCart() { ... }
```

---

## 5. Доверие и конверсия

### Trust signals — ювелирка = высокое доверие нужно

```tsx
// src/components/shared/TrustBadges.tsx
// Показывать на странице продукта и checkout
export function TrustBadges() {
  return (
    <ul role="list" aria-label="Trust signals">
      <li>🔒 Secure checkout (SSL)</li>
      <li>↩️ 30-day returns</li>
      <li>🚚 Free shipping over $50</li>
      <li>✨ Handcrafted with love</li>
    </ul>
  )
}
```

### Wishlist — предусмотреть в схеме БД сейчас

```
Без wishlist теряется ~15-20% потенциальных покупателей
Пользователь добавляет в wishlist → уходит → получает email reminder
→ возвращается и покупает
```

Модель `Wishlist` уже добавлена выше. Реализовать в W7 (после Auth).

### Email-маркетинг — архитектурное решение сейчас

Нужно выбрать провайдера до W9:

| Сервис | Цена | Подходит для |
|---|---|---|
| **Resend** | Бесплатно до 3к/мес | Транзакционные письма (заказы) — рекомендую |
| **Mailchimp** | Бесплатно до 500 | Email-рассылки |
| **Klaviyo** | От $45/мес | E-commerce автоматизация, лучший для магазинов |

**Транзакционные письма которые нужны (Resend):**
- Подтверждение заказа
- Статус доставки
- Брошенная корзина (через Stripe — через 1ч, 24ч, 72ч)
- Welcome-серия после регистрации

```
RESEND_API_KEY=
RESEND_FROM_EMAIL=orders@yourdomain.com
```

---

## 6. GDPR и юридические требования

### Cookie Consent — обязателен если есть EU трафик

```tsx
// src/components/shared/CookieConsent.tsx
// Показывать до загрузки Facebook Pixel и GA4
// Без согласия — нельзя загружать трекинговые скрипты

// Готовое решение: @cookiebanner/nextjs или cookie-consent пакет
// Или кастомный компонент с сохранением в localStorage
```

**Переменные для условной загрузки:**
```tsx
// Загружать пиксели только после согласия
const { analytics, marketing } = useCookieConsent()

{analytics && <GoogleAnalytics />}
{marketing && <FacebookPixel />}
{marketing && <PinterestTag />}
```

### Обязательные страницы

```
/privacy-policy     — политика конфиденциальности
/terms              — условия использования
/shipping           — политика доставки (влияет на Google Shopping)
/returns            — политика возврата (влияет на доверие)
```

---

## 7. Что добавить в Issues (рекомендации)

Задачи которых нет в текущем roadmap но стоит создать:

| Issue | Название | Приоритет | Когда |
|---|---|---|---|
| Новый | Wishlist feature — add/remove products | P1 | W7 (после Auth) |
| Новый | Product reviews — CRUD + rating | P1 | W7 |
| Новый | Email notifications (Resend) | P1 | W6 (с заказами) |
| Новый | Cookie consent banner (GDPR) | P1 | W9 (перед деплоем) |
| Новый | Google Analytics 4 + e-commerce events | P1 | W9 |
| Новый | Facebook Pixel integration | P2 | W9 |
| Новый | BNPL badge — Afterpay/Klarna на карточках | P2 | W6 (со Stripe) |
| Новый | Related products — "You may also like" | P2 | W4 |
| Новый | Recently viewed products (localStorage) | P2 | W4 |
| Новый | Privacy policy + Terms pages | P2 | W9 |
| #17 | DB Schema — добавить: sku, weight, material, Review, Wishlist | P0 | W3 |

---

## 8. Технический SEO — дополнения к Issue #36

```
robots.txt:
  Разрешить: /products, /categories
  Запретить: /api, /admin, /checkout, /account, /cart

Canonical URLs:
  /products?sort=price → canonical: /products (без параметров)
  /products?page=2     → canonical: /products?page=2 (пагинация — оставить)

Hreflang (если планируешь RU/EN версию):
  <link rel="alternate" hreflang="en" href="https://yourdomain.com/products/ring" />
  <link rel="alternate" hreflang="ru" href="https://yourdomain.ru/products/ring" />

Paginated catalog:
  Page 1: <link rel="next" href="/products?page=2" />
  Page 2: <link rel="prev" href="/products" /><link rel="next" href="/products?page=3" />
```

---

## Приоритетный чеклист "сделай до первого деплоя"

```
[ ] Google Analytics 4 подключён с e-commerce событиями
[ ] Facebook Pixel установлен
[ ] Google Search Console верифицирован
[ ] Google Merchant Center настроен (для Shopping)
[ ] Pinterest Business аккаунт создан, Rich Pins включены
[ ] BNPL (Klarna/Afterpay) включён в Stripe
[ ] Apple Pay / Google Pay включён в Stripe
[ ] Stripe Tax настроен
[ ] Cookie Consent баннер работает
[ ] Privacy Policy страница создана
[ ] Все изображения 800×800px min, с alt-текстом
[ ] Lighthouse score: Performance 90+, Accessibility 95+, SEO 100
[ ] Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms
[ ] JSON-LD на всех страницах продуктов
[ ] sitemap.xml доступен и отправлен в Search Console
[ ] SSL сертификат активен
[ ] 404 страница кастомная
[ ] Wishlist работает (сохраняет в localStorage до авторизации)
```
