# Klaviyo Email Marketing Setup

Автоматизированные email-флоу для восстановления корзин и retention.

**Время настройки:** ~2 часа  
**Стоимость:** $0 до 500 контактов, $20/мес до 1000, $45/мес до 1500  
**Результат:** автоматические email'ы восстанавливают 5-15% брошенных корзин

---

## Шаг 1 — Создать аккаунт

1. Зайди на **klaviyo.com** → Sign up (free tier)
2. Settings → Account → API Keys
3. Скопируй **Public API Key** (это Company ID)
4. В Vercel env vars:
   ```
   NEXT_PUBLIC_KLAVIYO_COMPANY_ID=<public-api-key>
   ```

---

## Шаг 2 — Проверить что events приходят

Открой сайт → Accept cookies → Добавь товар в корзину → Klaviyo Dashboard → Analytics → Activity Feed.

Должны появиться события:
- `Viewed Product`
- `Added to Cart`
- `Started Checkout`
- `Placed Order`

---

## Шаг 3 — Настроить 4 обязательных flow

### Flow 1: Abandoned Cart (⭐⭐⭐⭐⭐ самый прибыльный)

**Trigger:** `Added to Cart`, filter: no `Placed Order` within 24 hours

| Email | Timing | Content |
|-------|--------|---------|
| #1 | 30 минут после | "Ты забыл свою корзину" + фото товара + кнопка |
| #2 | 24 часа | "Ещё думаешь?" + social proof + 10% off code |

### Flow 2: Post-Purchase Review

**Trigger:** `Placed Order`, wait 7 days

Email: "Как тебе заказ?" + ссылка на review форму.

### Flow 3: Welcome Series

**Trigger:** `Subscribed to List` (newsletter signup)

| Email | Timing | Content |
|-------|--------|---------|
| #1 | Immediate | Welcome + brand story |
| #2 | Day 3 | Bestsellers showcase |
| #3 | Day 7 | 5% off first purchase |

### Flow 4: Win-Back

**Trigger:** 90 days since last `Placed Order`

Email: "Мы скучаем" + 10% discount code.

---

## Шаг 4 — Добавить backend события (опционально)

Для `Fulfilled Order` (когда заказ отправлен):

```
API → Stripe webhook → Klaviyo Server API
    POST https://a.klaviyo.com/api/track
    { event: 'Fulfilled Order', customer_properties: {...}, properties: {...} }
```

Это триггерит shipping notification email.

---

## Чеклист

- [ ] Account создан, Company ID в env
- [ ] Events приходят в Klaviyo Activity Feed
- [ ] Abandoned Cart flow активен
- [ ] Post-Purchase Review flow активен
- [ ] Welcome Series flow активен
- [ ] Win-Back flow активен
