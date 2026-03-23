# Domain Analysis & Product Strategy — Handmade Jewelry Store

> Исследование рынка, архитектура данных, план MVP и дорожная карта.
> Этот файл — живой документ. Обновляй по мере роста магазина.
> Последнее обновление: 2026-03-23

---

## Содержание

1. [Анализ продуктов](#1-анализ-продуктов)
2. [Сущности и схема данных](#2-сущности-и-схема-данных)
3. [Таксономия категорий](#3-таксономия-категорий)
4. [Поток кастомных заказов](#4-поток-кастомных-заказов)
5. [Анализ рынка США](#5-анализ-рынка-сша)
6. [Регистрация пользователей](#6-регистрация-пользователей)
7. [Сбор данных и маркетинг](#7-сбор-данных-и-маркетинг)
8. [Лояльность и геймификация](#8-лояльность-и-геймификация)
9. [Масштабируемость](#9-масштабируемость)
10. [MVP vs После MVP](#10-mvp-vs-после-mvp)
11. [Что заводить в БД сейчас vs потом](#11-что-заводить-в-бд-сейчас-vs-потом)

---

## 1. Анализ продуктов

### Типы украшений (из листингов Авито)

| Тип | Примеры | Ключевые атрибуты |
|---|---|---|
| Браслеты | Северное Сияние, Инь-Янь, Гранатовое искушение, Барыня Изумруд | длина/диаметр, ширина, вес |
| Колье | Северное Сияние, Белая Жемчужина | длина, ширина, вес |
| Лариаты | Инь-Янь, Чёрная Мамба | длина (очень длинные — 118-124см) |
| Серьги | часть комплектов | тип застёжки |
| Комплекты | 1001 ночь, Русская Красавица, Белая Жемчужина, Белый танец | состав: колье + браслет [+ серьги] |

### Атрибуты продуктов (из реальных описаний)

```
Название:       "Северное Сияние" — маркетинговое имя (не технический дескриптор)
Цвет:           красный, белый, чёрный, изумруд, небесно-голубой
Материал:       бисер (чешский кристалл, гранат, стеклянный жемчуг)
Размеры:        длина_см, ширина_см, вес_гр, диаметр_см (для браслетов)
Кастомизация:   "По вашему желанию можно изменить длину (цвет) — цена не меняется"
Застёжка:       магнитная, карабин, муфта (некоторые изделия)
Наличие:        часто 1 шт. ("1 шт. в наличии") или под заказ
Доставка:       Авито доставка, самовывоз (Москва, Северная Осетия)
Цена (РФ):      300–1000 ₽ → в США: $25–150
```

### Вывод по продукту для США

Каждое изделие — уникальная вещь ручной работы. Ключевые особенности:
- **Лимитированность** ("Only 1 available") — конвертирует за счёт scarcity
- **Кастомизация** — смена цвета/размера без наценки — конкурентное преимущество
- **Комплекты** — должны продаваться как самостоятельный товар И показывать входящие предметы со ссылками (SEO + апсейл)
- **Ручная работа** — нужны фото процесса (Pinterest трафик)

---

## 2. Сущности и схема данных

### Product (Товар)

```prisma
model Product {
  // Идентификация
  id                  String      @id @default(cuid())
  slug                String      @unique   // /products/northern-lights-bracelet
  sku                 String?               // для Google Shopping
  name                String                // "Northern Lights" (маркетинговое)
  nameOriginal        String?               // "Северное Сияние" (оригинал)

  // Классификация
  type                ProductType           // BRACELET | NECKLACE | LARIAT | EARRINGS | SET
  stockType           StockType             // IN_STOCK | MADE_TO_ORDER | ONE_OF_A_KIND
  categoryId          String
  category            Category    @relation(...)

  // Описание
  description         String                // markdown, переведённый
  shortDescription    String                // для карточек и meta description

  // Материал и исполнение
  material            String                // "Czech crystal beads"
  beadType            String?               // "crystal" | "garnet" | "seed bead" | "glass pearl"
  colorName           String                // "Ivory White"
  colorHex            String?               // "#FFFFF0" для свотча

  // Размеры (отображаются в дюймах для США)
  lengthCm            Float                 // основной размер
  widthCm             Float
  weightGrams         Float                 // для расчёта стоимости доставки
  diameterCm          Float?                // для браслетов-колечек

  // Цены
  priceUsd            Decimal     @db.Decimal(10,2)
  comparePriceUsd     Decimal?    @db.Decimal(10,2)  // зачёркнутая "старая" цена

  // Кастомизация
  isCustomizable      Boolean     @default(true)
  customizationNote   String?               // "Color and length changeable at no extra cost"
  productionDays      Int         @default(3)         // для расчёта даты доставки

  // Наличие
  stockQuantity       Int         @default(1)         // 999 = бесконечный (made-to-order)

  // Комплект
  isSet               Boolean     @default(false)
  setItems            ProductSetItem[]               // связи с компонентами

  // SEO и маркетинг
  googleProductCategory String?   // "Apparel & Accessories > Jewelry > Bracelets"
  metaTitle           String?
  metaDescription     String?

  // Аналитика
  avgRating           Float       @default(0)
  reviewCount         Int         @default(0)
  soldCount           Int         @default(0)   // "47 sold" — social proof
  viewCount           Int         @default(0)

  // Флаги
  isActive            Boolean     @default(true)
  isFeatured          Boolean     @default(false)

  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  // Relations
  images              ProductImage[]
  variants            ProductVariant[]
  tags                ProductTag[]
  reviews             Review[]
  wishlistItems       WishlistItem[]
  orderItems          OrderItem[]
  customOrders        CustomOrder[]
}

enum ProductType {
  BRACELET
  NECKLACE
  LARIAT
  EARRINGS
  SET
  RING      // на будущее
  ANKLET    // на будущее
}

enum StockType {
  IN_STOCK        // есть на складе
  MADE_TO_ORDER   // изготавливается после заказа
  ONE_OF_A_KIND   // уникальная вещь, 1 штука
}
```

### ProductVariant (Вариант — цвет/размер)

```prisma
model ProductVariant {
  id              String    @id @default(cuid())
  productId       String
  product         Product   @relation(...)
  colorName       String    // "Ruby Red"
  colorHex        String?
  lengthCm        Float?    // переопределяет дефолт продукта
  sku             String?
  stockQuantity   Int       @default(1)
  isDefault       Boolean   @default(false)
  isAvailable     Boolean   @default(true)
  priceAdjustment Decimal   @default(0) @db.Decimal(10,2) // обычно 0
}
```

### ProductImage

```prisma
model ProductImage {
  id          String    @id @default(cuid())
  productId   String
  product     Product   @relation(...)
  url         String    // CloudFront URL
  altText     String    // "Northern Lights bracelet in white crystal beads" — ОБЯЗАТЕЛЬНО
  sortOrder   Int
  isPrimary   Boolean   @default(false)
  width       Int       // для next/image (предотвращает CLS)
  height      Int
}
```

### ProductSetItem (Состав комплекта)

```prisma
model ProductSetItem {
  id                 String    @id @default(cuid())
  setProductId       String    // родительский SET-продукт
  componentProductId String    // браслет/колье/серьги входящие в комплект
  sortOrder          Int
  isOptional         Boolean   @default(false)
  // Связи показываются на странице: "This set includes:" → ссылки на компоненты
}
```

### Category

```prisma
model Category {
  id              String      @id @default(cuid())
  slug            String      @unique  // "bracelets", "jewelry-sets"
  name            String               // "Bracelets"
  description     String?              // для SEO страницы категории
  imageUrl        String?
  parentId        String?
  parent          Category?   @relation("CategoryTree", fields: [parentId], references: [id])
  children        Category[]  @relation("CategoryTree")
  sortOrder       Int
  isActive        Boolean     @default(true)
  metaTitle       String?
  metaDescription String?
  products        Product[]
}
```

### Tag (Теги для фасетной фильтрации)

```prisma
model Tag {
  id       String   @id @default(cuid())
  slug     String   @unique  // "garnet", "gift-for-her", "wedding"
  name     String
  type     TagType

  products ProductTag[]
}

model ProductTag {
  productId String
  tagId     String
  product   Product  @relation(...)
  tag       Tag      @relation(...)
  @@unique([productId, tagId])
}

enum TagType {
  MATERIAL   // garnet, crystal, seed-bead
  OCCASION   // wedding, birthday, graduation
  STYLE      // bohemian, classic, minimalist
  COLOR      // red, white, black
  GEMSTONE   // garnet, amethyst
  RECIPIENT  // gift-for-her, gift-for-mom, bridesmaid
}
```

### User

```prisma
model User {
  id                  String      @id @default(cuid())

  // Аутентификация
  email               String      @unique
  emailVerified       Boolean     @default(false)
  passwordHash        String?     // null для OAuth-only пользователей
  oauthAccounts       OAuthAccount[]

  // Профиль
  firstName           String?
  lastName            String?
  displayName         String?
  avatarUrl           String?
  phone               String?     // для SMS уведомлений (после MVP)
  dateOfBirth         DateTime?   // для birthday-бонуса — добавить сразу!
  gender              String?     // "female"|"male"|"non-binary"|"prefer_not_to_say"

  // Роль
  role                UserRole    @default(CUSTOMER)

  // Маркетинговая атрибуция — фиксируется ОДИН раз при регистрации
  acquisitionSource   String?     // "google_organic"|"pinterest"|"google_shopping"|"direct"
  acquisitionCampaign String?     // UTM campaign
  acquisitionMedium   String?     // UTM medium
  referredByUserId    String?     // для реферальной программы (пост-MVP)

  // Настройки
  preferredLocale     String      @default("en")
  preferredCurrency   String      @default("USD")

  // Лояльность — добавить сразу, даже если программа стартует позже
  loyaltyPoints       Int         @default(0)
  loyaltyTier         LoyaltyTier @default(BRONZE)
  lifetimeSpendUsd    Decimal     @default(0) @db.Decimal(10,2)

  isActive            Boolean     @default(true)
  lastLoginAt         DateTime?
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  // Relations
  addresses           Address[]
  orders              Order[]
  reviews             Review[]
  wishlist            Wishlist?
  customOrders        CustomOrder[]
  loyaltyTransactions LoyaltyTransaction[]
  spinHistory         WheelSpinHistory[]
}

enum UserRole { CUSTOMER  ADMIN  SELLER }

enum LoyaltyTier { BRONZE  SILVER  GOLD  PLATINUM }
```

### OAuthAccount

```prisma
model OAuthAccount {
  id             String        @id @default(cuid())
  userId         String
  user           User          @relation(...)
  provider       OAuthProvider
  providerUserId String
  accessToken    String?
  refreshToken   String?
  expiresAt      DateTime?

  @@unique([provider, providerUserId])
}

enum OAuthProvider { GOOGLE  APPLE  FACEBOOK  INSTAGRAM }
```

### Address

```prisma
model Address {
  id        String    @id @default(cuid())
  userId    String
  label     String?   // "Home", "Work"
  firstName String
  lastName  String
  line1     String
  line2     String?
  city      String
  state     String    // 2-буквенный код штата США: "CA", "NY"
  zipCode   String
  country   String    @default("US")
  phone     String?
  isDefault Boolean   @default(false)
}
```

### Order

```prisma
model Order {
  id              String      @id @default(cuid())
  orderNumber     String      @unique  // HJS-2024-00042 (человекочитаемый)
  userId          String?
  guestEmail      String?

  status          OrderStatus @default(PENDING_PAYMENT)

  // Разбивка цены
  subtotalUsd     Decimal     @db.Decimal(10,2)
  discountUsd     Decimal     @default(0) @db.Decimal(10,2)
  shippingCostUsd Decimal     @db.Decimal(10,2)
  taxUsd          Decimal     @db.Decimal(10,2)
  totalUsd        Decimal     @db.Decimal(10,2)

  // Доставка
  shippingAddressId   String?
  shippingMethod      String?   // "USPS First Class" | "USPS Priority"
  trackingNumber      String?
  estimatedDelivery   DateTime?
  shippedAt           DateTime?
  deliveredAt         DateTime?

  // Оплата
  paymentMethod       String?   // "stripe_card"|"apple_pay"|"klarna"|"afterpay"
  stripePaymentIntentId String?
  paidAt              DateTime?

  // Промо и лояльность — добавить сразу!
  promoCodeId         String?
  couponCodeUsed      String?
  loyaltyPointsUsed   Int       @default(0)
  loyaltyPointsEarned Int       @default(0)

  // Метаданные
  source              String?   // "web"|"custom_order"|"admin_manual"
  notes               String?   // заметка от покупателя
  adminNotes          String?

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  items               OrderItem[]
}

model OrderItem {
  id                   String    @id @default(cuid())
  orderId              String
  productId            String
  variantId            String?
  quantity             Int
  unitPriceUsd         Decimal   @db.Decimal(10,2)  // цена на момент покупки
  totalPriceUsd        Decimal   @db.Decimal(10,2)
  customizationDetails String?   // JSON: {"color":"navy","length":21}
  productSnapshot      Json      // КРИТИЧНО: копия продукта на момент покупки
                                 // нужна для отображения истории заказов если продукт удалён
}

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  IN_PRODUCTION      // для made-to-order
  READY_TO_SHIP
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
  PARTIALLY_REFUNDED
}
```

### CustomOrder (Кастомный заказ)

```prisma
model CustomOrder {
  id               String            @id @default(cuid())
  userId           String?
  guestEmail       String?
  productId        String?           // базовый товар для кастомизации
  status           CustomOrderStatus @default(PENDING_REVIEW)

  // Запрос от покупателя
  requestedColor   String?
  requestedLengthCm Float?
  requestedNotes   String
  attachmentUrls   String[]          // фото-референсы от покупателя

  // Ответ продавца
  quotedPriceUsd   Decimal?          @db.Decimal(10,2)
  quotedDays       Int?
  adminNotes       String?

  convertedOrderId String?           // ссылка на Order если принят
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
}

enum CustomOrderStatus {
  PENDING_REVIEW   // ожидает ответа продавца
  QUOTED           // продавец выслал цену
  ACCEPTED         // покупатель принял
  IN_PRODUCTION    // в работе
  READY            // готово, ждёт отправки
  DECLINED         // отклонён
  EXPIRED          // истёк срок ответа (7 дней)
}
```

### Review

```prisma
model Review {
  id           String    @id @default(cuid())
  userId       String
  productId    String
  orderId      String?   // подтверждённая покупка
  rating       Int       // 1-5
  title        String?
  comment      String?
  photoUrls    String[]  // фото покупателя с украшением
  isVerified   Boolean   @default(false) // true если связан с реальным заказом
  isPublished  Boolean   @default(true)
  helpfulCount Int       @default(0)
  createdAt    DateTime  @default(now())

  @@unique([userId, productId])
}
```

### Wishlist

```prisma
model Wishlist {
  id     String         @id @default(cuid())
  userId String         @unique
  items  WishlistItem[]
}

model WishlistItem {
  id          String    @id @default(cuid())
  wishlistId  String
  productId   String
  priceAtAdd  Decimal   @db.Decimal(10,2) // для уведомления "цена снизилась"
  addedAt     DateTime  @default(now())

  @@unique([wishlistId, productId])
}
```

### PromoCode

```prisma
model PromoCode {
  id             String      @id @default(cuid())
  code           String      @unique  // "WELCOME10", "SUMMER20"
  type           PromoType
  value          Decimal     @db.Decimal(10,2) // 20 = 20% или $20
  minOrderUsd    Decimal?    @db.Decimal(10,2)
  maxUsesTotal   Int?
  maxUsesPerUser Int         @default(1)
  usedCount      Int         @default(0)
  validFrom      DateTime
  validUntil     DateTime?
  isActive       Boolean     @default(true)
  applicableTo   PromoScope  @default(ALL)
  createdAt      DateTime    @default(now())
}

enum PromoType  { PERCENT_OFF  FIXED_AMOUNT  FREE_SHIPPING  GIFT }
enum PromoScope { ALL  CATEGORY  PRODUCT  FIRST_ORDER }
```

---

## 3. Таксономия категорий

### URL-структура для SEO

```
/bracelets                      Браслеты
  /bracelets/beaded             Бисерные браслеты
  /bracelets/crystal            Хрустальные браслеты

/necklaces                      Колье
  /necklaces/beaded             Бисерные колье
  /necklaces/lariat             Лариаты (термин принятый в США)

/earrings                       Серьги

/sets                           Комплекты
  /sets/necklace-bracelet       Колье + браслет
  /sets/complete                Полные комплекты (3 предмета)

/gifts                          Подарки (SEO-страницы, не реальные категории)
  /gifts/for-her
  /gifts/for-mom
  /gifts/birthday
  /gifts/wedding
  /gifts/bridesmaid
  /gifts/anniversary
  /gifts/graduation
```

### Google Shopping — категории продуктов

| Тип украшения | Google Product Category |
|---|---|
| Браслеты | Apparel & Accessories > Jewelry > Bracelets |
| Колье/лариаты | Apparel & Accessories > Jewelry > Necklaces |
| Серьги | Apparel & Accessories > Jewelry > Earrings |
| Комплекты | Apparel & Accessories > Jewelry > Jewelry Sets |

---

## 4. Поток кастомных заказов

### Точки входа

1. **Кнопка на странице товара**: "Customize This Piece" (под "Add to Cart")
2. **Страница** `/custom-order` — для полностью уникальных изделий
3. **Ссылка** "Don't see your color?" на странице товара

### Статусная машина

```
Покупатель отправляет запрос → PENDING_REVIEW
        ↓
Продавец отвечает в течение 24ч
        ├── Простая кастомизация (цвет/длина)
        │     → Наценка не нужна → ACCEPTED
        │     → Заказ создаётся напрямую с полем customizationDetails
        │
        └── Сложный заказ
              → Продавец называет цену + срок → QUOTED
              → Email покупателю
                    ↓
              Принял → ACCEPTED → IN_PRODUCTION
              Отказал → DECLINED → Email с альтернативами
              Нет ответа 7 дней → EXPIRED
```

### Форма запроса (MVP)

- Базовый товар (предвыбран если пришли со страницы товара)
- Желаемый цвет (текст + свотч если варианты есть)
- Желаемая длина в **дюймах или сантиметрах** (переключатель — важно для США!)
- Доп. пожелания (текст)
- Email (предзаполнен если авторизован)

### US-специфика кастомных заказов

- "Made just for you" — обязательная формулировка
- Показывать: "Typically ready in 3-5 business days"
- Показывать: "Usually responds within 24 hours" (доверие)
- Политика отмены: нельзя отменить после начала производства — показать до оплаты

---

## 5. Анализ рынка США

### Что обязательно для US-покупателей

**Доставка**
- Free shipping при заказе от $35 — уже стандарт на Etsy
- USPS First Class: $4–6, 3–5 дней
- USPS Priority: $8–12, 1–3 дня (предложить как апгрейд)
- Конкретная дата доставки на странице checkout (не "3-5 days" а "Arrives by April 2")
- Трекинг-номер автоматически при отправке

**Ожидаемые сроки**
- Made-to-order: US-покупатели принимают 3–7 дней производства
- На странице товара показывать: "Handcrafted in 3 business days, then shipped"
- Итого от заказа до получения должно быть ≤ 12 рабочих дней

**Размеры — переводи в дюймы**

| Что | Как показывать |
|---|---|
| Браслет 19.5см | 7.7 inches (19.5 cm) |
| Колье 37см | 14.6 inches / Collar length (37 cm) |
| Лариат 118см | 46.5 inches (118 cm) |

Стандартные длины колье в США:
- Collar: 14" · Choker: 16" · Princess: 18" · Matinee: 20–24" · Opera: 28–36" · Rope: 37"+

**Social Proof**
- "47 sold" — хранить soldCount на Product
- "X people have this in their cart" — реал-тайм
- Фото-отзывы — работают лучше текста
- "Verified purchase" badge на отзывах

**Подарочный рынок**
40–60% покупок handmade-украшений в США — подарки:
- Опция "Gift wrapping" на checkout (даже бесплатная — повышает конверсию)
- "Add a gift message" текстовое поле
- "Gift receipt" — без указания цены
- "Ships directly to recipient" путь

### Ценовое позиционирование (USD)

| Диапазон | Сегмент | Твои продукты |
|---|---|---|
| $0–25 | Импульсная покупка | — слишком низко для ручной работы |
| $25–75 | "Побаловать себя" | Браслеты, лариаты ← основной диапазон |
| $75–150 | Подарок, обдуманная покупка | Комплекты, колье |
| $150+ | Высокий ценовой сегмент | Возможно после роста бренда |

### Ключевые SEO-запросы (США, месячный объём)

| Запрос | Объём |
|---|---|
| beaded bracelets handmade | 18,100 |
| crystal bead bracelet | 9,900 |
| handmade jewelry gift for her | 8,100 |
| garnet bracelet | 6,600 |
| jewelry set necklace and bracelet | 4,400 |
| custom beaded bracelet | 3,600 |
| beaded lariat necklace | 2,400 |
| white crystal bead bracelet | ~1,000 |

---

## 6. Регистрация пользователей

### MVP — обязательно при запуске

| Метод | Приоритет | Зачем |
|---|---|---|
| Email + пароль | P0 | Базовый, всегда нужен |
| Google OAuth | P0 | Наибольшая конверсия в США |
| Apple OAuth | P0 | Обязательно для iOS-аппа, AppStore требует |
| **Гостевой checkout** | P0 | Без него теряешь 20–35% конверсии |

### Гостевой checkout → конверсия в аккаунт

После оформления заказа показывать:
> "Create an account to track your order and earn rewards"
> [Set password] — 1 клик, пароль приходит на почту

Конвертирует ~15–20% гостей в аккаунты.

### Пост-MVP (добавить по мере роста)

| Метод | Когда добавлять | Зачем |
|---|---|---|
| Facebook OAuth | После ~1,000 пользователей | Атрибуция рекламы, аудитория 35+ |
| Instagram OAuth | При запуске Instagram-кампаний | Создатели контента |

### Apple OAuth — важный нюанс

Apple по умолчанию скрывает email. Сохранять `relay-email` Apple как `oauthAccounts.accessToken`, маппить на реальный email после первого контакта (например, подтверждения заказа).

---

## 7. Сбор данных и маркетинг

### При регистрации (минимальное трение)

**Обязательно:**
- Email + Имя

**При первом заказе (сохранить для быстрого checkout):**
- Адрес доставки
- Телефон (показать: "Get text when your order ships")

**Контекстно после покупки:**
- Дата рождения → "Get a birthday surprise!" в профиле
- Предпочтения → после первого заказа
- Дата годовщины → "We'll remind you before it arrives"

### Поведенческие события (авто, без трения)

```
product_viewed          → productId, category, source
add_to_cart             → productId, price
begin_checkout          → cartTotal, itemCount
purchase_completed      → orderId, total, items, paymentMethod
custom_order_requested  → productId, requestType
wishlist_add            → productId
review_submitted        → productId, rating, hasPhoto
```

### Email-сегменты (Klaviyo)

| Сегмент | Критерий | Стратегия |
|---|---|---|
| Новые подписчики | Регистрация, 0 заказов | Welcome-серия 3 письма за 7 дней |
| Первая покупка | 1 заказ, < 30 дней | Thank you + запрос отзыва + "complete the set" |
| Повторные покупатели | 2+ заказа | VIP-доступ, прогресс по тиру лояльности |
| Wishlist без покупки | Есть в wishlist, нет заказа | "Your saved items" + уведомление о снижении цены |
| Отток | Последний заказ 60–90 дней | "We miss you" + скидка 10% |
| День рождения | DOB в текущем месяце | Скидка 15%, действует весь месяц |
| Высокий LTV | Lifetime spend > $100 | Gold/Platinum перки, эксклюзивный превью |
| Кастомный заказ | Есть CustomOrder, нет конверсии | "Ready to order your custom piece?" |

### Атрибуция (фиксировать при регистрации, один раз)

UTM-параметры → `User.acquisitionSource`, `acquisitionCampaign`, `acquisitionMedium`

Это отвечает на вопрос "какой канал приносит покупателей с наибольшим LTV" — критично для распределения бюджета на рекламу.

---

## 8. Лояльность и геймификация

### Структура тиров

| Тир | Порог (lifetime spend) | Бонус к начислению | Перки |
|---|---|---|---|
| Bronze | $0–99 | 1 балл за $1 | Доступ к ценам участника |
| Silver | $100–249 | 1.5 балла за $1 | Бесплатная доставка от $25 |
| Gold | $250–499 | 2 балла за $1 | Бесплатная упаковка, ранний доступ к новинкам |
| Platinum | $500+ | 3 балла за $1 | Срочное производство бесплатно, квартальный подарок |

100 баллов = $1 скидки. Минимум к списанию: 500 баллов ($5).

### LoyaltyTransaction

```prisma
model LoyaltyTransaction {
  id           String           @id @default(cuid())
  userId       String
  type         LoyaltyTxType
  points       Int              // положительное = начислено, отрицательное = списано
  balanceAfter Int              // снимок баланса
  description  String           // "Purchase #HJS-2024-00042"
  orderId      String?
  expiresAt    DateTime?        // баллы сгорают через 12 месяцев
  createdAt    DateTime         @default(now())
}

enum LoyaltyTxType {
  PURCHASE_EARN
  REVIEW_EARN        // +25 (текст) / +50 (с фото)
  REFERRAL_EARN      // +300 за первую покупку реферала
  BIRTHDAY_BONUS     // 2x баллы в месяц рождения
  WHEEL_WIN          // приз с колеса
  ACCOUNT_CREATED    // +100 за регистрацию
  PROFILE_COMPLETE   // +50 за заполнение DOB и телефона
  REDEMPTION         // списание
  EXPIRATION         // сгорание
  MANUAL_ADJUSTMENT  // ручная корректировка администратором
}
```

### Правила начисления баллов

```prisma
model LoyaltyRule {
  id           String          @id @default(cuid())
  event        LoyaltyEvent
  points       Int             // фиксированные баллы
  multiplier   Float?          // или множитель от суммы заказа
  maxPerUser   Int?            // лимит (отзыв — только 1 раз за продукт)
  tierRequired LoyaltyTier?    // некоторые бонусы только для Gold+
  isActive     Boolean         @default(true)
}
```

### Колесо Фортуны

```prisma
model WheelSegment {
  id          String          @id @default(cuid())
  label       String          // "10% Off", "Free Shipping", "500 Points"
  type        WheelPrizeType
  value       Decimal?        @db.Decimal(10,2)
  probability Float           // сумма всех активных = 1.0
  isActive    Boolean         @default(true)
}

model WheelSpinHistory {
  id          String          @id @default(cuid())
  userId      String
  segmentId   String
  prizeType   WheelPrizeType
  prizeValue  String
  promoCodeId String?         // если приз — промокод
  spunAt      DateTime        @default(now())
  usedAt      DateTime?       // когда приз использован
}

enum WheelPrizeType {
  DISCOUNT_PERCENT
  DISCOUNT_FIXED
  FREE_SHIPPING
  POINTS
  PROMO_CODE
  NO_PRIZE          // "Better luck next time" — всегда есть в пуле
}
```

**Правила спина:**
- 1 бесплатный спин каждые 30 дней
- Бонусный спин: первая покупка, день рождения, достижение нового тира
- Спин нужно использовать в течение 7 дней (создаёт срочность)
- **ВАЖНО**: результат определяется на сервере, не на клиенте. Клиент получает результат только после завершения анимации — защита от cheating через инспекцию сети.

### Реферальная программа

```prisma
model Referral {
  id               String          @id @default(cuid())
  referrerId       String          // кто пригласил
  referredEmail    String
  referredUserId   String?         // заполняется при регистрации
  code             String          @unique  // "SARAH2024" — личный код
  status           ReferralStatus
  referrerPoints   Int             // баллы реферреру за успешную покупку
  referredDiscount Decimal         @db.Decimal(10,2)  // скидка новому покупателю
  purchaseOrderId  String?
  createdAt        DateTime        @default(now())
  rewardedAt       DateTime?
}

enum ReferralStatus { PENDING  REGISTERED  PURCHASED  REWARDED }
```

---

## 9. Масштабируемость

### Изображения

- Все изображения → S3 + CloudFront CDN (никогда не через Next.js сервер)
- При загрузке в admin генерировать варианты: оригинал, 800×800, 400×400, 200×200
- Формат: WebP (CloudFront Image Optimization)
- URL в БД: `https://cdn.your-store.com/products/...`
- `width` и `height` обязательны в ProductImage — для next/image и предотвращения CLS

### Индексы БД (добавить сразу)

```sql
-- Каталог товаров
CREATE INDEX idx_products_category ON "Product"("categoryId", "isActive");
CREATE INDEX idx_products_type ON "Product"("type", "isActive");
CREATE INDEX idx_products_featured ON "Product"("isFeatured") WHERE "isFeatured" = TRUE;
CREATE INDEX idx_products_slug ON "Product"("slug");

-- Заказы
CREATE INDEX idx_orders_user ON "Order"("userId", "createdAt" DESC);
CREATE INDEX idx_orders_number ON "Order"("orderNumber");
CREATE INDEX idx_order_items_product ON "OrderItem"("productId");

-- Пользователи
CREATE INDEX idx_users_email ON "User"("email");
CREATE INDEX idx_oauth_provider ON "OAuthAccount"("provider", "providerUserId");

-- Отзывы
CREATE INDEX idx_reviews_product ON "Review"("productId", "isPublished");

-- Лояльность
CREATE INDEX idx_loyalty_user ON "LoyaltyTransaction"("userId", "createdAt" DESC);

-- Wishlist
CREATE INDEX idx_wishlist_items ON "WishlistItem"("wishlistId", "productId");
```

### Кэширование (Next.js ISR)

| Страница | Стратегия | Ревалидация |
|---|---|---|
| `/bracelets`, `/necklaces` | `revalidate = 3600` | On-demand при изменении товара |
| `/products/[slug]` | `revalidate = 3600` | On-demand при изменении/снятии |
| Главная страница | `revalidate = 1800` | При изменении featured-товаров |
| `/orders/[number]` | Динамическая (без кэша) | Всегда свежая |

On-demand revalidation: вызывать `revalidatePath()` из NestJS webhooks при обновлении товара в admin.

### Инвентаризация под нагрузкой

- Не резервировать товар при добавлении в корзину (слишком сложно для MVP, высокий abandon rate)
- При начале checkout: проверить `stockQuantity > 0`, иначе "Sorry, just sold"
- При захвате оплаты: декрементировать `stockQuantity` в той же Prisma-транзакции что и создание Order
- Made-to-order товары: `stockQuantity = 999` (sentinel value, не показывать покупателю)

---

## 10. MVP vs После MVP

### MVP — что должно быть при запуске

**Каталог**
- Листинг с фильтрацией по типу, цвету, материалу
- Страница товара: все атрибуты, галерея, размерная таблица, customization note
- Страницы комплектов с отображением компонентов

**Оформление заказа**
- Корзина + гостевой checkout
- Stripe: карта + Apple Pay + Google Pay
- USPS First Class + Priority
- Email с подтверждением заказа
- Страница трекинга `/orders/[orderNumber]`

**Аккаунты**
- Email + пароль, Google OAuth, Apple OAuth
- История заказов
- Wishlist (сохранить / посмотреть сохранённое)
- Управление адресами доставки

**Кастомные заказы (MVP — упрощённо)**
- Форма "Request customization" на странице товара
- Продавец получает email
- Ответ по email, ручное создание заказа в admin

**SEO**
- Метаданные, canonical URL, JSON-LD на всех страницах
- Sitemap.xml
- Google Shopping фид

### Пост-MVP (по приоритету)

**P1 — первые 3 месяца после запуска (влияние на выручку)**
- Система отзывов с фото
- Wishlist + уведомление о снижении цены
- "Complete the set" апсейл на страницах товаров
- Страница с размерным гайдом
- Gift wrapping на checkout
- Klarna / Afterpay (BNPL увеличивает средний чек на ~20%)
- Facebook OAuth

**P2 — 3–6 месяцев (влияние на удержание)**
- Баллы лояльности (начисление + списание)
- Birthday-бонус
- Win-back email последовательности
- Промокоды
- In-app переписка по кастомным заказам (вместо email)
- Email-запрос отзыва через 3 дня после доставки

**P3 — 6–12 месяцев (влияние на вовлечённость)**
- Тиры лояльности (Bronze/Silver/Gold/Platinum)
- Реферальная программа
- Колесо Фортуны
- Instagram-лента на главной/About
- "Recently viewed" история просмотров
- Abandoned cart email (Klaviyo)
- SMS-уведомления (Twilio)
- Персонализированные рекомендации

---

## 11. Что заводить в БД сейчас vs потом

### Добавить в схему СЕЙЧАС (Issue #62 и #63)

Эти поля критично добавить сразу — ретрофитинг дорог или невозможен без потери данных:

| Поле | Почему нельзя отложить |
|---|---|
| `Product.slug` | Изменение URL после индексации = потеря SEO, нужны 301-редиректы |
| `Product.sku` | Google Shopping требует с первого товара |
| `Product.weightGrams` | Расчёт стоимости доставки при первом заказе |
| `Product.stockType` | Определяет UI-логику (scarcity messaging) |
| `Product.productionDays` | Расчёт даты доставки при первом заказе |
| `Product.soldCount` | Нельзя пересчитать за прошлое если не записывать с первого заказа |
| `Product.googleProductCategory` | Нужен при создании первого Shopping-фида |
| `User.acquisitionSource/Campaign` | Теряется безвозвратно если не фиксировать при регистрации |
| `User.dateOfBirth` | Ретрофитинг = просить уже зарегистрированных пользователей снова |
| `User.referredByUserId` | Информация о реферале доступна только в момент регистрации |
| `User.loyaltyPoints/loyaltyTier` | Добавить столбцы сейчас, логику — позже |
| `User.lifetimeSpendUsd` | Пересчёт из истории заказов возможен, но лучше инкрементировать с нуля |
| `Order.promoCodeId` | Первый промокод не должен требовать миграции |
| `Order.loyaltyPointsUsed/Earned` | Столбцы = 0 до запуска программы лояльности |
| `Order.source` | Аналитика: "web vs custom_order vs admin_manual" с первого дня |
| `OrderItem.productSnapshot` (Json) | КРИТИЧНО: без него нельзя показать историю если товар удалён |
| `ProductSetItem` таблица | Есть комплекты в каталоге с первого дня |
| `Tag + ProductTag` таблицы | Добавить позже = ретро-тегирование всех товаров вручную |
| `WishlistItem.priceAtAdd` | Нужен при создании функции price-drop notification |

### Можно отложить (добавить миграцией когда понадобится)

**Таблицы — создать только при запуске фичи:**
- `PromoCode` — при создании первого промокода
- `WheelSegment / WheelSpinHistory` — при запуске геймификации
- `Referral` — при запуске реферальной программы
- `LoyaltyRule` (конфигурационная таблица) — на старте можно хардкодить

**Поля на существующих таблицах — добавить nullable миграцией:**
- `User.gender` — для персонализации, не блокирует MVP
- `User.phone` — при запуске SMS-уведомлений
- `Product.avgRating / reviewCount` — при запуске системы отзывов (пересчитать из Review)
- `Product.viewCount` — аналитика, не критично для MVP

### Самые рискованные места для неправильного проектирования

1. **`Product.slug`** — генерация логики с первого дня: lowercase, только дефисы, уникальность на уровне БД
2. **`Order.orderNumber`** — формат `HJS-2024-00042` (год + последовательный номер). Выбрать до первого заказа
3. **`OAuthAccount`** структура — `@@unique([provider, providerUserId])` обязателен до первого OAuth-входа
4. **`ProductType` enum** — добавлять значения в enum через миграцию. Начни с полным набором: BRACELET, NECKLACE, LARIAT, EARRINGS, SET, RING, ANKLET
5. **Деньги** — всегда `Decimal @db.Decimal(10,2)`, никогда `Float`. Float вызывает ошибки округления в финансовых расчётах

---

## Приоритетный план действий

### До MVP (8 недель разработки)

```
Неделя 3: Схема БД → установить ВСЕ поля из раздела "добавить сейчас"
Неделя 4: Products API → slug-based routing и Google Shopping фид с первого товара
Неделя 5: Корзина + Checkout → productSnapshot обязателен
Неделя 6: Stripe + BNPL (Klarna/Afterpay с запуска, влияет на AOV)
Неделя 7: Auth (email + Google + Apple) + гостевой checkout
Неделя 8: SEO аудит + Lighthouse 90+ + Google Shopping submission
```

### Первые 3 месяца после запуска

```
1. Собрать первые отзывы → запустить Review систему с фото
2. Настроить Klaviyo → welcome, post-purchase, win-back серии
3. Запустить промокоды для первых покупателей
4. Запустить loyalty points (начисление) — даже без интерфейса
5. Добавить Klarna/Afterpay если ещё не в MVP
```

### 6–12 месяцев

```
1. Запустить loyalty redemption + tier display
2. Реферальная программа
3. Колесо Фортуны
4. Персонализированные рекомендации
5. SMS-маркетинг (Twilio)
6. Pinterest Shopping + Rich Pins
```
