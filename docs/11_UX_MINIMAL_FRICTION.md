# UX Minimal Friction — Registration, Shipping & Payment

> Принцип: каждый лишний шаг = потерянные деньги.
> Максимальное упрощение для американского и европейского покупателя.
> Последнее обновление: 2026-03-23

---

## Содержание

1. [Цифры: почему friction убивает конверсию](#1-цифры-почему-friction-убивает-конверсию)
2. [Регистрация — минимум данных](#2-регистрация--минимум-данных)
3. [Guest Checkout — без регистрации](#3-guest-checkout--без-регистрации)
4. [Доставка — форма адреса](#4-доставка--форма-адреса)
5. [Оплата — форма платежа](#5-оплата--форма-платежа)
6. [3-шаговый checkout flow](#6-3-шаговый-checkout-flow)
7. [Визуальные требования по каждому шагу](#7-визуальные-требования-по-каждому-шагу)
8. [Mobile-first — критично для jewelry](#8-mobile-first--критично-для-jewelry)
9. [Паттерны и референсы (Etsy, Amazon)](#9-паттерны-и-референсы-etsy-amazon)
10. [Схема данных для адресов](#10-схема-данных-для-адресов)
11. [GitHub Issues для беклога](#11-github-issues-для-беклога)

---

## 1. Цифры: почему friction убивает конверсию

| Факт | Источник |
|---|---|
| ~70% покупателей бросают корзину | Baymard Institute |
| ~35% бросают из-за принудительной регистрации | Baymard |
| ~18% бросают из-за сложного checkout | Baymard |
| ~10% конверсии теряется на каждом лишнем поле формы | Nielsen Norman Group |
| Guest checkout увеличивает конверсию на ~35% | Shopify data |
| Apple Pay увеличивает mobile конверсию на ~65% | Apple internal |

### Что это значит практически

Если 100 человек добавили товар в корзину:
- Без guest checkout: ~25 купят
- С guest checkout: ~35 купят (+40% выручки)
- С Apple Pay: ещё +10-15% с mobile

---

## 2. Регистрация — минимум данных

### MVP: Только Email + Password

```
┌────────────────────────────────────┐
│  Create Account                    │
│                                    │
│  Email ______________________      │
│  Password ____________________     │
│                                    │
│  [Create Account]                  │
│                                    │
│  Already have an account? Sign in  │
└────────────────────────────────────┘
```

**Что НЕ спрашивать при регистрации:**
- ❌ First Name / Last Name (спросить позже, когда сделают заказ)
- ❌ Phone number (только при оформлении заказа, если нужно)
- ❌ Date of birth (пост-МВП, для loyalty)
- ❌ Address (при заказе)
- ❌ "How did you hear about us" (пост-МВП)
- ❌ Newsletter opt-in отдельный чекбокс (вшить в Terms согласие)

### Post-MVP: Social Auth

| Провайдер | Приоритет | Почему |
|---|---|---|
| **Google** | P0 | 60%+ US пользователей имеют Google аккаунт |
| **Apple** | P0 | Обязателен для iOS App в будущем + iOS Safari |
| Facebook | P2 | Declining use, privacy concerns |
| Instagram | P3 | Нет стандартного OAuth, Meta Business API |

Реализация через **NextAuth.js** (для Next.js App Router).

### Email verification

**MVP:** Без обязательного подтверждения email (меньше friction).
Достаточно уведомительного письма "Welcome" + подтверждение в фоне.

**Post-MVP:** Soft verification — пользователь получает письмо, но может использовать аккаунт без подтверждения. Через 48 часов — мягкое напоминание.

---

## 3. Guest Checkout — без регистрации

### Почему это критично (особенно для jewelry gifting)

~40% покупок украшений — подарки. Покупатель хочет:
1. Купить быстро (пока настроение есть)
2. Не создавать аккаунт в незнакомом магазине
3. Оплатить Apple Pay за 2 клика

### Flow Guest Checkout

```
Cart ──▶ [Enter email] ──▶ [Shipping] ──▶ [Payment] ──▶ Order Confirmed
                                                              │
                                              ┌───────────────┘
                                              ▼
                              "Save your info? Create an account
                               with just your password →"
                              [Yes, save my info] / [No thanks]
```

Пост-заказ регистрация — самый high-converting паттерн (Shopify/Amazon).

### DB: guest_email в Order

```prisma
model Order {
  userId       String?  // null для гостевого заказа
  user         User?    @relation(...)
  guestEmail   String?  // email гостя (для отправки чека и трекинга)
}
```

---

## 4. Доставка — форма адреса

### Только необходимые поля (US Standard)

```
┌─────────────────────────────────────────┐
│  Shipping Information                   │
│                                         │
│  Full Name *                            │
│  _______________________________________ │
│                                         │
│  Email *  (prefilled если авторизован)  │
│  _______________________________________ │
│                                         │
│  Address Line 1 *                       │
│  _______________________________________ │
│                                         │
│  Address Line 2  (Apt, Suite — optional)│
│  _______________________________________ │
│                                         │
│  City *          State * ▼   ZIP *      │
│  ____________    ________    ________   │
│                                         │
│  Country *  [United States  ▼]          │
│                                         │
│  Phone  (for delivery notifications)    │
│  _______________________________________ │
│                                         │
│  [Continue to Payment →]                │
└─────────────────────────────────────────┘
```

**Что обязательно (*):** Full Name, Address Line 1, City, State, ZIP, Country
**Что опционально:** Address Line 2, Phone
**Что скрыть по умолчанию:** Country = US (скрыть поле, показать "Ship to US", ссылка "Ship elsewhere →")

### Address Autocomplete

**MVP:** без autocomplete (пишут вручную, это нормально)

**Post-MVP:** Google Places Autocomplete
- Стоимость: $200/month при 10k requests, но начнём с < 1k requests/month = $2-5/month
- Реализация: `<input>` + Google Maps Places API
- Даёт: автозаполнение всех полей одним нажатием

### Валидация ZIP-кода в реальном времени

```typescript
// Валидируем только формат, не проверяем базу USPS (это POST-MVP)
const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/
```

---

## 5. Оплата — форма платежа

### Иерархия методов (приоритет конверсии)

```
1. Apple Pay     ← 1 Touch на iOS Safari. Нет формы вообще!
2. Google Pay    ← 1 Touch на Android Chrome. Нет формы вообще!
3. Credit Card   ← Stripe Elements. Безопасно, знакомо.
4. Klarna/Afterpay ← BNPL (Buy Now Pay Later). Post-MVP.
```

### Что показывать на Payment Step

```
┌─────────────────────────────────────────┐
│  Payment                                │
│                                         │
│  ╔═══════════════════════════╗          │
│  ║     Pay with Apple Pay    ║  ← biggest│
│  ╚═══════════════════════════╝          │
│  ╔═══════════════════════════╗          │
│  ║     Pay with Google Pay   ║          │
│  ╚═══════════════════════════╝          │
│                                         │
│  ──── or pay with card ────             │
│                                         │
│  Card number  _________________________ │
│  MM/YY ________  CVV ___________        │
│  Name on card  ________________________ │
│                                         │
│  🔒 Secure payment via Stripe           │
│                                         │
│  [Pay $68.00 →]                         │
└─────────────────────────────────────────┘
```

**Apple/Google Pay:** Показывать ТОЛЬКО на совместимых устройствах (feature detection через Stripe.js).

**Stripe Elements** автоматически:
- Маскирует номер карты
- Показывает тип карты (Visa/MC/AmEx)
- Валидирует срок действия
- Поддерживает автозаполнение из браузера

### Order Summary — всегда видна

На каждом шаге сбоку (desktop) или сверху (mobile):
```
┌──────────────────────┐
│  Order Summary       │
│                      │
│  Product Name    $68 │
│  Shipping         $5 │
│  ─────────────────── │
│  Total           $73 │
│                      │
│  Estimated delivery: │
│  April 2–4           │
└──────────────────────┘
```

---

## 6. 3-шаговый checkout flow

### Step 1: Contact + Shipping

```
Progress: [1 Shipping] ──── [2 Shipping Method] ──── [3 Payment]
```

Поля: Email (для гостей), Full Name, Shipping Address

### Step 2: Shipping Method

```
Progress: [✓ Shipping] ──── [2 Shipping Method] ──── [3 Payment]
```

```
○ Standard Shipping  5–7 business days   FREE (orders $50+) / $5.99
● Express Shipping   2–3 business days   $12.99

Estimated delivery: April 2–4, 2026
```

**Важно:** Показывать конкретные даты, не "5-7 days". Это увеличивает доверие.

**Free shipping threshold:** $50 (сразу показывать "Add $X more to get free shipping" в корзине).

### Step 3: Payment

```
Progress: [✓ Shipping] ──── [✓ Method] ──── [3 Payment]
```

Apple Pay / Google Pay / Card form + Order Summary

### Order Confirmation (не шаг checkout, но критичен)

```
✅ Order Confirmed!

Order #JW-2026-001
Thank you, Sarah!

Your Moonstone Ring will be crafted with care and shipped by April 1.
You'll receive a tracking email when it ships.

[Track Your Order →]    [Continue Shopping →]

──────────────────────────────────
Save 10% on your next order →
                [Create Account]
──────────────────────────────────
```

---

## 7. Визуальные требования по каждому шагу

### Общие правила (для всего checkout)

- **Progress indicator**: breadcrumb в верхней части (`Step 1 of 3`)
- **Order summary**: всегда видна (sticky на десктопе, collapsible на мобиле)
- **Security badge**: `🔒 Secure 256-bit SSL encryption` — внизу формы платежа
- **Back button**: возврат на предыдущий шаг без потери данных
- **Error messages**: конкретные и помогающие (`"ZIP code must be 5 digits"`, не `"Invalid input"`)
- **Disable submit button** пока форма невалидна (не показывать 500 ошибку)

### Шаг 1 — Trust signals

- Email поле: `"For your order confirmation and shipping updates only"`
- Никаких popup-баннеров / email-capture форм пока идёт checkout
- Логотипы платёжных методов под кнопкой Continue

### Шаг 2 — Conversion signals

- Фото продукта в Order Summary
- "✦ Handcrafted with care" под estimated delivery
- Если MADE_TO_ORDER — "Your item will be handcrafted especially for you"
- "Free returns within 30 days" — уменьшает anxiety перед оплатой

### Шаг 3 — Payment trust

- Большие, читаемые логотипы: Visa, Mastercard, Amex, ApplePay, GooglePay
- "Powered by Stripe" — known brand = trust
- CVV tooltip: маленькая иконка `?` с объяснением где найти CVV
- Никаких дополнительных полей (subscription opt-in, survey, etc.)

---

## 8. Mobile-first — критично для jewelry

### Почему mobile важен именно для jewelry

- Украшения часто покупают импульсивно (увидел в Instagram → перешёл → купил)
- Pinterest трафик: 85% mobile
- Instagram Shopping: 100% mobile
- Целевая аудитория (женщины 25-45) — 70%+ шопинг с телефона

### Требования для mobile checkout

| Требование | Реализация |
|---|---|
| Tap targets ≥ 48px | CSS: `min-height: 48px` на кнопках и полях |
| Keyboard types | `type="email"` `type="tel"` `autocomplete="postal-code"` |
| Автозаполнение | `autocomplete` атрибуты на всех полях |
| Apple Pay one-tap | Stripe Payment Request Button |
| Google Pay one-tap | Stripe Payment Request Button |
| No horizontal scroll | Max-width 100%, no overflow |
| Large error messages | `font-size: 14px` минимум |

### HTML autocomplete атрибуты (обязательно!)

```html
<input autocomplete="name" />          <!-- Full Name -->
<input autocomplete="email" />         <!-- Email -->
<input autocomplete="address-line1" /> <!-- Address Line 1 -->
<input autocomplete="address-line2" /> <!-- Apt/Suite -->
<input autocomplete="address-level2" /><!-- City -->
<input autocomplete="address-level1" /><!-- State -->
<input autocomplete="postal-code" />   <!-- ZIP -->
<input autocomplete="tel" />           <!-- Phone -->
<input autocomplete="cc-name" />       <!-- Name on card (Stripe handles card) -->
```

Это позволяет браузеру заполнить всю форму за 1 клик. Особенно критично на мобиле.

---

## 9. Паттерны и референсы (Etsy, Amazon)

### Что делает Etsy правильно

- ✅ Guest checkout без регистрации
- ✅ Apple Pay в первом экране checkout
- ✅ Progress bar (3 шага)
- ✅ Order summary всегда видна
- ✅ "You're buying directly from [seller name]" — trust сигнал

### Что делает Amazon правильно

- ✅ 1-Click ordering (сохранённая карта + адрес)
- ✅ "Your order is protected by Amazon A-to-z Guarantee"
- ✅ Estimated delivery date с конкретными датами
- ✅ Free shipping threshold ("Add $X for free shipping")

### Что мы берём из обоих

1. Guest checkout (Etsy подход)
2. Apple/Google Pay первыми (Apple подход)
3. Конкретные даты доставки (Amazon подход)
4. Free shipping threshold в корзине (Amazon подход)
5. 3-шаговый checkout (Etsy/Shopify стандарт)
6. "Secure payment" badges (оба)

---

## 10. Схема данных для адресов

### ShippingAddress — JSON в Order (snapshot)

Хранится как JSON в `Order.shippingAddress`, а не как отдельная таблица:

```json
{
  "fullName": "Sarah Johnson",
  "addressLine1": "123 Oak Street",
  "addressLine2": "Apt 4B",
  "city": "Austin",
  "state": "TX",
  "zip": "78701",
  "country": "US",
  "phone": "+1-555-123-4567"
}
```

**Почему JSON:**
- Адрес — snapshot на момент заказа (не должен меняться если пользователь обновит адрес)
- Нет JOIN, нет внешних ключей → простой SELECT
- Гибкость для международных адресов (разные форматы)

### Saved Addresses (Post-MVP)

Для авторизованных пользователей, чтобы не вводить адрес повторно:

```prisma
model Address {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  fullName    String
  line1       String
  line2       String?
  city        String
  state       String
  zip         String
  country     String   @default("US")
  phone       String?
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

---

## 11. GitHub Issues для беклога

### Критично до MVP

```
Title: feat: Guest checkout — allow ordering without creating an account

Description:
Implement guest checkout flow. ~35% of shoppers abandon if forced to register.
Critical for jewelry gifting market (40% of purchases are gifts).

Scope:
- Add guestEmail field to Order model
- Guest checkout option on Cart → Checkout transition
- Email field at start of checkout for guest users
- Post-order "Create account" offer (one-click with pre-filled email)
- Guest users receive order confirmation and shipping emails via guestEmail

Related: #28 (Checkout form)
Priority: P0 — must be in MVP scope
```

```
Title: feat: Checkout — 3-step flow with progress indicator

Description:
Implement minimal-friction 3-step checkout:
Step 1: Contact + Shipping Address
Step 2: Shipping Method (Standard / Express)
Step 3: Payment (Apple Pay / Google Pay / Card)

Requirements:
- Progress breadcrumb at top (Step X of 3)
- Order summary always visible (sticky desktop, collapsible mobile)
- Estimated delivery dates (specific dates, not "5-7 days")
- Free shipping threshold message in cart ("Add $X for free shipping")
- Security badge on payment step
- All form fields with proper autocomplete attributes
- Back button preserves form data

Related: #28, #30
Priority: P0
```

### Важно до MVP

```
Title: feat: Shipping address — form with validation and autocomplete attributes

Description:
Build shipping address form with proper UX:
- Full Name, Address Line 1, optional Line 2, City, State dropdown,
  ZIP (5-digit validation), Country (default US)
- Phone optional
- All fields with HTML autocomplete attributes for browser autofill
- Inline validation (show errors on blur, not on submit)
- State dropdown with all 50 US states

Post-MVP: Google Places autocomplete

Related: #28
Priority: P1
```

```
Title: feat: Stripe Elements — card payment form with Apple Pay and Google Pay

Description:
Implement Stripe payment form:
- Stripe Elements for card input (secure, hosted by Stripe)
- Stripe Payment Request Button for Apple Pay / Google Pay
  (auto-detect device capability, show only if supported)
- Payment method logos: Visa, Mastercard, Amex, ApplePay, GooglePay
- "Powered by Stripe" + SSL badge
- Disable Pay button until form is complete and valid
- Friendly error messages from Stripe

Related: #30
Priority: P0
```

### После MVP

```
Title: feat: Saved addresses — reuse shipping info for returning customers

Description:
Allow authenticated users to save and reuse shipping addresses.

Scope:
- Address model in schema (userId, fullName, line1, line2, city, state, zip, country, phone, isDefault)
- Save address option at checkout ("Save this address for next time")
- Address selector at checkout for returning users
- Default address pre-selected
- Add/edit/delete addresses in Account Settings

Related: Auth issues (#72, #73)
Priority: P2 (post-MVP)
```

```
Title: feat: Google Places address autocomplete

Description:
Add Google Places API autocomplete to shipping address form.
Reduces errors and speeds up checkout — especially on mobile.

Scope:
- Integrate @googlemaps/js-api-loader
- Autocomplete on Address Line 1 field
- Auto-fill City, State, ZIP from selected address
- GOOGLE_MAPS_API_KEY env variable

Cost: ~$2-5/mo at 1k requests, $200/mo at 100k requests
Priority: P2 (post-MVP)
```
