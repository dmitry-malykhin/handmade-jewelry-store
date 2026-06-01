# Runbook — Publish a free public demo

Цель: получить публичный URL, который любой может открыть и пройти по магазину
ровно так же, как локально — каталог, корзина, чекаут (Stripe test mode),
админка, аналитика. Без покупки домена, без AWS, без платных tier'ов.

**Это master playbook** — он связывает между собой отдельные runbook'и
([vercel-setup](vercel-setup.md), [flyio-production-setup](flyio-production-setup.md),
[neon-production-setup](neon-production-setup.md), [cloudflare-r2-setup](cloudflare-r2-setup.md))
в один линейный чеклист. Иди по фазам сверху вниз.

**Время:** ~1.5–2 часа суммарно от чистого листа до живого URL.
**Стоимость:** $0/мес. Все сервисы free tier с большим запасом.

---

## TL;DR — что получится в итоге

| Слой       | Хостинг        | URL после деплоя                              |
| ---------- | -------------- | --------------------------------------------- |
| Frontend   | Vercel         | `https://<project>.vercel.app`                |
| API        | Fly.io         | `https://handmade-jewelry-api.fly.dev`        |
| DB         | Neon           | внутренний — приложение само ходит            |
| Картинки   | Cloudflare R2  | `https://<accountid>.r2.dev/<bucket>/<key>`   |
| Email      | Resend         | отправляет только на твой адрес (без домена) |
| Платежи    | Stripe test    | принимает fake-карту `4242 4242 4242 4242`    |

После настройки **каждый push в `main` → автоматический деплой**. Vercel сам
хукается на репо, Fly.io триггерится через workflow
[`.github/workflows/deploy-flyio-production.yml`](../../.github/workflows/deploy-flyio-production.yml).

---

## Pre-flight checklist

Перед стартом убедись, что у тебя есть:

- [ ] GitHub-аккаунт с админ-доступом к репозиторию
- [ ] Личный email для регистрации сервисов
- [ ] `flyctl` CLI установлен локально: `brew install flyctl`
- [ ] `node` / `pnpm` локально работают (для seed-команды в конце)
- [ ] Карта (НЕ для оплаты — но Stripe и Cloudflare требуют её для верификации
      аккаунта, даже на free tier). Деньги не списываются.
- [ ] Все локальные тесты зелёные: `pnpm test:run` (web), `pnpm --filter api test`,
      `pnpm lint`, `pnpm format:check`.

---

## Phase 1 — Neon (production database)

**Time:** 5–10 мин. **Cost:** $0 (0.5 GB storage + автосуспенд после 15 мин idle).

1. Зарегистрируйся на [neon.tech](https://neon.tech) через GitHub.
2. Create new project:
   - Name: `handmade-jewelry-store`
   - Postgres version: 16
   - Region: `US East (Ohio)` (близко к Fly.io us-east, Vercel us-east)
3. После создания скопируй **pooled** connection string. Он выглядит так:
   ```
   postgresql://jewelry_app:<password>@ep-xxx-xxx-pooler.us-east-2.aws.neon.tech/jewelry?sslmode=require
   ```
   Ключевое — суффикс `-pooler` в хостнейме. Pooled URL поддерживает много
   соединений из Fly.io (Session mode); non-pooled — нет.
4. Сохрани этот URL во временный файл — он понадобится в Phase 5 как
   `DATABASE_URL`.

**Verify:** в Neon UI → SQL Editor → выполни `SELECT 1;` → должно вернуться `1`.

Полная версия с настройкой бэкапов: [neon-production-setup.md](neon-production-setup.md).

---

## Phase 2 — Stripe (test mode)

**Time:** 5 мин. **Cost:** $0 (test mode никогда не списывает деньги).

1. Зарегистрируйся на [stripe.com](https://stripe.com). Прохождение KYC для
   live mode НЕ нужно — мы пользуемся только test mode.
2. После регистрации убедись, что переключатель сверху-справа стоит в
   **Test mode** (а не Live mode).
3. Developers → API keys. Скопируй два значения:
   - **Publishable key** (`pk_test_...`) — публичный, идёт в frontend.
   - **Secret key** (`sk_test_...`) — приватный, идёт в backend.
4. Developers → Webhooks → **Add endpoint**:
   - Endpoint URL: `https://handmade-jewelry-api.fly.dev/api/stripe/webhook`
     (этот URL ещё не существует — мы создадим его в Phase 5, но добавить
     можно сейчас)
   - Events to send: `payment_intent.succeeded`, `payment_intent.payment_failed`,
     `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`
   - После создания скопируй **Signing secret** (`whsec_...`) — пойдёт как
     `STRIPE_WEBHOOK_SECRET`.

**Verify:** Developers → Webhooks → твой endpoint → видно статус `Active`.

---

## Phase 3 — Resend (transactional email)

**Time:** 5 мин. **Cost:** $0 (3 000 писем/мес, отправка только на свой email
без верифицированного домена).

1. Зарегистрируйся на [resend.com](https://resend.com).
2. API Keys → **Create API key** → имя `handmade-jewelry-store-prod` → permission
   `Sending access` → copy ключ (`re_...`). Это `RESEND_API_KEY`.
3. **Без домена** Resend разрешает отправку только на тот email, под которым
   ты регистрировался. Этого хватает для demo — все письма (`order_confirmation`,
   `shipping_notification`) будут приходить тебе. Покупатели-демо своих писем
   не получат, и это нормально.
4. Когда купишь senichka.com, верифицируй домен в Resend и можно будет писать
   реальным покупателям.

---

## Phase 4 — Cloudflare R2 (product images)

**Time:** 10 мин. **Cost:** $0 (10 GB storage + 10M Class A operations / мес).

1. Зарегистрируйся на [cloudflare.com](https://cloudflare.com).
2. R2 → Create bucket: `handmade-jewelry-store-product-images`. Location: Auto.
3. Settings → Public Access → **Allow Access** (для CDN-доступа к картинкам).
   Запомни Public R2.dev URL — выглядит как `https://pub-<хэш>.r2.dev`.
4. R2 → Manage R2 API Tokens → **Create API token**:
   - Permissions: `Object Read & Write`
   - Specify bucket: только что созданный
   - Copy: **Access Key ID** и **Secret Access Key**. Это пара
     `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (R2 совместим с S3 API,
     поэтому имена переменных AWS-стиля).
5. CORS policy на bucket → **Add CORS Policy** → JSON:
   ```json
   [{
     "AllowedOrigins": ["http://localhost:3000", "https://*.vercel.app"],
     "AllowedMethods": ["GET", "HEAD", "PUT", "POST"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"],
     "MaxAgeSeconds": 3000
   }]
   ```

**Verify:** в R2 UI можно вручную загрузить картинку и открыть её по public URL.

Полная версия: [cloudflare-r2-setup.md](cloudflare-r2-setup.md).

---

## Phase 5 — Fly.io (NestJS API)

**Time:** 20–25 мин. **Cost:** $0 (3 shared-cpu-1x с 256 MB RAM бесплатно).

### 5.1 — Создать app

```bash
# Логин
flyctl auth login

# Создать app БЕЗ деплоя (deploy сделает workflow позже)
flyctl launch \
  --name handmade-jewelry-api \
  --config apps/api/fly.production.toml \
  --copy-config \
  --no-deploy \
  --org personal
```

Если `fly.production.toml` уже привязан к существующему app — пропусти этот
шаг и переходи к 5.2.

### 5.2 — Поставить секреты

Подставь значения из предыдущих фаз. **JWT secrets сгенерируй случайные**:

```bash
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

flyctl secrets set \
  --app handmade-jewelry-api \
  NODE_ENV=production \
  API_PORT=4000 \
  FRONTEND_URL=https://YOUR-PROJECT.vercel.app \
  DATABASE_URL="postgresql://jewelry_app:...@ep-xxx-pooler.us-east-2.aws.neon.tech/jewelry?sslmode=require" \
  JWT_SECRET="$JWT_SECRET" \
  JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  JWT_EXPIRES_IN=15m \
  JWT_REFRESH_EXPIRES_IN=7d \
  STRIPE_SECRET_KEY=sk_test_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxx \
  RESEND_API_KEY=re_xxx \
  STORE_OWNER_EMAIL=твой@email \
  AWS_ACCESS_KEY_ID=<r2-access-key-from-phase-4> \
  AWS_SECRET_ACCESS_KEY=<r2-secret-from-phase-4> \
  AWS_REGION=auto
```

`FRONTEND_URL` пока временный — мы вернёмся и перепишем после Phase 6, когда
получим реальный Vercel URL.

### 5.3 — Получить токен для CI

```bash
flyctl auth token
# Скопируй вывод. Это значение для GitHub Secret `FLY_API_TOKEN`.
```

### 5.4 — Положить токен в GitHub Secrets

Repo Settings → Secrets and variables → Actions → **New repository secret**:
- Name: `FLY_API_TOKEN`
- Value: вставь токен из 5.3

### 5.5 — Первый деплой через workflow

Сделай небольшой коммит в `main` (например, пробельное изменение в
`apps/api/README.md`) и пушни. Workflow
[`deploy-flyio-production.yml`](../../.github/workflows/deploy-flyio-production.yml)
сам запустится.

Альтернативно — кликни Run workflow вручную в Actions UI.

**Verify:**
```bash
curl https://handmade-jewelry-api.fly.dev/api/health
# {"status":"ok","info":{"database":{"status":"up"}}}
```

Если health-check возвращает 503 — `flyctl logs --app handmade-jewelry-api` и
читай ошибку. Самая частая — `DATABASE_URL` не указывает на pooled endpoint.

Полная версия: [flyio-production-setup.md](flyio-production-setup.md).

---

## Phase 6 — Vercel (Next.js frontend)

**Time:** 5–10 мин. **Cost:** $0 (Hobby tier).

### 6.1 — Импорт репо

1. Зайди на [vercel.com](https://vercel.com) через GitHub.
2. **Add New → Project** → выбери `handmade-jewelry-store`.
3. **Root Directory:** `apps/web` (важно — иначе Vercel не найдёт `next.config.js`).
4. **Framework Preset:** Next.js (определится автоматически).
5. **Build Command:** оставь default (`pnpm build`).
6. **Output Directory:** default.
7. **Install Command:** `cd ../.. && pnpm install --frozen-lockfile`
   (нужно подняться в корень монорепо, чтобы pnpm увидел workspace).

### 6.2 — Environment Variables

В разделе **Environment Variables** проекта добавь:

| Имя                                 | Значение                                       | Назначение                                |
| ----------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_API_URL`               | `https://handmade-jewelry-api.fly.dev`         | Куда фронт стучится за данными            |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` (из Phase 2)                    | Stripe.js на клиенте                      |
| `DATABASE_URL`                      | тот же pooled URL из Phase 1                   | Серверные компоненты Next.js (если есть)  |
| `NEXT_PUBLIC_APP_VERSION`           | `1.0.0-demo`                                   | Показывается в футере                     |

Optional (можно оставить пустыми — фичи просто отключатся):
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_FB_PIXEL_ID`,
  `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`,
  `NEXT_PUBLIC_CLARITY_PROJECT_ID`, `NEXT_PUBLIC_KLAVIYO_COMPANY_ID`,
  `NEXT_PUBLIC_PINTEREST_TAG_ID`, `NEXT_PUBLIC_SENTRY_DSN`.

### 6.3 — Deploy

Жмёшь **Deploy**. Vercel собирает фронт (~2–3 мин) и публикует на
`https://<project>.vercel.app`.

**Запомни итоговый URL.** Он понадобится в Phase 7.

### 6.4 — Обновить FRONTEND_URL в Fly.io

Теперь возвращаемся в Fly.io и переписываем FRONTEND_URL на реальный
Vercel URL — нужно для CORS:

```bash
flyctl secrets set \
  --app handmade-jewelry-api \
  FRONTEND_URL=https://<твой-проект>.vercel.app
```

Fly.io автоматически перезапустит API с новыми переменными.

Полная версия: [vercel-setup.md](vercel-setup.md).

---

## Phase 7 — Связать всё вместе и протестировать

1. Открой `https://<твой-проект>.vercel.app` в браузере.
2. Должна загрузиться главная страница магазина.
3. На этом этапе **товаров нет** — база пустая. Идём в Phase 8.

---

## Phase 8 — Засеять базу демо-данными

**Time:** 5 мин.

Запусти миграции и seed против production-базы. Самый безопасный способ —
из локальной машины с production `DATABASE_URL`:

```bash
# Подставь свой pooled URL из Phase 1
export DATABASE_URL="postgresql://jewelry_app:...@ep-xxx-pooler.us-east-2.aws.neon.tech/jewelry?sslmode=require"

# Применить все миграции
pnpm --filter api prisma migrate deploy

# Загрузить seed-данные (товары, категории, админ-аккаунт)
pnpm --filter api prisma db seed

# Проверь, что создался админ
pnpm --filter api prisma studio
# Открой User table → должен быть юзер с role=ADMIN
```

Альтернативно можно через `flyctl ssh console` напрямую с продакшн-инстанса —
[flyio-production-setup.md § "Seed initial data"](flyio-production-setup.md).

**Запомни email/пароль админа** — он печатается в логах seed-команды. Это
твой логин в `/admin` на демо.

---

## Phase 9 — End-to-end smoke test

Открой `https://<твой-проект>.vercel.app` и пройди весь сценарий:

- [ ] Главная грузится, видны товары из seed
- [ ] Клик по товару → страница товара открывается, JSON-LD валидный
- [ ] Add to cart → корзина в header показывает счётчик
- [ ] Cart sheet открывается → товар виден, total правильный
- [ ] Checkout → форма адреса принимает данные → переход к shipping
- [ ] Shipping method выбран → переход к Stripe payment
- [ ] Карта `4242 4242 4242 4242`, любая дата в будущем, любой CVV →
      success page
- [ ] Письмо order confirmation пришло тебе на STORE_OWNER_EMAIL
- [ ] Логинишься в `/login` под seed-админом
- [ ] `/admin` открывается, видны все разделы (Dashboard, Products, Orders,
      Customers, Reviews, Categories, Discounts, Analytics, Settings)
- [ ] В Orders виден только что созданный заказ в статусе PAID
- [ ] В Analytics видны цифры за выбранный период

Если все пункты ✓ — демо живо.

---

## Phase 10 (опционально) — Включить Allure dashboard

Allure отчёт по тестам (#252) тоже на free GitHub Pages.

1. Repo Settings → Pages → Source: `Deploy from a branch`.
2. Branch: `gh-pages`, folder: `/ (root)`.
3. Save. Через минуту по URL
   `https://<твой-github-login>.github.io/handmade-jewelry-store/` появится
   дашборд тестов.

Дашборд обновляется при каждом push в main (workflow `allure-publish` в
[ci.yml](../../.github/workflows/ci.yml)).

---

## Поток обновлений после первоначальной настройки

```
ты пишешь код локально
        ↓
git push в feature ветку
        ↓
открываешь PR
        ↓
   ┌──────────────────────────┴──────────────────────────┐
   ↓                                                      ↓
CI (lint + unit tests + e2e)             Vercel preview deploy
зелёные/красные галки в PR               URL вида `<project>-<sha>.vercel.app`
                                          можно проверить визуально до мержа
        ↓
мержишь в main
        ↓
   ┌──────────────────────────┴──────────────────────────┐
   ↓                                                      ↓
Vercel: production rebuild               GitHub Actions: deploy-flyio-production
`<project>.vercel.app` обновился         + Prisma migrations
                                         `handmade-jewelry-api.fly.dev` обновился
        ↓
живой demo обновился — обычно через 2–4 минуты после мержа
```

**Что НЕ требует ручных шагов на каждое обновление:** ничего.
**Что требует ручных шагов:**
- При добавлении нового env var в код — нужно добавить его в Fly.io secrets
  и Vercel env vars
- При изменении схемы БД — миграции применяются автоматически в workflow

---

## Ограничения free tier

Чтобы не было сюрпризов — где упрётся:

| Ограничение                                  | Когда заметишь                                                  | Что делать                                       |
| -------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------ |
| **Fly.io cold start** (5–10 сек на первый запрос после 15 мин idle) | Любой посетитель после простоя видит лаг              | Перейти на `auto_stop_machines = false` ($2/мес) |
| **Neon compute autosuspend** (15 мин idle)   | То же — первый запрос медленнее                                 | Платный tier $19/мес снимает идл-suspend         |
| **Resend без домена** — только на свой email | Покупатели не получают свои письма order_confirmation           | Купить домен + верифицировать в Resend           |
| **Vercel build minutes** (6000/мес на Hobby)| Не упрёшься до десятков деплоев в день                          | —                                                |
| **Stripe в test mode** — реальные платежи не пройдут | Демо-покупатель не сможет купить реально               | KYC → Live mode (нужны бизнес-данные)            |
| **R2 без домена** — URL `<accountid>.r2.dev/...` | Уродливо в JSON-LD и Open Graph                             | Привязать `cdn.<домен>` после покупки            |
| **Cloudflare/Stripe требуют карту** при регистрации | На этапе sign up                                          | Расходов не будет — карта только для верификации |

---

## Когда переключаться на платный stack / AWS / свой домен

Из [docs/12_PLAN_PERSONAL.md](../12_PLAN_PERSONAL.md):

- **Купить домен** — когда сайт готов показывать реальным посетителям
  (после Phase 9 smoke test). $15/год.
- **Stripe Live mode** — когда есть юр-лицо или ИП. KYC в Stripe.
- **Resend custom domain** — сразу после покупки домена.
- **Fly.io платный tier** — после первых заказов, чтобы убрать cold start.
  $5–15/мес.
- **AWS** (через готовый Terraform в [infrastructure/](../../infrastructure/)) —
  после $500/мес revenue, для надёжности и масштабирования. ~$40/мес baseline.

Free tier тянет до нескольких сотен заказов в день — это не блокер для
launch, это вопрос комфорта владельца.

---

## Если что-то сломалось — где смотреть

| Симптом                                   | Где логи                                                           |
| ----------------------------------------- | ------------------------------------------------------------------ |
| Frontend белый/500                        | Vercel → Deployments → последний → Runtime Logs                    |
| API возвращает 500 / 502 / 503            | `flyctl logs --app handmade-jewelry-api`                           |
| Не приходят письма                        | Resend → Logs → последние Send события                             |
| Платёж не списался / webhook не сработал  | Stripe → Developers → Webhook attempts                             |
| Картинки не грузятся                      | Cloudflare → R2 → bucket → check CORS + Public Access              |
| База ругается на connection pool          | `DATABASE_URL` должен быть **pooled** (с `-pooler` в hostname)     |
| Deploy workflow упал                      | GitHub → Actions → последний run → читай step-by-step              |

---

## Откат / удаление демо

Если решишь свернуть всё (например перед launch на свой домен):

```bash
# Fly.io
flyctl scale count 0 --app handmade-jewelry-api    # остановить
# или
flyctl apps destroy handmade-jewelry-api           # удалить целиком

# Vercel — Settings → General → Delete Project
# Neon — Settings → Delete Project
# Cloudflare R2 — bucket → Manage → Delete
# Stripe — оставь, переключишь на Live позже
# Resend — оставь, переключишь домен позже
# GitHub Secret FLY_API_TOKEN — Settings → Secrets → Remove
```

Все эти действия обратимы — можешь поднять заново по этому же документу
за те же ~2 часа.
