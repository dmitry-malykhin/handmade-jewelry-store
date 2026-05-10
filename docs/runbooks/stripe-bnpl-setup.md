# Stripe BNPL — Klarna + Afterpay Setup

Активация Klarna и Afterpay (Buy Now Pay Later) в Stripe Dashboard. Backend код уже поддерживает оба метода — нужна только настройка в дашборде Stripe.

**Время настройки:** ~10 минут (Test mode), ~1-3 дня для активации Live mode (Stripe verification)
**Стоимость:** Stripe fees per BNPL transaction:
- Klarna: 5.99% + $0.30
- Afterpay: 6% + $0.30
- (vs. card: 2.9% + $0.30)
**Результат:** Klarna и Afterpay появляются как табы в Stripe Payment Element рядом с card form
**Issue:** #101

---

## Зачем

| Метрика | Без BNPL | С BNPL |
|---|---|---|
| AOV (average order value) | baseline | **+20-30%** на handmade jewelry segment ($30-200 SKU range) |
| Conversion rate | baseline | +5-10% на higher-priced items (>$100) |
| Demographic reach | 25-65 cardholders | + younger customers (Gen Z, Millennials) кто preferIfBuy installments |
| Cart abandonment | baseline | -3-5% на checkout (price split reduces sticker shock) |

**Trade-off:** higher Stripe fees (+3% vs card) но обычно **net positive** благодаря AOV uplift и broader audience.

**Когда не имеет смысла включать BNPL:**
- Все товары < $35 — Afterpay minimum order amount; preview не показывается, никто не воспользуется
- Корпоративные / B2B продажи — BNPL предназначен для consumers
- Луксовый сегмент >$1000 — Afterpay typically caps eligibility

Для Senichka (price range $30-200) — BNPL уверенно оправдан.

---

## Что уже сделано в коде (#101)

| Файл | Что |
|---|---|
| [`apps/api/src/payments/payments.service.ts`](../../apps/api/src/payments/payments.service.ts) | `payment_method_types: ['card', 'klarna', 'afterpay_clearpay']` в PaymentIntent.create |
| [`apps/web/src/lib/installment-preview.ts`](../../apps/web/src/lib/installment-preview.ts) | Helper `calculateInstallmentPreview(totalUsd) → { amount, count } \| null` (eligibility window $35–$1000) |
| [`apps/web/src/app/[locale]/shop/[slug]/_components/product-info.tsx`](../../apps/web/src/app/[locale]/shop/[slug]/_components/product-info.tsx) | "Or 4 payments of $X" под ценой (когда eligible) |
| [`apps/web/src/app/[locale]/checkout/_components/checkout-order-summary.tsx`](../../apps/web/src/app/[locale]/checkout/_components/checkout-order-summary.tsx) | Same preview в order summary |
| `apps/web/messages/{en,ru,es}.json` | i18n keys: `productDetail.installmentPreview`, `checkoutPage.installmentPreview` |

⚠️ **Важно:** код добавляет 'klarna' и 'afterpay_clearpay' в `payment_method_types` — но Stripe **не покажет** их в Payment Element пока не активированы в Dashboard (Шаг 1 ниже). Это безопасно: Stripe filters по eligibility (account activation, region, currency, amount, customer locale).

---

## До того как начнёшь

- [ ] Stripe account активирован (живой, не Sandbox)
- [ ] Доступ к Stripe Dashboard
- [ ] Live STRIPE_SECRET_KEY в Fly.io secrets (или Test mode для testing flow)

---

## Шаг 1 — Включить Klarna в Stripe Dashboard

1. https://dashboard.stripe.com → Войди
2. Сверху-справа переключись в **Test mode** (для testing) или оставь **Live mode** (после launch)
3. **Settings** → **Payment Methods** (`/settings/payment_methods`)
4. Найди **Klarna** в списке → **Turn on**

   Stripe попросит:
   - Confirm business info (адрес, налоговый ID, phone) — already есть если account активирован
   - Accept Klarna's terms of service
   - Verify currency support (USD ✓)

5. **Continue** → дождись `Active` status (обычно мгновенно в Test mode, до 1 дня в Live)

## Шаг 2 — Включить Afterpay (Clearpay) в Stripe Dashboard

1. **Settings** → **Payment Methods**
2. Найди **Afterpay/Clearpay** → **Turn on**
3. Confirm business info + ToS — same flow
4. **Continue**

⚠️ Afterpay требует Stripe verification более стрингентно — **Live mode activation** может занять 1-3 рабочих дня. Test mode — instant.

## Шаг 3 — Test в Test mode

После активации обоих методов в Test mode:

1. Открой production-like preview твоего сайта (`https://senichka.vercel.app`) или local dev
2. Добавь товар стоимостью $50+ в корзину (>$35 чтобы установочный preview показался)
3. Перейди в checkout
4. **Verify на product detail:**
   - Под ценой видишь "Or 4 payments of $X with Klarna or Afterpay."
5. **Verify в checkout summary:**
   - "Or pay in 4 interest-free installments..."
6. **На payment step:**
   - Stripe Payment Element должен показать **3 tabs**: Card / Klarna / Afterpay (порядок может отличаться)
7. **Test Klarna flow:**
   - Click Klarna tab → Stripe redirect на Klarna sandbox
   - Use test phone `+49 30 1234567` (Klarna test) → SMS code `123456`
   - Confirm purchase → redirect back на /checkout/confirmation/[orderId]
   - Order должен иметь `status: PAID`
8. **Test Afterpay flow:**
   - Click Afterpay tab → Stripe redirect на Afterpay sandbox
   - Test scenarios: https://stripe.com/docs/payments/afterpay-clearpay/accept-a-payment#test-cards (Stripe документирует test card numbers + addresses)
   - Confirm → redirect → order PAID

## Шаг 4 — Update Stripe Webhook (Live mode)

После активации в **Live mode**:

1. **Developers** → **Webhooks** → существующий endpoint `https://api.senichka.com/api/payments/stripe/webhook`
2. **Add events** to listen:
   - Уже есть: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`
   - НИЧЕГО не нужно добавлять — те же events применяются для Klarna/Afterpay payments. Stripe normalizes под единый event API.
3. Verify webhook signing secret `whsec_*` в Fly.io secrets — already set после deploy (#242)

## Шаг 5 — Update Fly.io secrets для Live mode (когда готов запускаться)

После Stripe Live mode active:

```bash
flyctl secrets set \
  --app handmade-jewelry-api \
  STRIPE_SECRET_KEY="sk_live_..." \
  STRIPE_WEBHOOK_SECRET="whsec_live_..."
```

⚠️ Test BNPL flow в Test mode перед switch'ем на Live. После Live switch — нельзя rollback к Test без потенциального user impact.

## Шаг 6 — Verify production behavior

```bash
# 1. Дождись Klarna + Afterpay в "Active" status в Stripe Dashboard
# 2. Sanity check API:
curl https://api.senichka.com/api/health
# 3. Сделай test purchase в production с минимальной суммой ($50 — eligible для BNPL)
# 4. Verify Stripe Dashboard → Payments shows Klarna/Afterpay payment
# 5. Verify Order в твоей БД имеет status PAID + Payment record со stripe_id
```

---

## Marketing badges (out of scope для #101)

Issue mentions "Klarna/Afterpay logo badges на checkout и product pages (trust signal)". Per docs/19 §"premium-min" — мы намеренно избегаем icons в trust block. Текстовое упоминание ("Klarna or Afterpay") в installment preview = достаточно.

**Если хочешь добавить official logos** — это **отдельный issue** (post-launch):
- Stripe Brand Hub (https://stripe.com/about/brand-hub) предоставляет SVG для legitimate use
- Klarna/Afterpay имеют свои Brand Guidelines (требуют usage approval для marketing)
- Размер/цвет/positioning regulated брендами — нельзя ad-hoc

Премиум-handmade brands (Catbird, Mejuri) показывают text-only "Pay with Klarna" вместо logos — согласуется с premium-min restraint.

---

## Troubleshooting

| Проблема | Причина | Решение |
|---|---|---|
| Klarna/Afterpay tab не показывается в Payment Element | Не активировано в Stripe Dashboard | Шаг 1/2 — verify "Active" в Settings → Payment Methods |
| `payment_method_type 'klarna' is not enabled` API error | Account не активирован для BNPL | Stripe support — обычно требует business verification |
| Installment preview не отображается на product detail | Цена < $35 или > $1000 | This is intentional — preview скрывается outside Afterpay eligibility |
| `Or 4 payments of $X` показано но Klarna/Afterpay не появились на payment step | Stripe filters eligibility — может быть customer's locale, browser fingerprint | Real customer flow vs test flow может различаться. Skip — Stripe знает что делает. |
| Webhook `payment_intent.succeeded` не приходит для Klarna purchase | Webhook URL/signature mismatch | Verify Stripe webhook config указывает на твой prod URL и signing secret matches |
| Order остаётся PENDING после Klarna confirm | Stripe redirect URL invalid (404) | Verify `confirmParams.return_url` в `checkout-stripe-form.tsx` — должен быть absolute prod URL |

---

## Cleanup (если решил отключить BNPL)

1. **Stripe Dashboard** → Settings → Payment Methods → Klarna → **Turn off**
2. Repeat для Afterpay
3. **Code:** revert `payment_method_types` до `['card']`:
   ```ts
   const paymentMethodTypes = ['card']  // в payments.service.ts
   ```
4. Remove installment preview если хочешь — `apps/web/src/lib/installment-preview.ts` + 2 component edits

⚠️ Existing pending orders с BNPL payment intent останутся в БД — не нарушают новый flow, но customer не сможет complete их (Stripe reject). Optional: mark them CANCELLED через manual SQL.

---

## Связанные документы

- [docs/runbooks/flyio-production-setup.md](flyio-production-setup.md) — STRIPE_SECRET_KEY storage (#242)
- Issue #70 — Stripe Payment Intent backend (foundation, merged ранее)
- Issue #71 — Stripe webhooks (handles Klarna/Afterpay events identically to card events)
- Issue #100 — Apple Pay / Google Pay (similar payment_method_types flow)
- [`apps/api/src/payments/payments.service.ts`](../../apps/api/src/payments/payments.service.ts) — конкретный код где enabled
- [`apps/web/src/lib/installment-preview.ts`](../../apps/web/src/lib/installment-preview.ts) — eligibility logic
