# Order Status Model — Handmade Jewelry Store

> Полный анализ жизненного цикла заказа с учётом товаров в наличии и изделий под заказ.
> Последнее обновление: 2026-03-23

---

## Содержание

1. [Контекст и ограничения](#1-контекст-и-ограничения)
2. [Статусы заказа — MVP](#2-статусы-заказа--mvp)
3. [Статусы заказа — После MVP](#3-статусы-заказа--после-mvp)
4. [Диаграмма переходов](#4-диаграмма-переходов)
5. [Статусы платежа](#5-статусы-платежа)
6. [Статусы доставки](#6-статусы-доставки)
7. [Правила отмены и возврата](#7-правила-отмены-и-возврата)
8. [Применение бонусов](#8-применение-бонусов)
9. [Изменения в схеме БД](#9-изменения-в-схеме-бд)
10. [Логика на backend](#10-логика-на-backend)

---

## 1. Контекст и ограничения

### Типы продуктов (влияют на флоу)

| StockType | Описание | Срок изготовления |
|---|---|---|
| `IN_STOCK` | Готовый товар на складе | 0 дней |
| `MADE_TO_ORDER` | Изготавливается после оплаты | 3–7 рабочих дней |
| `ONE_OF_A_KIND` | Уникальное изделие, 1 штука | 0 дней (уже готово) |

### Ключевые особенности ручной работы

- Большинство изделий — `MADE_TO_ORDER` или `ONE_OF_A_KIND`
- Дата доставки = дата заказа + срок изготовления + срок доставки
- Продавец один → нет параллельного производства → нужно ограничение одновременных заказов
- Отмена после начала производства = частичный возврат (материалы уже потрачены)

---

## 2. Статусы заказа — MVP

### Enum `OrderStatus` (обновить в схеме)

```prisma
enum OrderStatus {
  PENDING       // Заказ создан, ожидает подтверждения платежа
  PAID          // Платёж подтверждён Stripe webhook
  PROCESSING    // Товар упаковывается / изготавливается
  SHIPPED       // Трек-номер добавлен, посылка отправлена
  DELIVERED     // Доставлено (подтверждено покупателем или авто через N дней)
  CANCELLED     // Заказ отменён
  REFUNDED      // Полный возврат средств выполнен
}
```

### Таблица статусов MVP

| Статус | Кто устанавливает | Триггер |
|---|---|---|
| `PENDING` | Система | Создание заказа при оформлении |
| `PAID` | Система (Stripe webhook) | `payment_intent.succeeded` от Stripe |
| `PROCESSING` | Админ вручную | Начало упаковки или изготовления |
| `SHIPPED` | Админ (вводит трек-номер) | Добавление `trackingNumber` к заказу |
| `DELIVERED` | Покупатель ИЛИ авто-таймер | Подтверждение получения (или +14 дней после SHIPPED) |
| `CANCELLED` | Покупатель / Админ | До статуса SHIPPED |
| `REFUNDED` | Админ (через Stripe API) | После CANCELLED или DELIVERED (возврат в течение 30 дней) |

### Флоу IN_STOCK / ONE_OF_A_KIND

```
PENDING ──[Stripe webhook]──▶ PAID ──[Админ]──▶ PROCESSING ──[Трек-номер]──▶ SHIPPED ──▶ DELIVERED
   │                           │
   └──[платёж не прошёл]───▶ CANCELLED
                               │
                               └──[отмена до PROCESSING]──▶ CANCELLED ──▶ REFUNDED
```

### Флоу MADE_TO_ORDER

```
PENDING ──[Stripe webhook]──▶ PAID ──[Изготовление ~3-7 дней]──▶ PROCESSING ──[Трек]──▶ SHIPPED ──▶ DELIVERED
                               │
                               └──[отмена до старта производства]──▶ CANCELLED ──▶ REFUNDED

                               После начала производства: CANCELLED с удержанием 50%
```

---

## 3. Статусы заказа — После MVP

Добавляются когда растёт объём заказов и нужна детализация.

```prisma
enum OrderStatus {
  // --- MVP статусы ---
  PENDING
  PAID
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED

  // --- Post-MVP ---
  IN_PRODUCTION         // Изготовление начато (для MADE_TO_ORDER, дополняет PROCESSING)
  PRODUCTION_COMPLETE   // Изделие готово, ожидает отправки
  IN_TRANSIT            // Трекинг показывает "в пути" (от carrier webhook)
  PARTIALLY_REFUNDED    // Частичный возврат (удержание за материалы при отмене mid-production)
  RETURN_REQUESTED      // Покупатель запросил возврат
  RETURN_IN_TRANSIT     // Посылка возврата в пути
  RETURNED              // Возврат получен
  ON_HOLD               // Заморожен (проблема с адресом или платежом)
}
```

### Когда внедрять

| Статус | Когда | Зачем |
|---|---|---|
| `IN_PRODUCTION` | После 50+ заказов/мес | Покупатель видит прогресс, меньше запросов "где мой заказ" |
| `PRODUCTION_COMPLETE` | Вместе с `IN_PRODUCTION` | Ясность для адм и покупателя |
| `IN_TRANSIT` | При подключении USPS/UPS API | Авто-обновление без ручного труда |
| `PARTIALLY_REFUNDED` | При вводе политики частичных возвратов | Честность с покупателем |
| `RETURN_*` | При вводе формальной политики возврата | US закон = 30-day return policy рекомендован |
| `ON_HOLD` | При росте случаев проблем с доставкой | Служба поддержки |

---

## 4. Диаграмма переходов

### MVP (полная)

```
                    ┌─────────────────────────────────────┐
                    ▼                                     │
PENDING ──payment_intent.succeeded──▶ PAID               │
   │                                   │                  │
   └──payment_intent.failed──▶ CANCELLED                  │
                                   │                      │
                          [before PROCESSING]             │
                           admin cancels                  │
                                   │                      │
                                   ▼                      │
                              CANCELLED ──refund──▶ REFUNDED

                    PAID ──admin starts work──▶ PROCESSING
                                                   │
                                          admin adds tracking
                                                   │
                                                   ▼
                                               SHIPPED
                                                   │
                                      customer confirms OR +14 days
                                                   │
                                                   ▼
                                              DELIVERED ──return within 30d──▶ REFUNDED
```

### Разрешённые переходы (строгий whitelist на backend)

| Из → В | Условие | Кто |
|---|---|---|
| `PENDING` → `PAID` | Stripe webhook `payment_intent.succeeded` | Система |
| `PENDING` → `CANCELLED` | Stripe webhook `payment_intent.failed` / timeout | Система |
| `PAID` → `PROCESSING` | Вручную | Админ |
| `PAID` → `CANCELLED` | До начала производства | Покупатель / Админ |
| `PROCESSING` → `SHIPPED` | Трек-номер добавлен | Админ |
| `PROCESSING` → `CANCELLED` | Только для MADE_TO_ORDER, с удержанием | Покупатель / Админ |
| `SHIPPED` → `DELIVERED` | Покупатель подтвердил ИЛИ 14 дней прошло | Покупатель / Система |
| `CANCELLED` → `REFUNDED` | Stripe refund выполнен | Система |
| `DELIVERED` → `REFUNDED` | В течение 30 дней | Админ |

**Запрещены:** любые переходы назад (`SHIPPED` → `PAID`), прыжки через статусы (`PENDING` → `SHIPPED`).

---

## 5. Статусы платежа

### Enum `PaymentStatus` (текущий + изменения)

```prisma
enum PaymentStatus {
  PENDING           // PaymentIntent создан, ожидает подтверждения
  SUCCEEDED         // Платёж успешно прошёл
  FAILED            // Платёж отклонён (недостаточно средств, неверный CVV и т.д.)
  REFUNDED          // Полный возврат выполнен через Stripe
  // Post-MVP:
  // PARTIALLY_REFUNDED  // Частичный возврат (удержание за производство)
  // DISPUTED            // Chargeback от покупателя (фрод-сигнал)
}
```

### Stripe events → PaymentStatus

| Stripe Event | Действие |
|---|---|
| `payment_intent.created` | Запись Payment со статусом `PENDING` |
| `payment_intent.succeeded` | Payment → `SUCCEEDED`, Order → `PAID` |
| `payment_intent.payment_failed` | Payment → `FAILED`, Order → `CANCELLED` |
| `charge.refunded` | Payment → `REFUNDED`, Order → `REFUNDED` |
| `charge.dispute.created` | Алерт администратору (post-MVP: Order → `ON_HOLD`) |

### Почему PaymentStatus и OrderStatus отдельные?

- Платёж может быть успешен, но заказ потом отменён (проблема с наличием)
- Возврат можно выполнить по частично доставленному заказу
- Аудит: нужна полная история платёжных событий независимо от статуса заказа

---

## 6. Статусы доставки

### MVP — Ручное управление

Нет отдельной таблицы. Информация хранится в полях `Order`:

```prisma
model Order {
  // ... существующие поля ...
  trackingNumber    String?    // номер трека: "9400111899223481750000"
  shippingCarrier   String?    // "USPS" | "FedEx" | "UPS" | "DHL"
  shippedAt         DateTime?  // когда отправлено
  estimatedDeliveryAt DateTime? // расчётная дата доставки
}
```

Показывается покупателю в "Order Status" странице с прямой ссылкой на трекинг:
- USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels={trackingNumber}`
- FedEx: `https://www.fedex.com/fedextrack/?trknbr={trackingNumber}`
- UPS: `https://www.ups.com/track?tracknum={trackingNumber}`

### Post-MVP — Интеграция с carrier API

| Сервис | Что даёт | Цена |
|---|---|---|
| **EasyPost** | USPS + FedEx + UPS единый API, трекинг webhook | $0.01/трек + $0.01/label |
| **Shippo** | Аналогично EasyPost, есть free tier | $0/mo (pay-per-use) |
| **AfterShip** | Только трекинг (не лейблы), хорошая панель | $9/mo |

**Рекомендация:** EasyPost. Один API для покупки лейблов и трекинга. Всё через webhook.

### Post-MVP DeliveryStatus enum (внутри EasyPost/Shippo webhook)

```
PRE_TRANSIT → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED → FAILURE (не доставлено)
```

Маппинг в OrderStatus:
- `IN_TRANSIT` → продолжает показываться `SHIPPED` (или новый `IN_TRANSIT` после MVP)
- `DELIVERED` → авто-переход Order в `DELIVERED`
- `FAILURE` → алерт администратору

---

## 7. Правила отмены и возврата

### Окно отмены по типу продукта

| StockType | До PROCESSING | После PROCESSING | После SHIPPED |
|---|---|---|---|
| `IN_STOCK` | ✅ Полный возврат | ✅ Полный возврат | ❌ Только через возврат |
| `MADE_TO_ORDER` | ✅ Полный возврат | ⚠️ 50% возврат (материалы) | ❌ Только через возврат |
| `ONE_OF_A_KIND` | ✅ Полный возврат | ✅ Полный возврат | ❌ Только через возврат |

### Политика возврата (US standard — обязательно для конкуренции с Etsy)

- **30 дней** с момента доставки (для неперсонализированных)
- **Нет возврата** для кастомных заказов (с изменением цвета/длины под клиента)
- Покупатель оплачивает обратную доставку (стандарт для handmade on Etsy)
- Возврат средств в течение 3-5 рабочих дней после получения товара

### Поле `cancelReason` для аналитики

```prisma
enum CancelReason {
  CUSTOMER_REQUEST    // покупатель передумал
  OUT_OF_STOCK        // материалов нет (форс-мажор)
  PAYMENT_FAILED      // технический сбой платежа
  SHIPPING_ISSUE      // проблема с доставкой
  FRAUD_SUSPECTED     // подозрение на фрод
  OTHER               // прочее
}
```

---

## 8. Применение бонусов

> Система лояльности — Post-MVP. Заложить в схему данных сейчас.

### Когда начисляются и списываются баллы

| Событие | Действие | Статус заказа |
|---|---|---|
| Использование бонусов | Списание (`loyaltyPointsUsed`) | `PENDING` → `PAID` |
| Начисление за покупку | Зачисление (`loyaltyPointsEarned`) | При переходе в `DELIVERED` |
| Отмена до DELIVERED | Аннулирование начисленных баллов | При переходе в `CANCELLED` |
| Возврат | Аннулирование начисленных баллов | При переходе в `REFUNDED` |

### Почему начисление в DELIVERED, а не SHIPPED?

Если начислять при SHIPPED, покупатель может вернуть товар и оставить баллы.
30-дневное окно возврата → начислять баллы безопасно только после `DELIVERED`.

### Поля в Order для баллов

```prisma
model Order {
  // ... существующие поля ...
  loyaltyPointsUsed   Int   @default(0)  // балл = $0.01
  loyaltyPointsEarned Int   @default(0)  // начисляются при DELIVERED
}
```

---

## 9. Изменения в схеме БД

### Order model — добавить поля

```prisma
model Order {
  id                  String        @id @default(cuid())
  userId              String?       // nullable для guest checkout (post-auth)
  user                User?         @relation(fields: [userId], references: [id])
  status              OrderStatus   @default(PENDING)
  total               Decimal       @db.Decimal(10, 2)
  subtotal            Decimal       @db.Decimal(10, 2)  // до скидок
  shippingCost        Decimal       @db.Decimal(10, 2)  @default(0)

  // Адрес доставки — snapshot на момент заказа (не FK, т.к. адрес может меняться)
  shippingAddress     Json          // { name, line1, line2?, city, state, zip, country, phone }

  // Доставка
  shippingCarrier     String?       // "USPS" | "FedEx" | "UPS"
  trackingNumber      String?
  shippedAt           DateTime?
  estimatedDeliveryAt DateTime?
  deliveredAt         DateTime?

  // Отмена
  cancelledAt         DateTime?
  cancelReason        CancelReason?
  cancelNote          String?       // человекочитаемая причина для покупателя

  // Возврат
  refundedAt          DateTime?
  refundAmount        Decimal?      @db.Decimal(10, 2)  // может быть меньше total (частичный)

  // Бонусы (Post-MVP, добавить сейчас)
  loyaltyPointsUsed   Int           @default(0)
  loyaltyPointsEarned Int           @default(0)

  // Источник заказа (аналитика)
  source              String?       // "web" | "mobile" | "admin"

  items               OrderItem[]
  payment             Payment?
  statusHistory       OrderStatusHistory[]  // лог переходов
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
}
```

### OrderStatusHistory — лог переходов (важно для поддержки)

```prisma
model OrderStatusHistory {
  id         String      @id @default(cuid())
  orderId    String
  order      Order       @relation(fields: [orderId], references: [id])
  fromStatus OrderStatus?  // null для первого статуса
  toStatus   OrderStatus
  note       String?       // комментарий администратора
  createdAt  DateTime    @default(now())
  createdBy  String?     // userId или "system" для авто-переходов
}
```

### OrderItem — добавить snapshot продукта

```prisma
model OrderItem {
  id              String   @id @default(cuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id])
  productId       String?  // nullable: продукт мог быть удалён
  product         Product? @relation(fields: [productId], references: [id])
  productSnapshot Json     // { title, slug, sku, images[0] } — snapshot на момент заказа
  quantity        Int
  price           Decimal  @db.Decimal(10, 2)  // snapshot цены
}
```

### Product — добавить поля для производства

```prisma
model Product {
  // ... существующие поля ...
  stockType       StockType  @default(IN_STOCK)
  productionDays  Int        @default(0)  // 0 = в наличии, 3-7 = под заказ
}

enum StockType {
  IN_STOCK
  MADE_TO_ORDER
  ONE_OF_A_KIND
}
```

### OrderStatus enum — обновить

```prisma
enum OrderStatus {
  PENDING
  PAID
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum CancelReason {
  CUSTOMER_REQUEST
  OUT_OF_STOCK
  PAYMENT_FAILED
  SHIPPING_ISSUE
  FRAUD_SUSPECTED
  OTHER
}
```

---

## 10. Логика на backend

### Сервис переходов (паттерн State Machine)

```typescript
// apps/api/src/orders/order-status.transitions.ts

export const ALLOWED_ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:    ['PAID', 'CANCELLED'],
  PAID:       ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED:    ['DELIVERED'],
  DELIVERED:  ['REFUNDED'],
  CANCELLED:  ['REFUNDED'],
  REFUNDED:   [],  // конечный статус
}

export function isValidOrderStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_ORDER_STATUS_TRANSITIONS[from].includes(to)
}
```

### Что автоматически (система) vs вручную (админ)

| Переход | Кто | Как |
|---|---|---|
| `PENDING` → `PAID` | Система | Stripe webhook |
| `PENDING` → `CANCELLED` | Система | Stripe webhook (failed) |
| `PAID` → `PROCESSING` | Админ | Кнопка в панели заказов |
| `PROCESSING` → `SHIPPED` | Админ | Форма: ввод трек-номера + carrier |
| `SHIPPED` → `DELIVERED` | Обе | Покупатель нажал "Получил" ИЛИ авто через 14 дней |
| `CANCELLED` → `REFUNDED` | Система | Stripe refund API (запускает админ) |
| `DELIVERED` → `REFUNDED` | Система | Stripe refund API (запускает админ) |

### Estimate даты доставки

```typescript
// При создании заказа (PENDING)
function calculateEstimatedDeliveryDate(
  productionDays: number,
  shippingDays: number, // Standard: 5-7, Express: 2-3
): Date {
  const today = new Date()
  const totalDays = productionDays + shippingDays
  // Пропускаем выходные для производства
  let businessDaysAdded = 0
  const deliveryDate = new Date(today)
  while (businessDaysAdded < totalDays) {
    deliveryDate.setDate(deliveryDate.getDate() + 1)
    if (deliveryDate.getDay() !== 0 && deliveryDate.getDay() !== 6) {
      businessDaysAdded++
    }
  }
  return deliveryDate
}
```

---

## Приоритет внедрения

| Что | Когда | Issue |
|---|---|---|
| Обновить `OrderStatus` enum (добавить PROCESSING, REFUNDED) | До Issue #27 (Orders API) | #27 |
| Добавить `shippingAddress Json`, `trackingNumber`, `shippedAt` в Order | До Issue #27 | #27 |
| Добавить `OrderStatusHistory` model | До Issue #27 | #27 |
| Добавить `StockType` enum и `productionDays` в Product | До Issue #64 (Products API) | #64 |
| Добавить `cancelReason` + `CancelReason` enum | До Issue #27 | #27 |
| `productSnapshot Json` в OrderItem | До Issue #27 | #27 |
| `loyaltyPointsUsed/Earned` в Order | Сейчас (заложить) | #27 |
| `DeliveryStatus` + carrier API | Post-MVP | Новый issue |
| `PARTIALLY_REFUNDED`, `RETURN_*` статусы | Post-MVP | Новый issue |
