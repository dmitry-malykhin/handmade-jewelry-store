# Fly.io Staging Setup — NestJS API

Настройка бесплатного staging окружения для API на Fly.io.

**Время настройки:** ~2 часа  
**Стоимость:** $0/месяц (free tier: 3 shared VMs, 256MB)  
**Результат:** `staging.api.jewelry-store.com` — автодеплой при merge в main

---

## Prerequisite

- `apps/api/Dockerfile` — уже создан в #40
- `apps/api/fly.toml` — уже в репозитории

---

## Шаг 1 — Установить Fly CLI + создать аккаунт

```bash
brew install flyctl
fly auth signup
```

Бесплатно, без кредитной карты.

---

## Шаг 2 — Создать app и базу данных

```bash
# Создать staging приложение (без деплоя)
fly launch --name handmade-jewelry-api-staging --region iad --no-deploy

# Создать Postgres (free tier)
fly postgres create --name handmade-jewelry-db-staging --region iad

# Привязать базу к приложению — автоматически добавит DATABASE_URL в secrets
fly postgres attach handmade-jewelry-db-staging --app handmade-jewelry-api-staging
```

---

## Шаг 3 — Настроить secrets

```bash
fly secrets set \
  NODE_ENV=staging \
  FRONTEND_URL=https://staging.jewelry-store.com \
  JWT_SECRET=<staging-jwt-secret> \
  JWT_REFRESH_SECRET=<staging-jwt-refresh-secret> \
  STRIPE_SECRET_KEY=sk_test_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxx \
  RESEND_API_KEY=re_xxx \
  SENTRY_DSN=<staging-sentry-dsn> \
  --app handmade-jewelry-api-staging
```

> Используй **test** ключи Stripe — staging не должен трогать реальные платежи.

---

## Шаг 4 — Первый деплой

```bash
# Из корня монорепо
fly deploy --config apps/api/fly.toml --dockerfile apps/api/Dockerfile
```

Проверить:
```bash
curl https://handmade-jewelry-api-staging.fly.dev/api/health
# → {"status":"ok","info":{"database":{"status":"up"}},...}
```

---

## Шаг 5 — Настроить custom domain (опционально)

1. В Fly.io dashboard: **Certificates** → **Add Certificate** → `staging.api.jewelry-store.com`
2. В DNS (Route53 / Cloudflare): добавить CNAME запись
   ```
   staging.api.jewelry-store.com → handmade-jewelry-api-staging.fly.dev
   ```

---

## Шаг 6 — GitHub Actions auto-deploy

Workflow уже создан: `.github/workflows/deploy-staging.yml`

Нужно добавить secret в GitHub:

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `FLY_API_TOKEN`
4. Value: получить через `fly tokens create deploy -a handmade-jewelry-api-staging`

После этого каждый merge в main с изменениями в `apps/api/` автоматически деплоит в staging.

---

## Шаг 7 — Запустить миграции

При первом деплое Prisma миграции запустятся автоматически (CMD в Dockerfile: `prisma migrate deploy && node dist/main`).

Для ручного запуска:
```bash
fly ssh console --app handmade-jewelry-api-staging
npx prisma migrate deploy
```

---

## Полезные команды

```bash
# Логи staging
fly logs --app handmade-jewelry-api-staging

# SSH в контейнер
fly ssh console --app handmade-jewelry-api-staging

# Статус
fly status --app handmade-jewelry-api-staging

# Перезапуск
fly apps restart handmade-jewelry-api-staging
```
