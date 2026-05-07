# Neon PostgreSQL — Production Setup

Production-ready Neon database для боевого NestJS API на Fly.io. Бесплатный tier покрывает MVP-трафик до первой выручки.

**Время настройки:** ~30 минут
**Стоимость:** $0/mo (free tier: 3 GB storage, 1 compute с auto-suspend)
**Результат:** Production database с pooled connection string, запущенными migrations, готовыми secrets для Fly.io
**Issue:** #241

---

## Зачем нужно

NestJS API не запускается без БД. Per [docs/17_STAGING_ENVIRONMENTS.md](../17_STAGING_ENVIRONMENTS.md) — _"Pre-revenue: Fly.io + Neon = $0/mo"_. Neon free tier:

| Limit | Значение | Хватит для MVP? |
|---|---|---|
| Storage | 3 GB | ✅ ~30K товаров с metadata |
| Compute | 1 endpoint, 0.25 vCPU | ✅ ~100K req/day |
| Connections | через pooler — unlimited; direct — 100 | ✅ при использовании Pooler |
| Auto-suspend | 5 min idle → cold start ~1 sec | ⚠️ см. ниже |
| Backup | Point-in-time recovery 24h (free), 7 day (paid) | ✅ для MVP |

**⚠️ Cold start nuance:** Neon free tier suspend'ит compute через 5 минут idle. Первый запрос после suspend = ~1 секунда задержки на wake-up. Acceptable для MVP, но потенциальная UX-проблема при низком трафике. Решения:
- Healthcheck из Fly.io каждые 4 минуты — держит compute warm (но это $0 трюк работает только пока идёт)
- Upgrade на Neon Launch ($19/mo) — no auto-suspend
- Оба варианта документируются в **Phase 2** ниже

**Это отдельно от** [neon-branching-setup.md](neon-branching-setup.md) который про **dev/staging branching workflow**, не production setup.

---

## До того как начнёшь

- [ ] Production-ready Prisma schema in `apps/api/prisma/schema.prisma` (✅ есть)
- [ ] Migrations applied locally — все `apps/api/prisma/migrations/*/migration.sql` готовы
- [ ] `pnpm --filter api db:migrate` работает на твоей local Postgres (✅ обычно так)
- [ ] Email для Neon аккаунта (можно через GitHub OAuth)

---

## Шаг 1 — Создать Neon project

1. https://neon.tech → **Sign up** через GitHub (рекомендую — auto-link с твоим репо для CI later)
2. **Create Project**:
   - **Name:** `handmade-jewelry-store-prod` (отличается от любого staging — easy mental model)
   - **Region:** `US East (Ohio) — aws-us-east-2` ⚠️ важно — **матчится с Fly.io `iad`** для low-latency. Не выбирай Europe или другие.
   - **Postgres version:** `16` (latest stable)
3. **Create**

Дальше Neon покажет welcome screen с **connection string**. Не закрывай его — нужно скопировать.

## Шаг 2 — Включить connection pooling

Neon ENABLED pooler by default since 2024, но проверь:

1. Project dashboard → **Settings** → **Connection pooling** → должно быть **Enabled**
2. Mode: **Session** (default — supports prepared statements + DDL = поддерживает Prisma migrations)
3. Если выключено — Enable, **Save**

⚠️ **Mode matters:**
- **Session mode** (рекомендую): supports migrations, prepared statements, all SQL features. Slightly less efficient, но достаточно для MVP.
- **Transaction mode**: faster, но **breaks Prisma migrations**. Используй только если упрёшься в performance issues post-revenue.

## Шаг 3 — Получить connection strings

В **Dashboard** → **Connection Details** widget. Покажет два URL:

```
# Pooled (use this for DATABASE_URL — runtime queries + migrations in session mode)
postgresql://jewelry_app:<password>@ep-xxx-xxx-pooler.us-east-2.aws.neon.tech/handmade_jewelry_store?sslmode=require

# Direct (use this for one-off operations — psql shell, ad-hoc queries)
postgresql://jewelry_app:<password>@ep-xxx-xxx.us-east-2.aws.neon.tech/handmade_jewelry_store?sslmode=require
```

⚠️ Обрати внимание на отличие: **`-pooler`** suffix в hostname.

**Скопируй Pooled URL.** Это будет `DATABASE_URL` для production.

⚠️ **`?sslmode=require`** обязателен — Neon отказывает unencrypted connections.

## Шаг 4 — Apply migrations to production DB

Запусти из своего dev-машины (один раз):

```bash
# Set DATABASE_URL временно для одной команды
DATABASE_URL="postgresql://jewelry_app:<password>@ep-xxx-pooler.us-east-2.aws.neon.tech/handmade_jewelry_store?sslmode=require" \
  pnpm --filter api exec prisma migrate deploy
```

`migrate deploy` (не `migrate dev`) — production-safe команда:
- Применяет только pending migrations
- Не создаёт новых файлов
- Не сбрасывает БД
- Завершается non-zero при ошибке (CI-friendly)

Должен показать что-то вроде:
```
Applied migrations:
  ✓ 20260322200724_init
  ✓ 20260322210432_core_models
  ...
  ✓ 20260501000000_stock_zero_or_one_check

X migrations applied successfully
```

⚠️ **Не запускай `prisma migrate dev`** против production — он может SHADOW reset БД при детектировании drift'а.

## Шаг 5 — (Опционально) Seed начальных данных

Если хочешь начать с категориями + sample products:

```bash
DATABASE_URL="postgresql://...pooler.../handmade_jewelry_store?sslmode=require" \
  pnpm --filter api exec prisma db seed
```

Альтернатива: **clean launch** — не сидить, добавить товары через admin panel когда мастер готов.

⚠️ **Seed создаёт admin user `admin@jewelry.dev` с паролем `admin123`** (из `apps/api/prisma/seed.ts`). На production **сразу смени password** через `/admin/account/change-password` после первого login. Или заранее измени пароль в seed.ts перед первым запуском.

## Шаг 6 — Verify

```bash
# Проверь что Prisma может подключиться + видит схему
DATABASE_URL="<pooled-url>" pnpm --filter api exec prisma db pull --print | head -20
# Должен показать первые ~20 строк schema.prisma на основе actual Neon DB

# Connect через psql напрямую (опционально, для debug)
DIRECT_URL="<direct-url>"  # !! direct, не pooler
psql "$DIRECT_URL" -c "SELECT count(*) FROM \"Product\";"
# Если seed запустил → 6 строк
# Без seed → 0 строк (если migrations прошли успешно)
```

## Шаг 7 — Сохранить URL в безопасное место

⚠️ **НЕ коммить** `DATABASE_URL` в репо. Текущая `apps/api/.env` в `.gitignore` — local dev only.

**Куда положить production URL:**

1. **Сейчас:** менеджер паролей (1Password / Bitwarden / Apple Keychain) под именем `Neon prod DATABASE_URL`
2. **При #242 (Fly.io deploy):** `flyctl secrets set DATABASE_URL="<pooled-url>"` — secret хранится только в Fly.io, не на твоём диске
3. **Никогда:** не в `.env.production.local` файле, не в shell history (используй `<<<` или editor)

---

## Phase 2 — Cold start mitigation (опционально, после launch)

Free tier auto-suspend через 5 минут idle — первый запрос после suspend ~1 сек задержки. Если это становится UX-проблемой:

### Option A — Keep-warm через UptimeRobot

Использовать существующий setup из [`docs/runbooks/uptimerobot-setup.md`](uptimerobot-setup.md):
- Monitor type: HTTP(S)
- URL: `https://api.senichka.com/api/health` (после #242)
- Interval: **3 minutes** (меньше Neon's 5-min idle threshold)

UptimeRobot pings → Fly.io → API → Neon → query → DB awake. **Cost: $0**.

### Option B — Upgrade Neon Launch plan ($19/mo)

- Disable auto-suspend
- Increase storage to 10 GB
- Increase compute to 0.5 vCPU
- Better support response times

**Когда выбрать B:** revenue ≥ $200/mo (Neon $19 = ~10% of margin). До этого — A достаточно.

---

## Когда мигрировать на AWS RDS (#76)

Чёткие триггеры миграции:
- **Storage > 2.5 GB** (близко к Neon free 3 GB limit)
- **Auto-suspend становится UX-проблемой** даже с keep-warm pings
- **Need для read replicas или multi-region** (Neon free — single region, single endpoint)
- **Compliance** (HIPAA, PCI-DSS Level 1 — Neon SOC 2 Type II но не PCI-certified)
- **Cost optimization** — paid Neon при scale становится дороже AWS RDS

Migration path:
1. Run `infra/aws/setup-networking.sh` (#76 artifacts уже в репо)
2. `pg_dump` from Neon → `pg_restore` to RDS (downtime ~1-5 min при <1GB)
3. Update `DATABASE_URL` в Fly.io secrets → redeploy
4. Verify production traffic
5. Delete Neon project (24-hour soft-delete safety)

---

## Troubleshooting

| Проблема | Причина | Решение |
|---|---|---|
| `password authentication failed for user` | Скопировал пароль с пробелом / lost characters | Re-copy from Neon dashboard, попробуй регенерировать |
| `SSL connection required` | URL без `?sslmode=require` | Добавь к URL — это default требование Neon |
| `permission denied for schema public` | Wrong username (не jewelry_app) | Только role созданный Neon (default `<project>_owner`) имеет full schema rights |
| `prisma migrate deploy` зависает или fails | Pooler в transaction mode (несовместим с migrations) | Settings → Connection pooling → Mode → **Session** |
| Cold start ~3-5 sec (не 1 sec) | Compute scaled to zero полностью; региональная latency | Использовать keep-warm (Phase 2 Option A) или upgrade compute |
| `relation "Product" does not exist` | Migrations не applied | `prisma migrate deploy` запускался против wrong DATABASE_URL |
| Free tier exhausted alert | >3 GB storage или >100 connections | Upgrade Launch plan ($19/mo) или мигрировать на AWS RDS |

---

## Cleanup (для отката)

```bash
# Через Neon Console:
# Project Settings → Delete project → введи имя для подтверждения
# Soft delete — данные восстанавливаемы 24 часа после deletion
```

⚠️ После cleanup — обнови Fly.io secrets с новым DATABASE_URL (например на новый Neon project или на AWS RDS).

---

## Связанные документы

- [docs/17_STAGING_ENVIRONMENTS.md](../17_STAGING_ENVIRONMENTS.md) — pre-revenue vs post-revenue strategy
- [docs/runbooks/neon-branching-setup.md](neon-branching-setup.md) — dev/staging branching workflow (отдельная задача)
- [docs/runbooks/uptimerobot-setup.md](uptimerobot-setup.md) — keep-warm pings (Phase 2)
- Issue **#242** — Fly.io production deploy (consumer этого DATABASE_URL)
- Issue **#76** — AWS RDS (post-revenue миграционный путь, artifacts в репо)
