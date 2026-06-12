# Fly.io Production Setup — NestJS API

Production-ready Fly.io deploy для NestJS API. В паре с Vercel (#80) + Neon (#241) даёт полный free production stack ($0/mo) до первой выручки.

**Время настройки:** ~45 минут (one-time)
**Стоимость:** $0/mo (free tier: 2340 vCPU-hours, 256 MB RAM, 24/7 uptime для 1 VM)
**Результат:** `https://handmade-jewelry-api.fly.dev/api/health` → 200 OK с DB-connected; auto-deploy при push в main
**Issue:** #242

---

## Зачем нужно

[`flyio-staging-setup.md`](flyio-staging-setup.md) описывает **staging** окружение (`handmade-jewelry-api-staging`, cold-start, auto-stop). Production требует:

| Параметр | Staging | Production |
|---|---|---|
| App name | `handmade-jewelry-api-staging` | `handmade-jewelry-api` |
| `min_machines_running` | 0 (cold start OK) | 1 (no cold starts) |
| `auto_stop_machines` | "stop" | "off" |
| `NODE_ENV` | `staging` | `production` |
| Concurrency limits | 25/20 | 50/40 |
| DATABASE_URL | dev/staging Neon branch | production Neon (#241) |
| Stripe keys | `sk_test_*` | `sk_live_*` (после launch) |
| Custom domain | `*.fly.dev` only | `api.senichka.com` (после #43) |

**Почему отдельный fly.toml:** `apps/api/fly.toml` остаётся для staging (текущий setup). `apps/api/fly.production.toml` (новый файл, в репо) — для production. Workflow явно указывает `-c fly.production.toml`.

---

## До того как начнёшь

- [ ] Fly.io account с верифицированным email (опционально card для рассчёт overage, но free tier достаточен)
- [ ] `flyctl` v0.3+ установлен (`brew install flyctl`)
- [ ] `flyctl auth login` выполнен
- [ ] Neon production DB готова (#241) — у тебя есть `DATABASE_URL` (pooled)
- [ ] У тебя GitHub admin доступ к репо (для добавления Secret `FLY_API_TOKEN`)

---

## Phase 1 — Setup и first deploy (`*.fly.dev` URL)

### Шаг 1 — Создать Fly.io app

```bash
cd apps/api

# launch'ится без deploy — нужен manual control над secrets перед первым deploy
flyctl launch \
  --name handmade-jewelry-api \
  --region iad \
  --no-deploy \
  --copy-config \
  --org personal
```

⚠️ **Не используй `--copy-config`** если не хочешь чтобы flyctl затёр существующий `fly.toml` (staging). Лучше:

```bash
# Создать app без копирования config — fly.toml/fly.production.toml уже в репо
flyctl apps create handmade-jewelry-api --org personal
```

После создания:
- App видна в https://fly.io/dashboard → организация → apps
- URL `https://handmade-jewelry-api.fly.dev` уже зарезервирован
- Ничего не deploy'ed yet

### Шаг 2 — Создать persistent volume (опционально, для logs/cache)

Если нужен disk для caching layer (Redis-less session, file cache, etc.) — пока не нужно:

```bash
# Skip для MVP — приложение stateless
flyctl volumes create api_data --region iad --size 1 --app handmade-jewelry-api
```

Stateful storage ↔ stateless API: для Senichka (Stripe + JWT + Prisma) приложение полностью stateless. Volume не нужен.

### Шаг 3 — Установить secrets

⚠️ **Все secrets ДОЛЖНЫ быть установлены ДО первого deploy**, иначе app start fail и health check провалится.

```bash
flyctl secrets set \
  --app handmade-jewelry-api \
  DATABASE_URL="postgresql://jewelry_app:<pass>@ep-xxx-pooler.us-east-2.aws.neon.tech/jewelry?sslmode=require" \
  JWT_SECRET="$(openssl rand -base64 64)" \
  JWT_REFRESH_SECRET="$(openssl rand -base64 64)" \
  STRIPE_SECRET_KEY="sk_test_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  RESEND_API_KEY="re_..." \
  SENTRY_DSN="https://..." \
  KLAVIYO_PRIVATE_API_KEY="pk_..." \
  KLAVIYO_NEWSLETTER_LIST_ID="ABCDE" \
  STORE_OWNER_EMAIL="owner@senichka.com" \
  FRONTEND_URL="https://senichka.com"
```

⚠️ **Тонкости:**
- `DATABASE_URL` — **pooled** URL из #241, не direct
- `STRIPE_SECRET_KEY` — пока `sk_test_...`, переключи на `sk_live_...` после первой реальной покупки (см. отдельный sub-section ниже)
- `FRONTEND_URL` = твой Vercel production URL (изначально `https://senichka.vercel.app`, после #43 — `https://senichka.com`)
- НЕ ставь `NODE_ENV` или `PORT` через secrets — они в `[env]` блоке `fly.production.toml`

**Verify:**
```bash
flyctl secrets list --app handmade-jewelry-api
# должен показать 11 secrets (значения скрыты)
```

### Шаг 4 — First deploy

```bash
flyctl deploy \
  --config apps/api/fly.production.toml \
  --app handmade-jewelry-api \
  --remote-only
```

`--remote-only` → Docker build на Fly.io builders, не локально. Сэкономит ~10 минут на push'е image.

**Что будет происходить:**
1. Tarball repo → upload to Fly.io builder
2. Multi-stage Docker build (`apps/api/Dockerfile`)
3. Deploy первой machine в region `iad`
4. Health check: `/api/health` опрашивается до 5 минут (max grace period)
5. Если 200 OK → machine помечается healthy, старая (если есть) убирается
6. Если health check fail → deploy aborted, старая machine остаётся (zero downtime)

**Лог watch:**
```bash
flyctl logs --app handmade-jewelry-api
# Ctrl+C чтобы выйти
```

**После успеха:**
```bash
curl https://handmade-jewelry-api.fly.dev/api/health
# Expected: {"status":"ok","db":{"status":"connected"},...}
```

### Шаг 5 — Apply Prisma migrations to Neon

Если #241 уже выполнен полностью — migrations applied. Если нет — сделай это сейчас:

```bash
# С локальной машины (НЕ через flyctl ssh — лишний шаг)
DATABASE_URL="<pooled-prod-url>" \
  pnpm --filter api exec prisma migrate deploy
```

Альтернатива — через Fly.io machine:
```bash
flyctl ssh console --app handmade-jewelry-api
# Внутри machine:
cd /app/apps/api
node node_modules/.bin/prisma migrate deploy
exit
```

**Verify:**
```bash
curl https://handmade-jewelry-api.fly.dev/api/products
# Expected: list of seeded products (если seed запускался) или пустой array
```

### Шаг 6 — Add GitHub Secret для CI auto-deploy

```bash
# Получить deploy token
flyctl tokens create deploy --name "github-actions-deploy" --expiry 8760h --app handmade-jewelry-api
# 8760h = 1 year, тоже нужно ротейтить
```

Token (выглядит как `FlyV1 fm2_lJPECAAA...` или `fly1_...`) → add как GitHub Secret:

GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

```
Name: FLY_API_TOKEN
Value: <скопированный token>
```

⚠️ **Ротейтить ежегодно** — `flyctl tokens revoke <token-id>` + create new + update GitHub Secret.

### Шаг 6.5 — Enable the deploy gate

Workflow-ы `deploy-staging.yml` и `deploy-flyio-production.yml` пропускают свои jobs пока не выставлена repo-level **variable** (не secret) `FLY_DEPLOY_ENABLED=true`. Это защищает от красных runs до запуска прода. Включай только когда выполнены шаги 1–6.

GitHub repo → **Settings** → **Secrets and variables** → **Actions** → вкладка **Variables** → **New repository variable**:

```
Name: FLY_DEPLOY_ENABLED
Value: true
```

Чтобы временно остановить auto-deploy (например на время инцидента) — переключи значение на `false` или удали variable. Workflow-ы тогда снова станут skipped без правок в коде.

### Шаг 7 — Verify CI deploy works

Сделай trivial change в `apps/api/`:

```bash
git checkout -b test/flyio-deploy
echo "// test" >> apps/api/src/main.ts
git add apps/api/src/main.ts
git commit -m "test: trigger Fly.io deploy"
git push -u origin test/flyio-deploy
# Открой PR + merge

# Затем смотри:
# https://github.com/dmitry-malykhin/handmade-jewelry-store/actions
# должен запуститься "Deploy API to Fly.io production" workflow
```

Workflow займёт ~3-5 минут:
- Setup flyctl
- Apply pending migrations (idempotent)
- `flyctl deploy --remote-only`
- Smoke test `/api/health`

### Шаг 8 — Monitor first 24h

Первые 24 часа production особенно — следи за:

```bash
# Live logs
flyctl logs --app handmade-jewelry-api

# Status (machine count, health)
flyctl status --app handmade-jewelry-api

# Metrics dashboard
flyctl dashboard --app handmade-jewelry-api
```

Что watch:
- **OOM kills** в logs → bump `memory_mb` from 256 to 512 в fly.production.toml
- **Database connection errors** → проверь `DATABASE_URL` (pooled, sslmode=require)
- **Health check fails** → grace_period слишком короткий; bump до `30s`
- **Sentry errors** → Sentry dashboard покажет
- **Cold start latency** → не должно быть с min_machines_running=1

---

## Phase 2 — Custom domain `api.senichka.com`

⚠️ Делай **только после #43** (domain куплен и DNS настроен).

### Шаг 1 — Add cert в Fly.io

```bash
flyctl certs create api.senichka.com --app handmade-jewelry-api
```

Fly.io покажет нужные DNS records. Обычно:
- **A record:** `api.senichka.com` → Fly.io edge IP (4 IPs показаны)
- **AAAA record:** для IPv6
- **CNAME validation:** для cert validation (`_acme-challenge.api.senichka.com`)

### Шаг 2 — Добавить records в DNS

В DNS provider'е (Namecheap / Cloudflare / Route 53) добавь все records.

### Шаг 3 — Дождаться cert issued

```bash
flyctl certs show api.senichka.com --app handmade-jewelry-api
# должен показать "Issued"
# Обычно 5-30 минут после DNS пропагации
```

### Шаг 4 — Update FRONTEND_URL и Vercel CORS

В Fly.io secrets:
```bash
flyctl secrets set FRONTEND_URL="https://senichka.com" --app handmade-jewelry-api
```

В Vercel (если NEXT_PUBLIC_API_URL смотрел на старый URL):
- Vercel dashboard → Settings → Environment Variables
- `NEXT_PUBLIC_API_URL` = `https://api.senichka.com`
- Redeploy

### Шаг 5 — Verify

```bash
curl https://api.senichka.com/api/health
# 200 OK, DB connected
```

---

## Switch Stripe to live mode

После первой реальной готовности продавать:

```bash
# 1. В Stripe Dashboard переключиться в Live mode (top-right toggle)
# 2. Активировать аккаунт (заполнить юр. данные, налоги)
# 3. Получить sk_live_* и whsec_live_*

flyctl secrets set \
  --app handmade-jewelry-api \
  STRIPE_SECRET_KEY="sk_live_..." \
  STRIPE_WEBHOOK_SECRET="whsec_live_..."

# 4. В Stripe Dashboard → Webhooks: добавить endpoint https://api.senichka.com/api/payments/stripe/webhook
# 5. Retrieve whsec_live_* и обновить через flyctl secrets set
# 6. Test с real card (Stripe Live — реальная транзакция!)
```

⚠️ **Тестируй на 1 cent перед широким launch** — невозможно отменить Live mode после активации.

---

## Cost monitoring

Free tier:
- **2340 vCPU-hours/month** для shared-cpu-1x — 1 VM 24/7 = 720 hours = **30% of allowance**
- **160 GB egress/month** — должно хватить для MVP трафика

Watch:
```bash
# Current usage
flyctl org info --org personal
# Bill estimate
# Через dashboard: https://fly.io/dashboard/personal/billing
```

**Когда стрелка показывает >80% allowance** — это сигнал что:
- Либо приложение под DDoS / atypical traffic
- Либо production трафик стал серьёзным → пора мигрировать на AWS ECS (#82)
- Либо нужно upgrade на paid plan ($5/mo per machine baseline)

---

## Migration path к AWS ECS Fargate (post-revenue)

Чёткие триггеры миграции:

| Trigger | Reason |
|---|---|
| Revenue > $500/mo | Free Fly.io ROI vs $40/mo AWS оправдан |
| Compliance requirement | PCI-DSS Level 1 (Fly.io is SOC 2 but not PCI-certified) |
| Multi-region scaling | Fly.io supports, но AWS ALB + Route 53 ecosystem more mature |
| Need для AWS-specific services | RDS Multi-AZ, ElastiCache, etc. |

Migration steps (artifacts уже в репо для всех):
1. Run `infra/aws/setup-networking.sh` (#76)
2. Run `infra/aws/setup-ecr.sh` (#81) — создаёт ECR
3. Restore deployd-production.yml from git history (was deleted in #242 — see commit `<sha>`)
4. Push existing Docker image из Fly.io в ECR (or rebuild via CI)
5. Create ECS service per #82 (run setup script when written)
6. Switch DNS `api.senichka.com` → ALB instead of Fly.io
7. Verify, drain Fly.io traffic, delete Fly.io app
8. Update workflow в `.github/workflows/` — снова deploy to ECS

**Estimated effort:** 1 рабочий день (с уже готовыми artifacts), нулевая degradation в траффике если step 6 правильно сделан.

---

## Troubleshooting

| Проблема | Причина | Решение |
|---|---|---|
| `Error: app already exists` | App был создан ранее | `flyctl apps list` — проверь `handmade-jewelry-api` уже там; skip create |
| Health check fail после deploy | Secrets не установлены / app crash | `flyctl logs --app handmade-jewelry-api` — смотри traceback. Чаще — DATABASE_URL invalid |
| `OOM killed` в logs | 256 MB не хватает | Bump `memory_mb` to 512 в `fly.production.toml`, redeploy |
| Cold start ~5 sec на первом запросе | min_machines_running = 0 | Verify в `fly.production.toml` стоит 1 |
| Migrations не применились автоматически | `continue-on-error: true` в workflow + first deploy | Apply manually: `pnpm --filter api exec prisma migrate deploy` с prod DATABASE_URL |
| `403 Forbidden` от Stripe webhook | Webhook URL в Stripe dashboard указывает на staging | Update endpoint URL в Stripe → Production webhook → `https://api.senichka.com/api/payments/stripe/webhook` |
| 503 Service Unavailable | Fly.io edge не нашёл healthy machine | `flyctl status` → check machines. `flyctl deploy` снова если none healthy |
| GitHub Actions: `Error: missing FLY_API_TOKEN` | Secret не установлен в repo | См. Шаг 6 |

---

## Cleanup (для отката)

```bash
# 1. Destroy app
flyctl apps destroy handmade-jewelry-api

# 2. Delete GitHub Secret (UI: Settings → Secrets → FLY_API_TOKEN → Remove)

# 3. Delete файлы
rm apps/api/fly.production.toml
rm .github/workflows/deploy-flyio-production.yml
```

App destroy — soft (24-hour recovery window). Все secrets удаляются вместе с app.

---

## Связанные документы

- [docs/17_STAGING_ENVIRONMENTS.md](../17_STAGING_ENVIRONMENTS.md) — strategy decision
- [docs/runbooks/flyio-staging-setup.md](flyio-staging-setup.md) — staging setup (отдельная app)
- [docs/runbooks/neon-production-setup.md](neon-production-setup.md) — DATABASE_URL source (#241)
- [docs/runbooks/domain-setup.md](domain-setup.md) — Phase 2 prerequisite (#43)
- Issue **#82** — AWS ECS Fargate (post-revenue migration target)
- [`apps/api/fly.production.toml`](../../apps/api/fly.production.toml) — production fly config
- [`.github/workflows/deploy-flyio-production.yml`](../../.github/workflows/deploy-flyio-production.yml) — auto-deploy
