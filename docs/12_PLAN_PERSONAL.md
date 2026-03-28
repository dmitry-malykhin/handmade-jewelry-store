# Личный план — Handmade Jewelry Store

> Неформальные заметки для себя. Не для команды, не для гитхаба.
> Последнее обновление: 2026-03-23

---

## Ответы на вопросы которые я задавал

### 1. Статусы заказа — что решили

Основная суть: большинство товаров делаются под заказ, значит нужен статус `PROCESSING` между `PAID` и `SHIPPED`. Без него покупатель не понимает что происходит с его заказом.

Для MVP хватит 7 статусов:
- `PENDING` → `PAID` → `PROCESSING` → `SHIPPED` → `DELIVERED`
- + `CANCELLED` и `REFUNDED` для отмен

Что важно сделать СЕЙЧАС (до orders API):
- Добавить `PROCESSING` и `REFUNDED` в enum
- Добавить `shippingAddress Json` в Order — адрес фиксируется на момент заказа
- Добавить `trackingNumber` и `shippedAt`
- Добавить `OrderStatusHistory` — лог всех переходов (без него потом не поймёшь что происходило)
- Добавить `productSnapshot Json` в OrderItem — если продукт удалишь, старые заказы сломаются

Бонусы и лояльность — начислять баллы только после `DELIVERED` (не `SHIPPED`), иначе можно вернуть товар и сохранить баллы.

Delivery API (USPS, FedEx) — пост-МВП. Там EasyPost — один API для лейблов и трекинга, платишь только за использование.

---

### 2. Мультивалюта — нужна ли это и когда

Коротко: **не нужна для MVP, не блокирует запуск**.

Stripe автоматически принимает любую карту любой страны — покупатель из Германии может оплатить в USD своей евровой картой. Это работает из коробки.

Когда добавлять: когда увидишь в Google Analytics что >20% трафика из EU/UK/Canada. Это скорее всего произойдёт через 3-6 месяцев после запуска.

Очередь добавления: CAD + GBP сначала (нет EU VAT проблем), потом EUR (нужна VAT-регистрация).

Главная проблема EUR — это НЕ техническая задача, это **регуляторная**. EU VAT требует регистрации если продажи в EU > €10,000/год. Решается через TaxJar (~$19/мес) или вручную через OSS scheme.

Стоимость всего решения: ~$0 до первых €10k от EU покупателей, потом $29-50/мес.

---

### 3. Системы измерения — что решили

**Включить в скоуп до MVP** — это важно потому что данные о размерах нужно заполнять один раз при добавлении товаров. Если сделать это после запуска — придётся вводить всё заново.

Главное решение: хранить всё в метрике (cm, grams), показывать в зависимости от предпочтения пользователя.

Что НЕ нужно конвертировать: бусины (всегда мм, это стандарт даже в США), вес (граммы универсальны в ювелирке).

Переключатель `in | cm` в хедере. По умолчанию дюймы (США — основной рынок).

Кольца пока нет в ассортименте, но когда появятся — это отдельная история (US/EU/UK системы размеров принципиально разные, не просто умножение). Страница Ring Size Guide будет давать SEO-трафик.

---

### 4. UX без трений — самое важное

Главное что надо понять: **каждый лишний клик = потерянные деньги**.

Цифры которые надо запомнить:
- 35% бросают корзину если заставить регистрироваться
- Guest checkout увеличивает конверсию на ~35%
- Apple Pay на мобиле = +65% конверсии против формы карты

Три вещи которые нужно сделать обязательно до запуска:
1. **Guest checkout** — купить без создания аккаунта
2. **Apple Pay / Google Pay** — один тап на телефоне
3. **Конкретные даты доставки** — не "5-7 days", а "Arrives April 2–4"

При регистрации спрашивать только email + password. ВСЁ. Имя, телефон, адрес — при первом заказе.

---

## Куда двигаться дальше — приоритеты

### Что сделать ДО запуска MVP (в текущем порядке задач)

**Сейчас в работе:**
- Issue #63 ✅ — Review, Wishlist, seed script (только что сделали)

**Следующие задачи по плану (уже в Planned):**
1. **#64** — Products API CRUD (создание, редактирование, удаление продуктов)
2. **#65** — Products API фильтрация и поиск
3. **#66** — Catalog page (SSR + ISR)
4. **#67** — Catalog page фильтры + пагинация

**Но перед #64 нужно сначала:**
- **#116** — Обновить схему заказов (OrderStatus enum, OrderStatusHistory, productSnapshot) — это надо сделать ДО Orders API (#27), иначе потом переделывать
- **#112** — Добавить поля размеров в Product — это надо сделать ДО Products API (#64), иначе придётся делать ещё одну миграцию и переписывать все DTO

То есть **правильный порядок:**
```
#116 (обновить схему Order) → #112 (размеры Product) → #64 (Products API) → #65 → #66 → #67
```

После каталога:
```
#113 (measurement toggle frontend) → #25 (Cart) → #26 (Cart UI) →
#27 (Orders API) → #28 (Checkout) → #114 (Guest checkout) → #115 (3-step checkout) →
#72 (JWT Auth) → #73 (Refresh tokens) → #70 (Stripe backend) → #71 (Stripe webhooks) →
#30 (Stripe frontend + Apple Pay) → LAUNCH MVP 🚀
```

### После MVP — в таком порядке

1. **Analytics first:** GA4 (#90), FB Pixel (#94) — без этого не знаешь откуда трафик
2. **Email marketing:** Klaviyo (#95) — abandoned cart flow приносит деньги с первого дня
3. **SEO:** Sitemap, OpenGraph, JSON-LD (#36, #91) — долгосрочный трафик
4. **Google Shopping:** (#92) — прямой канал продаж
5. **Pinterest Rich Pins:** (#93) — наш основной organic трафик для jewelry
6. **Reviews на сайте:** (#98) — social proof, конвертирует
7. **Wishlist backend:** (#97) — back-in-stock emails = деньги
8. **Auth refinement:** Google OAuth, Apple Sign-in
9. **Multi-currency:** CAD + GBP (#09_MULTI_CURRENCY.md)
10. **Saved addresses:** (#117)
11. **BNPL:** Klarna + Afterpay (#101)
12. **Infrastructure:** AWS ECS, CloudFront, CI/CD (#76-#82)

---

## Staging — принятое решение

Полный анализ: `docs/17_STAGING_ENVIRONMENTS.md`

### До MVP — не нужен

В prod нет пользователей, нечего защищать. Нужен только Stripe CLI для локальных webhooks.

```bash
# Добавить перед началом реализации #70 (Stripe backend)
stripe listen --forward-to http://localhost:3001/webhooks/stripe
```

### При деплое MVP в прод — Fly.io + Neon (бесплатно)

```
Next.js staging:  Vercel Preview Deployments (автоматически, $0)
NestJS staging:   Fly.io free tier → staging.api.yourdomain.com ($0)
Database staging: Neon branch "staging" — копия prod за секунды ($0)
```

Итог: **$0/мес**, setup ~3-4 часа. Issues: #126 (Fly.io), #127 (Neon branch).

### После первых $500/мес — AWS shared ALB (+$3-5/мес)

Один ALB для prod и staging через Listener Rules. Один RDS, две databases.
Issue: #128 [POST-MVP].

---

## Чеклист после деплоя на продакшн

> Это не разработка — это операционные шаги которые надо сделать ВРУЧНУЮ после первого деплоя.
> Без них часть функционала работать не будет несмотря на то что код написан правильно.

---

### 🔴 КРИТИЧНО — без этого платежи не работают

#### 1. Stripe: переключить на LIVE ключи

```
Stripe Dashboard → Developers → API keys → переключить "Test mode" → выключить
```

Скопировать LIVE ключи в переменные окружения продакшн сервера:
```
STRIPE_SECRET_KEY=sk_live_...          (НЕ в .env файл, только в secrets CI/CD или хостинга)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

⚠️ `sk_live_` — никогда не в git, никогда не в .env.example. Только в Fly.io secrets / Vercel env / AWS Secrets Manager.

---

#### 2. Stripe: зарегистрировать продакшн webhook endpoint

В тест-режиме работает Stripe CLI (локально). В продакшне нужен реальный endpoint:

```
Stripe Dashboard → Developers → Webhooks → Add endpoint
URL: https://your-domain.com/api/webhooks/stripe
Events: payment_intent.succeeded
        payment_intent.payment_failed
        charge.refunded
        charge.dispute.created
```

После создания → нажать "Reveal" в поле "Signing secret" → скопировать `whsec_...` → добавить в env сервера:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Проверить:** сделать тестовую покупку с real card → в Stripe Dashboard → Webhooks → Events должно быть событие с зелёным статусом 200.

---

#### 3. Apple Pay: зарегистрировать домен

Apple Pay на продакшн домене не работает без верификации. Stripe делает это за тебя, но нужно один раз нажать:

```
Stripe Dashboard → Settings → Payment methods → Apple Pay → Add new domain
Ввести: your-domain.com (и www.your-domain.com отдельно)
```

Stripe скажет: "Download this file and host it at `/.well-known/apple-developer-merchantid-domain-association`"

Скачать файл и положить в репозиторий:
```
apps/web/public/.well-known/apple-developer-merchantid-domain-association
```

Задеплоить → снова нажать "Verify" в Stripe Dashboard.

**Без этого:** Apple Pay кнопка не появится на iOS Safari у покупателей. Google Pay работает без этого шага.

**Проверить:** открыть checkout на iPhone в Safari → должна быть чёрная кнопка Apple Pay.

---

#### 4. Stripe Radar: включить anti-fraud правила

```
Stripe Dashboard → Radar → Rules
```

Включить встроенные правила (бесплатно):
- Block if CVC check fails
- Block if postal code check fails
- Review if charge amount > $150 (настроить под свои цены)

Radar работает из коробки но стандартные правила мягкие. Для jewelry store (высокая цена, ручная работа) лучше ужесточить.

---

### 🟡 ВАЖНО — без этого теряешь деньги и данные

#### 5. Resend: верифицировать домен для email

На free-плане Resend отправляет письма только с `onboarding@resend.dev`. Покупатели видят чужой адрес.

```
Resend Dashboard → Domains → Add Domain
Ввести: your-domain.com
Добавить 3 DNS записи которые покажет Resend (SPF, DKIM, DMARC)
Подождать 5-60 минут → статус "Verified"
```

После верификации обновить `FROM_ADDRESS` в `apps/api/src/email/email.service.ts`:
```ts
const FROM_ADDRESS = 'orders@your-domain.com'   // вместо orders@jewelry.com
```

**Также добавить в env:**
```
FRONTEND_URL=https://your-domain.com
```
Используется в Welcome email для CTA кнопки "Explore the collection".

**Проверить:** сделать тестовый заказ → письмо должно прийти с `orders@your-domain.com`.

---

#### 6. Переключить Stripe с тестовых карт на реальные

После смены на LIVE ключи: тестовые карты `4242 4242 4242 4242` перестают работать.
Сделать тестовый платёж реальной картой на небольшую сумму (например товар за $1) → проверить что письмо пришло, заказ создался, статус в Stripe = Succeeded.

---

#### 7. Проверить CORS и allowed origins на API

В продакшне API должен принимать запросы только с продакшн домена:

```
FRONTEND_URL=https://your-domain.com   → проверить что NestJS CORS настроен на этот URL
```

---

### 🟢 ЖЕЛАТЕЛЬНО — перед первыми реальными покупателями

#### 8. UptimeRobot: мониторинг

```
UptimeRobot → Add New Monitor
URL: https://your-domain.com/health   (NestJS health endpoint — issue #122)
URL: https://your-domain.com          (фронт)
Check interval: 5 min
Alert: email + Telegram
```

Бесплатно для 50 мониторов. Узнаешь о падении через 5 минут, не от покупателя.

---

#### 9. Stripe: включить email receipts покупателям (опционально)

```
Stripe Dashboard → Settings → Emails → Customer emails → Receipt → Enable
```

Страховка: если наш email упал (Resend недоступен) — Stripe сам отправит чек. Не заменяет наш Order Confirmation, но покупатель не останется без подтверждения.

---

#### 10. Проверить все переменные окружения

Финальный список env vars которые должны быть на продакшн сервере (API):
```
NODE_ENV=production
DATABASE_URL=postgresql://...          (Neon prod / RDS)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
FRONTEND_URL=https://your-domain.com
JWT_SECRET=<64+ random chars>
```

Финальный список env vars на фронте (Vercel / Next.js):
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

---

### Порядок выполнения в день деплоя

```
1. Деплой кода (API + Web)
2. Добавить LIVE Stripe ключи в env
3. Зарегистрировать webhook endpoint в Stripe
4. Зарегистрировать домен Apple Pay в Stripe → скачать файл → задеплоить
5. Верифицировать домен в Resend → добавить DNS записи
6. Обновить FROM_ADDRESS в коде → задеплоить ещё раз
7. Сделать тестовый заказ с реальной картой
8. Проверить: письмо пришло, Apple Pay показывается, webhook в Stripe = 200
9. Включить Stripe Radar правила
10. Настроить UptimeRobot
```

---

## Главные риски которые надо не забыть

### 1. EU VAT при масштабировании

Как только EU продажи > €10k/год — нужна VAT регистрация. Не откладывать — штрафы большие.
Решение: TaxJar ($19/мес) включить заблаговременно.

### 2. Ограничение производства

Один мастер = ограниченная пропускная способность. При росте спроса:
- Добавить поле `maxSimultaneousOrders` в настройки магазина
- При достижении лимита — показывать "Currently at capacity, expected availability: [date]"
- Система ожидания (waitlist) — это фича, не баг

### 3. Stripe chargeback fraud

Ручная работа + высокая цена = цель для фродеров.
Решение:
- Включить Stripe Radar (встроенный ML anti-fraud, бесплатно)
- Сохранять IP + User-Agent каждого заказа
- Для крупных заказов (>$150) — дополнительная верификация

### 4. Shipping insurance

Украшения — хрупкий товар высокой ценности.
После ~100 заказов добавить страхование посылок через EasyPost (cents per shipment).

---

## Технические решения которые уже приняты (не переделывать)

- Prisma 5 (не 7) — стабильная версия, хорошая интеграция с NestJS
- ISR revalidate = 3600 для каталога и страниц продуктов
- Semantic tokens everywhere (bg-background, text-foreground) — никаких raw цветов
- Server Components по умолчанию, 'use client' только когда нужно
- Slug-based URLs (/products/moonstone-ring, не /products/123)
- Размеры в метрике в БД, конвертация на фронте
- Цены в USD в БД, конвертация для multi-currency на фронте
- Адрес доставки как JSON snapshot в Order (не FK)
- productSnapshot Json в OrderItem (не теряем данные при удалении продукта)

---

## Файлы документации которые надо держать актуальными

| Файл | Что в нём | Обновлять когда |
|---|---|---|
| CLAUDE.md | Правила для AI, стек, роадмап | При изменении подходов |
| docs/07_DOMAIN_ANALYSIS.md | Бизнес-анализ, сущности | При добавлении нового функционала |
| docs/08_ORDER_STATUS_MODEL.md | Статусы заказов | При изменении флоу заказов |
| docs/09_MULTI_CURRENCY.md | Мультивалюта | Перед внедрением |
| docs/10_MEASUREMENT_SYSTEMS.md | Системы измерения | Перед внедрением |
| docs/11_UX_MINIMAL_FRICTION.md | UX чекаут | Перед реализацией чекаута |
| docs/VERIFICATION_FLOW.md | Чеклист проверки кода | При смене стека/инструментов |

---

## Одна главная мысль

Ювелирный handmade — это эмоциональная покупка. Люди покупают чувства, не продукт.
Весь UX должен создавать атмосферу: "эта вещь сделана специально для тебя, с заботой".

Каждая техническая решение должна служить этому:
- Конкретные даты доставки → снижает тревогу
- "Your item will be handcrafted especially for you" → добавляет ценность
- Фото процесса изготовления → pinterest трафик + trust
- 30-day returns → снимает барьер покупки
- Имя мастера на странице "About" → человечность, конвертация

**Сначала запуск, потом оптимизация. Лучше живой магазин с 5 продуктами, чем идеальный в разработке.**
