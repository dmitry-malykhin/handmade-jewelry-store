# Vercel Setup — Frontend hosting + Preview Deploys

Подключение Vercel к репо для production-деплоя `apps/web` и автоматических preview-урлов на каждый PR.

**Время настройки:** ~20 минут
**Стоимость:** $0 (Hobby) до custom domain, $20/mo (Pro) когда подключим `senichka.com`
**Результат:** auto-deploy main → production URL, preview URL на каждом PR, HTTPS из коробки
**Issue:** #80

---

## Что даёт Vercel

| Без Vercel | С Vercel |
|---|---|
| Деплой вручную на ECS (потом, в #82) | `git push origin main` → live за 2-3 минуты |
| Preview environments — отдельный staging stack | Preview URL на каждый PR автоматически |
| Управление SSL вручную через ACM/certbot | HTTPS auto-managed (Let's Encrypt + Vercel proxy) |
| Image optimization сами | Next.js `<Image>` оптимизация работает из коробки |
| ISR требует Redis или persistent disk | ISR работает natively на Vercel |
| Analytics — отдельная интеграция | Vercel Speed Insights бесплатно |

## Что создаётся

| Ресурс | Назначение |
|---|---|
| **Vercel Project** `senichka-web` | Связь между GitHub repo и Vercel hosting |
| **GitHub integration** | Push to main → auto-deploy production; PR → preview URL |
| **Environment variables** | Production + preview env vars в Vercel dashboard (не в репо) |
| **Custom domain** (Phase 2) | `senichka.com` указывает на Vercel deployment |
| **`vercel.json`** в репо | Build/install команды для Turborepo monorepo + headers |

**НЕ создаётся в этой задаче:**
- ❌ Custom domain `senichka.com` — это часть #43 (domain purchase). Phase 2 ниже описывает как подключить когда домен куплен
- ❌ Vercel Speed Insights / Web Analytics — добавим post-launch
- ❌ Vercel Cron / Edge Functions — пока не нужно

---

## До того как начнёшь

- [ ] Создан Vercel account на https://vercel.com (бесплатно через GitHub)
- [ ] Установлен Vercel CLI (опционально для local testing): `npm i -g vercel`
- [ ] У тебя есть admin-доступ к GitHub репо `dmitry-malykhin/handmade-jewelry-store`
- [ ] PR с `vercel.json` в репо merged в main (он заберётся при первом deploy)

---

## Phase 1 — Setup проекта (без custom domain)

### Шаг 1 — Создать проект в Vercel

1. https://vercel.com/new
2. **Import Git Repository** → выбери `dmitry-malykhin/handmade-jewelry-store`
   - Если не видишь репо — нажми **Adjust GitHub App Permissions** и дай Vercel доступ к репо
3. На экране конфигурации:
   - **Project Name:** `senichka-web` (или любое — это видно только в dashboard)
   - **Framework Preset:** Vercel auto-detect должен показать **Next.js** (если нет — выбери вручную)
   - **Root Directory:** `apps/web` ⚠️ **критично** для monorepo, нажми **Edit** и укажи
   - **Build & Development Settings:** оставь дефолты — `vercel.json` в репо переопределит при первом deploy

4. **НЕ нажимай Deploy ещё** — нужно сначала ввести env vars (шаг 2)

### Шаг 2 — Environment variables

В том же экране **Environment Variables** добавь все переменные production. Они также доступны для preview deployments по умолчанию.

**Public (NEXT_PUBLIC_*) — bundled в JS, безопасно для браузера:**

```
NEXT_PUBLIC_API_URL              https://api.senichka.com  (или https://api.senichka.vercel.app пока ECS не готов)
NEXT_PUBLIC_SITE_URL             https://senichka.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  pk_test_...  (или pk_live_... для production)
NEXT_PUBLIC_GA_MEASUREMENT_ID    G-XXXXXXXXXX  (если есть)
NEXT_PUBLIC_KLAVIYO_COMPANY_ID   YOUR_KLAVIYO_PUBLIC_KEY  (если есть)
NEXT_PUBLIC_GSC_VERIFICATION_ID  ABC123def456...  (если уже зарегистрирован GSC)
NEXT_PUBLIC_PINTEREST_TAG_ID     2612345678901  (если есть Pinterest Tag)
NEXT_PUBLIC_FACEBOOK_PIXEL_ID    1234567890123456  (если есть FB Pixel)
NEXT_PUBLIC_SENTRY_DSN           https://xxx@sentry.io/yyy
NEXT_PUBLIC_CLARITY_PROJECT_ID   xxxxxxxxxx  (если есть Microsoft Clarity)
NEXT_PUBLIC_CLOUDFRONT_URL       https://d3a9b7xyz.cloudfront.net  (или https://cdn.senichka.com после Phase 2 #77)
```

**Secret (server-only, не bundled):**

```
NEXTAUTH_SECRET                  <openssl rand -base64 32>  — JWT secret для NextAuth
SENTRY_AUTH_TOKEN                <Sentry → User Settings → API Keys, нужен для source-map upload>
```

⚠️ **Никогда** не добавляй сюда переменные API (NestJS) — `STRIPE_SECRET_KEY`, `JWT_REFRESH_SECRET` и др. Они живут в AWS Secrets Manager (см. #76). Vercel hosts ТОЛЬКО фронтенд.

**Per-environment scoping:**

Vercel позволяет задать разные значения для:
- **Production** (на main branch)
- **Preview** (на PR branches)
- **Development** (локально через `vercel dev`)

Для большинства env vars выбирай **All Environments** (Production + Preview + Development). Для `NEXT_PUBLIC_API_URL` можешь сделать разные значения:
- Production: `https://api.senichka.com`
- Preview: `https://api-staging.senichka.com` (когда staging готов) или тот же production
- Development: `http://localhost:4000`

### Шаг 3 — Первый deploy

1. После всех env vars — **Deploy**
2. Build начнётся автоматически. Длится ~2-3 минуты:
   - Install: `cd ../.. && pnpm install --frozen-lockfile`
   - Build: `cd ../.. && pnpm turbo build --filter=@jewelry/web`
   - Deploy: standalone Next.js output в Vercel edge network
3. После успешного билда увидишь **Visit** кнопку → откроется `https://senichka-web-<hash>.vercel.app`

### Шаг 4 — Verify

```bash
# Production URL должен отвечать 200 + HTTPS
curl -I https://senichka-web-<hash>.vercel.app
# HTTP/2 200 + Strict-Transport-Security header (из vercel.json)

# Static asset кеш
curl -I https://senichka-web-<hash>.vercel.app/_next/static/<chunk>.js
# Cache-Control: public, max-age=31536000, immutable

# Open browser, проверь:
# 1. Главная страница загружается (это и есть каталог после #280)
# 2. /shop → 301 → / (старый URL редиректит)
# 3. /products/<slug> — страница товара
# 4. Переключение языка работает (EN/RU/ES)
# 5. Theme toggle (light/dark)
```

### Шаг 5 — Preview deployments

Уже работает по умолчанию после Шага 1.

Тест:
1. Создай test PR (например docs-only change)
2. В PR появится комментарий от Vercel bot с preview URL вида `senichka-web-git-feature-xxx.vercel.app`
3. Открой URL → видишь свою фичу до merge

⚠️ **Все preview URLs наследуют env vars из All Environments / Preview scope.** Если у тебя `NEXT_PUBLIC_API_URL=https://api.senichka.com`, preview будет хитать **prod API** — может быть не нужно. Решения:
- Установить `NEXT_PUBLIC_API_URL` отдельно для Preview scope (на staging)
- Или сейчас оставить prod API, поскольку у нас одно окружение

### Шаг 6 — Сохранить project ID и org ID

Для возможной CI integration в будущем (например, deploy hook'и):

1. Vercel dashboard → твой проект → **Settings** → скопируй **Project ID**
2. **Settings** → **General** → **Team ID** (или Personal Account ID)
3. Сохрани в `.env.prod.local`:
   ```bash
   VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   VERCEL_ORG_ID=team_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   # или для personal: VERCEL_ORG_ID=<your-username>
   ```

---

## Phase 2 — Custom domain `senichka.com`

⚠️ **Делай ТОЛЬКО после того, как domain куплен** — это #43.

### Шаг 1 — Добавить domain в Vercel

1. Project → **Settings** → **Domains** → **Add**
2. Введи `senichka.com` → **Add**
3. Vercel покажет **DNS records** для добавления:
   - `A` record для `senichka.com` → `76.76.21.21` (Vercel IP)
   - `CNAME` record для `www.senichka.com` → `cname.vercel-dns.com`

### Шаг 2 — Добавить records в DNS

В DNS provider (Namecheap / Cloudflare / Route 53) добавь оба record'а из шага 1.

### Шаг 3 — Дождаться SSL provisioning

Vercel автоматически:
- Заверифицирует ownership через DNS records
- Сгенерирует HTTPS cert (Let's Encrypt)
- Renew будет автоматически каждые 60 дней

Обычно занимает 5-30 минут.

### Шаг 4 — Set primary domain

В **Domains** settings:
- Make `senichka.com` **Primary**
- Add redirect `www.senichka.com` → `senichka.com` (или наоборот, твой выбор)

### Шаг 5 — Update env vars

В Vercel dashboard:
```
NEXT_PUBLIC_SITE_URL=https://senichka.com  (был https://senichka-web-xxx.vercel.app)
```

После redeploy — все absolute URL (canonical, OpenGraph, sitemap) будут на `senichka.com`.

---

## Local development через Vercel CLI (опционально)

Vercel CLI позволяет тестировать build локально как Vercel:

```bash
# Установка (one-time)
npm i -g vercel

# Связать local repo с Vercel project (one-time)
cd apps/web
vercel link  # выбери existing project senichka-web

# Pull production env vars в local .env.production.local
vercel env pull .env.production.local --environment=production

# Build так же как Vercel
vercel build

# Run production build локально
vercel dev  # или next start
```

⚠️ Не коммить `.env.production.local` — он в `.gitignore` уже.

---

## Troubleshooting

| Проблема | Причина | Решение |
|---|---|---|
| Build fails: `Cannot find module '@jewelry/shared'` | Vercel install запустился из `apps/web/`, не из root — packages/shared не установился | Проверь `installCommand` в vercel.json — должен быть `cd ../.. && pnpm install` |
| Build fails: `Turbo: command not found` | Vercel не нашёл pnpm/turbo | Vercel должен auto-detect pnpm из `pnpm-lock.yaml`. Если нет — добавь `"corepack": true` в Project Settings |
| Preview URL отвечает 404 / пустой каталог на главной | API недоступен (нет NEXT_PUBLIC_API_URL или невалидный) | В Vercel Settings → Environment Variables → проверь NEXT_PUBLIC_API_URL для Preview scope |
| `Strict-Transport-Security` header не виден | Vercel deployment ещё не пересобрался после vercel.json | Force redeploy: dashboard → Deployments → ⋯ → Redeploy |
| Custom domain в "Pending DNS configuration" >1 час | DNS records не добавлены или неверны | `dig senichka.com A` должен показать `76.76.21.21`. Проверь в DNS provider |
| Build success но "loading..." бесконечно при открытии URL | NEXT_PUBLIC_API_URL смотрит в localhost (build cached с dev value) | Update env var → redeploy |

---

## Cleanup (для отката)

Если решил отказаться от Vercel:

1. **Settings** → **General** → bottom → **Delete Project**
2. Введи имя проекта для подтверждения → **Delete**
3. Удали `apps/web/vercel.json` из репо
4. Если был custom domain — удали DNS records у DNS provider'а

---

## Связанные документы

- [docs/runbooks/aws-networking-setup.md](aws-networking-setup.md) — backend на AWS (#76)
- [docs/runbooks/aws-cloudfront-s3-setup.md](aws-cloudfront-s3-setup.md) — CDN для product images (#77)
- [docs/runbooks/domain-setup.md](domain-setup.md) — покупка домена (#43)
- Issue #82 — ECS Fargate (backend, отдельно от Vercel)
- Issue #119 (post-MVP) — PostHog analytics на Vercel-deployed app
