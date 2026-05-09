# Cloudflare R2 — Product Images Storage

S3-compatible object storage от Cloudflare для product images. **10 GB storage + free egress** на free plan — покрывает MVP traffic при $0/mo.

**Время настройки:** ~25 минут (one-time)
**Стоимость:** $0/mo для launch traffic (free plan)
**Результат:** R2 bucket + API token + публично доступные URL'ы для product images, без code changes (env-only swap)
**Issue:** #243

---

## Зачем R2 vs AWS S3

| Параметр | AWS S3 + CloudFront | Cloudflare R2 |
|---|---|---|
| Storage | $0.023/GB/mo | **$0 до 10 GB**, $0.015/GB после |
| **Egress (download)** | **$0.09/GB** (или $0.085/GB через CloudFront) | **$0 — всегда** |
| Class A operations (PUT) | $0.005 / 1K | $0 до 1M/mo |
| Class B operations (GET) | $0.0004 / 1K | $0 до 10M/mo |
| API | S3 (proprietary) | **S3-compatible** (`@aws-sdk/client-s3` works) |
| CDN | требуется отдельно (CloudFront) | **встроен** в Cloudflare network |
| HTTPS | через CloudFront (после ACM cert) | автоматически на public URLs |

**При трафике 10 GB egress/month:**
- AWS S3 = $0.90 + $0.10 storage = **$1.00/mo**
- AWS S3 + CloudFront = $0.85 + $0.10 = **$0.95/mo**
- **R2 = $0.00/mo** (egress free)

При scale (100 GB egress) разница ещё значительнее: AWS $9 vs R2 $0.

⚠️ **R2 не volk-replacement S3 во всех use case'ах.** Для нас — perfect, потому что use case = "store images, serve via public URL". Для analytics workloads, large file transfers between AWS services, или специфичных AWS integrations — S3 прямо лучше.

---

## Architecture decision: AWS_S3_ENDPOINT-based switching

`apps/api/src/upload/upload.service.ts` поддерживает оба провайдера через one optional env var (#243):

```
AWS_S3_ENDPOINT=  (empty)   →  default AWS S3
AWS_S3_ENDPOINT=https://...r2.cloudflarestorage.com  →  Cloudflare R2
```

Код одинаковый — меняется только конфиг. Migration to AWS S3 = env swap (см. секцию ниже).

---

## До того как начнёшь

- [ ] Cloudflare account (free) — https://dash.cloudflare.com/sign-up
- [ ] Активация R2 (требует card на file для overage protection, но free tier не charging) — https://dash.cloudflare.com/?to=/:account/r2
- [ ] Доступ к Fly.io app secrets (для production, #242) — `flyctl auth login`

---

## Phase 1 — Setup R2 (no domain dependency)

### Шаг 1 — Создать R2 bucket

1. https://dash.cloudflare.com → **R2 Object Storage** → **Create bucket**
2. **Bucket name:** `handmade-jewelry-store-product-images`
   - ⚠️ Имя должно быть unique в твоём account, но не globally
3. **Location:** `Eastern North America (ENAM)` — closest к Fly.io `iad` region
4. **Default storage class:** `Standard` (free; Infrequent Access only при scale)
5. **Create bucket**

### Шаг 2 — Включить public access

R2 buckets по умолчанию приватные. Для product images нужен public read.

**Вариант A — `r2.dev` subdomain (быстро, для launch):**
1. Bucket → **Settings** → **Public access** → **R2.dev subdomain** → **Allow access**
2. Сохрани URL вида `https://pub-abcdef123456.r2.dev` — это будет `AWS_S3_PUBLIC_URL_PREFIX`

⚠️ **Rate limit:** r2.dev subdomain имеет 10K requests/sec rate limit на bucket. Для MVP traffic OK, но для production launch с paid ads — лучше Phase 2 (custom domain через Cloudflare).

**Вариант B — Custom domain (Phase 2 ниже)** — после #43.

### Шаг 3 — Применить CORS

CORS нужен чтобы admin UI мог делать PUT через presigned URL.

1. Bucket → **Settings** → **CORS Policy** → **Add CORS Policy**
2. Paste:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3100",
      "http://localhost:3000",
      "https://senichka.com",
      "https://www.senichka.com",
      "https://senichka.vercel.app"
    ],
    "AllowedMethods": ["PUT", "POST", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

⚠️ **Vercel preview URLs** (типа `senichka-git-feature-xxx.vercel.app`) — НЕ matched. Если нужен upload с preview deployments, добавь wildcard subdomain через regex (R2 supports limited regex). Для MVP — skip.

3. **Save**

### Шаг 4 — Создать R2 API token

1. R2 dashboard → **Manage R2 API Tokens** → **Create API token**
2. **Token name:** `handmade-jewelry-store-api-prod`
3. **Permissions:** **Object Read & Write**
4. **Specify bucket(s):** только `handmade-jewelry-store-product-images` (не `Apply to all buckets` — least privilege)
5. **TTL:** **Forever** (или 1 year — нужно ротейтить)
6. **Create API Token**

⚠️ **Token shows ONCE** — скопируй сразу:
- **Access Key ID** (typical pattern `<random-32-char>`)
- **Secret Access Key** (typical pattern `<random-64-char>`)
- **Endpoint** — обычно `https://<account-id>.r2.cloudflarestorage.com`

Сохрани в менеджер паролей. Для лоss — нужно создавать новый token.

### Шаг 5 — Set Fly.io secrets (production)

```bash
flyctl secrets set \
  --app handmade-jewelry-api \
  AWS_REGION="auto" \
  AWS_ACCESS_KEY_ID="<R2 access key id>" \
  AWS_SECRET_ACCESS_KEY="<R2 secret access key>" \
  AWS_S3_BUCKET="handmade-jewelry-store-product-images" \
  AWS_S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com" \
  AWS_S3_PUBLIC_URL_PREFIX="https://pub-<bucket-id>.r2.dev"
```

Тонкости:
- `AWS_REGION="auto"` — R2 не использует AWS regions; "auto" — Cloudflare convention
- `AWS_ACCESS_KEY_ID` — R2 token Access Key, не AWS IAM user (хотя env var name тот же — для compatibility)
- `AWS_S3_ENDPOINT` — обязательно, без него код пойдёт в default AWS endpoint и провалится auth
- `AWS_S3_PUBLIC_URL_PREFIX` — публичный URL bucket (из Шаг 2)

Verify:
```bash
flyctl secrets list --app handmade-jewelry-api | grep AWS
# должен показать 6 vars (значения скрыты)
```

### Шаг 6 — Deploy + smoke test

```bash
# Trigger redeploy чтобы подхватились новые secrets
flyctl deploy --config apps/api/fly.production.toml --app handmade-jewelry-api --remote-only
```

После deploy — test admin upload flow:
1. Login as admin → https://senichka.vercel.app/admin/products/new (или твой URL)
2. Загрузи product image
3. Save product
4. Открой product detail page → image должна loadиться

**Verify в Cloudflare R2 dashboard:**
- Bucket → **Objects** — увидишь файл `products/<uuid>.jpg`
- Прямой URL `https://pub-...r2.dev/products/<uuid>.jpg` отдаёт image

### Шаг 7 — Local dev (опционально)

Для local dev есть два варианта:

**A. Skip image uploads локально** — `AWS_S3_ENDPOINT=` empty в `apps/api/.env`. Admin form save без image работает; upload provider_url returns 500 — это OK для feature dev что не касается uploads.

**B. Использовать R2 prod bucket** — same secrets из Шаг 5 в local `.env`. Не рекомендую (можно случайно загрязнить prod), но работает.

**C. Создать отдельный R2 dev bucket** — повторить Шаг 1 + 4 для bucket `handmade-jewelry-store-product-images-dev`. Изолировано, но overhead.

Для MVP solo dev — **(A) skip uploads локально** достаточно.

---

## Phase 2 — Custom domain `cdn.senichka.com`

⚠️ Делай только после #43 (domain куплен и добавлен в Cloudflare DNS).

### Шаг 1 — Connect bucket to custom domain

1. R2 bucket → **Settings** → **Public access** → **Custom Domains** → **Connect Domain**
2. **Domain:** `cdn.senichka.com`
3. **Connect Domain**

Cloudflare automatically:
- Создаст DNS record (если домен в твоём Cloudflare account)
- Сгенерирует SSL cert
- Настроит routing

Если домен НЕ в Cloudflare — Cloudflare покажет CNAME для добавления в твой DNS provider.

### Шаг 2 — Дождаться SSL provisioning

Status в bucket settings перейдёт `Pending` → `Issued` за 5-30 минут.

### Шаг 3 — Update env

```bash
flyctl secrets set \
  --app handmade-jewelry-api \
  AWS_S3_PUBLIC_URL_PREFIX="https://cdn.senichka.com"
```

После redeploy — все новые presigned URLs возвращают URL на `cdn.senichka.com` вместо `pub-...r2.dev`. Старые URLs (для уже загруженных images) продолжают работать на r2.dev.

⚠️ **Старые URLs в БД** не обновляются автоматически. Если хочешь чтобы все existing images показывались с custom domain — нужен migration script (out of scope для #243).

### Шаг 4 — Disable r2.dev (опционально)

После того как всё работает на cdn.senichka.com — можно отключить r2.dev в Public access settings. Безопасность чуть лучше (один canonical URL).

---

## Migration path к AWS S3 (post-revenue)

Когда триггеры:
- **>10 GB images** — близко к R2 free tier limit
- **Compliance** — нужен AWS-only stack для PCI-DSS Level 1 или corporate ToS
- **AWS-specific integrations** — Lambda на S3 events, AWS Glue, и т.п.

Procedure (artifacts уже в репо #77):
1. Run `infra/aws/setup-cloudfront-s3.sh` (#77)
2. Sync R2 → S3:
   ```bash
   # rclone configures обоих как S3-compatible
   rclone sync r2:handmade-jewelry-store-product-images s3:handmade-jewelry-store-product-images \
     --transfers 10 --checksum
   ```
3. Update Fly.io secrets:
   ```bash
   flyctl secrets set \
     AWS_REGION="us-east-1" \
     AWS_ACCESS_KEY_ID="<AWS IAM key>" \
     AWS_SECRET_ACCESS_KEY="<AWS IAM secret>" \
     AWS_S3_ENDPOINT="" \
     AWS_S3_PUBLIC_URL_PREFIX="https://<dist>.cloudfront.net"
   ```
4. Verify production traffic
5. Cleanup R2 bucket (24-hour grace в Cloudflare после delete)

**Нулевой code change** — env swap полностью покрывает миграцию.

---

## Cost monitoring

R2 dashboard → **Reports** показывает:
- Storage used (limit 10 GB)
- Class A ops (limit 1M/mo) — это PUTs (uploads)
- Class B ops (limit 10M/mo) — это GETs (downloads)

**Когда стрелка на 80%+ allowance:**
- Storage 80% = >8 GB → migration к AWS post-revenue имеет смысл OR upgrade R2 paid ($0.015/GB после 10 GB)
- Class A 80% = >800K uploads/mo → необычно для MVP, может быть DDoS upload
- Class B 80% = >8M downloads/mo → success! Trafiicc показывает что ты pre-revenue → post-revenue transition

---

## Troubleshooting

| Проблема | Причина | Решение |
|---|---|---|
| `AccessDenied` при PUT через presigned URL | CORS не настроен или origin не в allowlist | Шаг 3 — добавь твой origin |
| `403 Forbidden` при GET по public URL | Public access не включён или wrong path | Шаг 2 — verify r2.dev subdomain enabled |
| `InvalidArgument: forcePathStyle required` | `AWS_S3_ENDPOINT` set но в коде не активирован forcePathStyle | Verify upload.service.ts:39 — должно автоматически set'иться при наличии endpoint |
| Cloudflare Cache не выкидывает старый image после delete | R2 + Cloudflare cache на edge | Purge cache: dashboard → Caching → Configuration → Purge Everything |
| Upload работает но GET на same URL = 404 | Bucket name mismatch между PUT и public URL | Verify `AWS_S3_BUCKET` matches то что в `AWS_S3_PUBLIC_URL_PREFIX` |
| `SignatureDoesNotMatch` | `AWS_REGION` не "auto" для R2 (или wrong для AWS) | R2 → "auto"; AWS → real region |

---

## Cleanup (для отката)

```bash
# 1. Delete все objects в bucket
# Cloudflare R2 dashboard → bucket → Objects → Select all → Delete
# Или через AWS CLI:
aws s3 rm s3://handmade-jewelry-store-product-images --recursive \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com

# 2. Delete bucket
# Dashboard → bucket → Settings → Delete bucket → Confirm

# 3. Revoke API token
# Dashboard → R2 → Manage R2 API Tokens → твой token → Revoke

# 4. Remove Fly.io secrets
flyctl secrets unset \
  --app handmade-jewelry-api \
  AWS_S3_ENDPOINT
# (другие AWS_* secrets оставь — они нужны для миграции к AWS)
```

---

## Связанные документы

- [docs/runbooks/aws-cloudfront-s3-setup.md](aws-cloudfront-s3-setup.md) — AWS S3 + CloudFront (#77, post-revenue migration target)
- [docs/runbooks/flyio-production-setup.md](flyio-production-setup.md) — где живут secrets (#242)
- Issue **#43** — domain purchase (Phase 2 prereq)
- Issue **#77** — AWS S3 alternative (artifacts ready, deferred)
- [`apps/api/src/upload/upload.service.ts`](../../apps/api/src/upload/upload.service.ts) — конкретный код использующий AWS_S3_ENDPOINT
