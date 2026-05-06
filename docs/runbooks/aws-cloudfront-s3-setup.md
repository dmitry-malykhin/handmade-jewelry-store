# AWS CloudFront + S3 Setup — Product Images CDN

CDN-инфраструктура для product images: S3 bucket + CloudFront distribution с Origin Access Control (OAC).

**Время настройки:** ~30 минут (Console) или ~3 минуты (скрипт) для Phase 1
**Стоимость:** ~$1–6/mo (S3 storage + CloudFront egress + requests)
**Результат:** Private S3 bucket, CloudFront distribution с HTTPS, кеширование на edge'ах
**Issue:** #77

---

## Зачем нужно

| Без CloudFront | С CloudFront |
|---|---|
| Product images отдаются прямо из S3 us-east-1 | Кешируются на edge-серверах AWS по всей Северной Америке + Европе |
| TTFB ~600–1000ms для пользователя в California | TTFB ~50–200ms (ближайший edge) |
| Каждый запрос = S3 charge ($0.09/GB) | 95%+ запросов из кеша (~$0.01/GB) |
| HTTP только (если bucket public) или подписанные URL | HTTPS by default, бесплатный certificate |
| SEO penalty от медленной загрузки | Better Core Web Vitals → ranking signal |

## Что создаётся

| Ресурс | Назначение |
|---|---|
| **S3 bucket** `handmade-jewelry-store-product-images` | Storage для всех product images. Private (no public access) |
| **Bucket policy** | Разрешает только CloudFront OAC читать объекты |
| **CORS config** | Браузер может сделать `PUT` к presigned URL (admin загружает фото) |
| **Lifecycle config** | `uploads/*` (temp файлы) удаляются через 24 часа автоматически |
| **CloudFront Origin Access Control (OAC)** | Modern замена OAI — CloudFront подписывает запросы к S3 SigV4 |
| **CloudFront distribution** | Edge cache, HTTPS, redirect HTTP → HTTPS, gzip/brotli compression |
| **AWS managed cache policy** "CachingOptimized" | 1 year max TTL, оптимально для immutable assets с UUID-filenames |
| **AWS managed response headers policy** "SecurityHeadersPolicy" | HSTS, X-Content-Type-Options, etc. |

**НЕ создаётся в Phase 1 (намеренно):**
- ❌ Custom domain `cdn.senichka.com` — требует Route 53 / DNS, который ещё не настроен (#43)
- ❌ ACM сертификат — нужен только для custom domain
- ❌ CloudFront Functions / Lambda@Edge — premature optimization
- ❌ AWS WAF — добавим post-launch при росте трафика
- ❌ CloudWatch alarms на distribution — `#89` отдельная задача

Custom domain добавляется в **Phase 2** (см. ниже).

---

## До того как начнёшь

- [ ] AWS account создан, billing настроен
- [ ] AWS CLI v2 + jq установлены
- [ ] `aws configure` запущен (region `us-east-1` рекомендуется — у нас здесь VPC из #76)
- [ ] IAM user / role с правами:
  - `s3:CreateBucket`, `s3:PutBucketPolicy`, `s3:PutBucketCors`, `s3:PutLifecycleConfiguration`
  - `cloudfront:CreateDistribution`, `cloudfront:CreateOriginAccessControl`
  - Для bootstrap проще всего `AdministratorAccess`, потом урезать

---

## Phase 1 — S3 + CloudFront (без custom domain)

### Путь A — Скрипт (3 минуты)

```bash
./infra/aws/setup-cloudfront-s3.sh
```

Скрипт делает 8 шагов из секции "Что создаётся" и печатает на выходе:
- S3 bucket name
- CloudFront distribution ID
- CloudFront default domain (типа `d3a9b7xyz.cloudfront.net`)

**Save в `.env.prod.local`:**
```bash
AWS_S3_BUCKET=handmade-jewelry-store-product-images
AWS_S3_PUBLIC_URL_PREFIX=https://d3a9b7xyz.cloudfront.net
AWS_CLOUDFRONT_DISTRIBUTION_ID=E1ABCXYZ
```

После — переходи к "Шаг 9: Verify" ниже.

### Путь B — Через AWS Console (30 минут)

#### Шаг 1 — S3 bucket

1. **S3** → **Create bucket**
2. Name: `handmade-jewelry-store-product-images`
3. Region: **us-east-1** (или твой)
4. **Block all public access** — оставить enabled (CloudFront accesses через OAC, не direct)
5. Bucket Versioning: **Enable** (защита от случайного delete)
6. Default encryption: **SSE-S3** (`AES-256`), Bucket Key — Enable (free, оптимизирует encryption performance)
7. **Create bucket**

#### Шаг 2 — CORS

1. Bucket → **Permissions** tab → **CORS** → **Edit** → paste содержимое [`infra/aws/s3/cors-config.json`](../../infra/aws/s3/cors-config.json)
2. **Save**

⚠️ Origins в этом файле — это места откуда браузер будет делать `PUT` (presigned upload). На текущий момент: localhost:3000/3100 (dev), senichka.com (prod), senichka.vercel.app (preview). Если Vercel preview URL имеет другой формат — добавь в JSON и обнови.

#### Шаг 3 — Lifecycle

1. **Management** tab → **Lifecycle rules** → **Create rule** для каждого rule из [`infra/aws/s3/lifecycle-config.json`](../../infra/aws/s3/lifecycle-config.json):
   - **ExpireAdminUploadsAfter1Day**: prefix `uploads/`, expiration 1 day, abort multipart 1 day
   - **AbortStaleMultipartUploads**: no prefix, abort multipart 7 days
2. **Create**

#### Шаг 4 — CloudFront Origin Access Control (OAC)

1. **CloudFront** → **Security** → **Origin access** → **Create control setting**
2. Name: `handmade-jewelry-store-oac`
3. Description: `OAC for handmade-jewelry-store-product-images`
4. Signing behavior: **Sign requests (recommended)**
5. Origin type: **S3**
6. **Create**
7. Запомни **OAC ID** (типа `E1ABCDEFG`)

#### Шаг 5 — CloudFront distribution

1. **CloudFront** → **Distributions** → **Create distribution**
2. **Origin**:
   - Origin domain: `handmade-jewelry-store-product-images.s3.us-east-1.amazonaws.com` (выбери из dropdown — НЕ `*.s3-website*`)
   - Origin access: **Origin access control settings (recommended)**
   - Origin access control: выбери созданный OAC из шага 4
3. **Default cache behavior**:
   - Viewer protocol policy: **Redirect HTTP to HTTPS**
   - Allowed HTTP methods: **GET, HEAD**
   - Restrict viewer access: **No**
   - Compress objects automatically: **Yes**
   - Cache key and origin requests: **Cache policy and origin request policy**
   - Cache policy: **CachingOptimized** (managed)
   - Origin request policy: **CORS-S3Origin** (managed)
   - Response headers policy: **SecurityHeadersPolicy** (managed)
4. **Settings**:
   - Price class: **Use only North America and Europe** (PriceClass_100 — cheapest)
   - Alternate domain name (CNAME): leave empty (Phase 1, custom domain — Phase 2)
   - Custom SSL certificate: leave (default `*.cloudfront.net` cert)
   - Default root object: leave empty
   - Logging: **Off** for MVP (можно включить позже когда нужны access logs)
5. **Create distribution**
6. Дождись status `Deployed` (10–20 минут)
7. Запомни **Distribution ID** (типа `E1ABCXYZ`) и **Domain name** (типа `d3a9b7xyz.cloudfront.net`)

#### Шаг 6 — Bucket policy

После создания distribution, нужно дать ему доступ к bucket'у через bucket policy.

1. Открой [`infra/aws/s3/bucket-policy.json`](../../infra/aws/s3/bucket-policy.json) и замени:
   - `__ACCOUNT_ID__` → твой AWS account ID (`aws sts get-caller-identity --query Account --output text`)
   - `__DISTRIBUTION_ID__` → ID из шага 5
2. **S3** → bucket → **Permissions** → **Bucket policy** → **Edit** → paste отредактированный JSON → **Save**

⚠️ Этот шаг **обязателен после** создания distribution — без него CloudFront получает 403 при попытке прочитать объект.

### Шаг 9 — Verify (после Path A или B)

```bash
# 1. Бакет создан и приватный
aws s3api get-public-access-block --bucket handmade-jewelry-store-product-images
# должен вернуть все 4 settings = true

# 2. CORS применён
aws s3api get-bucket-cors --bucket handmade-jewelry-store-product-images
# должен показать allowed origins

# 3. Distribution в "Deployed" (через 10–20 мин)
aws cloudfront get-distribution --id <DIST_ID> --query 'Distribution.Status'

# 4. Тест: положить тестовый файл и прочитать через CloudFront
echo "Hello from S3" > /tmp/test.txt
aws s3 cp /tmp/test.txt s3://handmade-jewelry-store-product-images/test.txt
curl https://<DIST_DOMAIN>/test.txt
# должен вернуть "Hello from S3" (при первом запросе кеш miss → ~500ms; повторный → <50ms)

# 5. Cleanup тестового файла
aws s3 rm s3://handmade-jewelry-store-product-images/test.txt
```

---

## Phase 2 — Custom Domain (`cdn.senichka.com`)

⚠️ **Делай ТОЛЬКО после того, как `senichka.com` куплен и DNS настроен** — это требует issue `#43` (domain setup) merged + applied.

### Шаг 1 — Запросить ACM certificate

Важно: для CloudFront cert ДОЛЖЕН быть в **`us-east-1`** независимо от того где живёт остальная инфраструктура. Это AWS quirk.

```bash
aws acm request-certificate \
  --domain-name cdn.senichka.com \
  --validation-method DNS \
  --region us-east-1 \
  --query 'CertificateArn' --output text
```

Печатает ARN. Сохрани.

### Шаг 2 — Добавить DNS validation CNAME

```bash
aws acm describe-certificate \
  --certificate-arn <CERT_ARN> \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

Печатает CNAME с `Name` и `Value`. Добавь его в DNS:
- Если используешь Route 53 — automated через `aws route53 change-resource-record-sets`
- Если Namecheap/Cloudflare DNS — добавь CNAME через их UI

Дождись пока certificate станет `ISSUED`:
```bash
aws acm describe-certificate --certificate-arn <CERT_ARN> --region us-east-1 \
  --query 'Certificate.Status'
```

### Шаг 3 — Обновить CloudFront distribution

Через AWS Console:
1. **CloudFront** → твой distribution → **Edit**
2. **Alternate domain name (CNAME)**: `cdn.senichka.com`
3. **Custom SSL certificate**: выбери только что валидированный cert
4. **Save**
5. Дождись `Deployed` (10–15 мин)

### Шаг 4 — DNS CNAME для `cdn`

В DNS своего домена добавь:
```
cdn.senichka.com    CNAME    d3a9b7xyz.cloudfront.net
```

После пропагации (5 мин — 1 час):
```bash
curl https://cdn.senichka.com/test.txt
```

### Шаг 5 — Обновить env

```bash
# .env.prod.local
AWS_S3_PUBLIC_URL_PREFIX=https://cdn.senichka.com
```

После redeploy — все новые URL сгенерированные приложением будут на `cdn.senichka.com` вместо `*.cloudfront.net`. Старые URL продолжат работать (CloudFront отвечает на оба).

---

## Cache invalidation

### Когда нужна

**Почти никогда** — мы используем UUID-filenames для product images (`/products/<slug>/<uuid>.jpg`). Когда фото меняется — это **новый UUID**, новый URL, кеш не релевантен.

Invalidation нужна для **constant-path** ассетов:
- `/logo.svg`, `/favicon.ico`, `/branding/og-image.png`

### Как использовать

```bash
AWS_CLOUDFRONT_DISTRIBUTION_ID=E1ABCXYZ \
  ./infra/aws/invalidate-cache.sh "/logo.svg" "/favicon.ico"

# Или wildcard
AWS_CLOUDFRONT_DISTRIBUTION_ID=E1ABCXYZ \
  ./infra/aws/invalidate-cache.sh "/branding/*"
```

**Стоимость:** первые 1000 paths/мес — бесплатно, далее $0.005 за path. Не спам — invalidation глобальная и занимает 5–15 минут.

### CI integration (post-MVP)

Если решим добавить invalidation в production deploy workflow:

```yaml
# .github/workflows/deploy-production.yml
- name: Invalidate brand assets cache
  if: contains(github.event.head_commit.modified, 'apps/web/public/')
  env:
    AWS_CLOUDFRONT_DISTRIBUTION_ID: ${{ secrets.AWS_CLOUDFRONT_DISTRIBUTION_ID }}
  run: ./infra/aws/invalidate-cache.sh "/logo.svg" "/favicon.ico" "/og-image.png"
```

Не добавляю в текущий `#79` workflow — это отдельный issue если/когда понадобится.

---

## Troubleshooting

| Проблема | Причина | Решение |
|---|---|---|
| `403 Forbidden` при curl на CloudFront URL | Bucket policy не применена или OAC ID неправильный | Перепроверь шаг 6 — placeholders заменены на реальные ID |
| `AccessDenied` от S3 | Bucket policy ссылается на `__DISTRIBUTION_ID__` | Sed-replace placeholders в bucket-policy.json не сработал |
| CORS ошибка в браузере при upload | Origin не в CORS allowed list | Добавь свой preview URL в `infra/aws/s3/cors-config.json` и `aws s3api put-bucket-cors` снова |
| Distribution застряла в `InProgress` >30 мин | AWS issue or invalid config | Проверь CloudFront events tab; в крайнем случае удали distribution и создай заново |
| Custom domain (Phase 2) ругается `CNAMEAlreadyExists` | Кто-то уже взял этот CNAME (или старый distribution) | Найди конфликтующее distribution, удали или перенаправь |
| Высокая стоимость CloudFront ($50+/mo) | Cache hit ratio низкий, или DDoS | Включи logs, проверь `cf:hit-ratio`. Возможно нужен AWS WAF |

---

## Cleanup (для откатов)

```bash
DIST_ID=E1ABCXYZ  # твой
BUCKET=handmade-jewelry-store-product-images

# 1. Disable distribution (нельзя удалить enabled)
aws cloudfront get-distribution-config --id $DIST_ID > /tmp/dist.json
ETAG=$(jq -r '.ETag' /tmp/dist.json)
jq '.DistributionConfig.Enabled = false | .DistributionConfig' /tmp/dist.json > /tmp/dist-disabled.json
aws cloudfront update-distribution --id $DIST_ID --if-match $ETAG --distribution-config "file:///tmp/dist-disabled.json"

# Дождись Deployed после disable (10–20 мин)
aws cloudfront wait distribution-deployed --id $DIST_ID

# 2. Удалить distribution
ETAG=$(aws cloudfront get-distribution --id $DIST_ID --query 'ETag' --output text)
aws cloudfront delete-distribution --id $DIST_ID --if-match $ETAG

# 3. Удалить OAC
aws cloudfront delete-origin-access-control --id <OAC_ID> --if-match <OAC_ETAG>

# 4. Очистить bucket (включая versioned objects)
aws s3 rm s3://$BUCKET --recursive
aws s3api delete-objects --bucket $BUCKET \
  --delete "$(aws s3api list-object-versions --bucket $BUCKET \
  --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}')"

# 5. Удалить bucket
aws s3api delete-bucket --bucket $BUCKET
```

---

## Связанные документы

- [docs/runbooks/aws-networking-setup.md](aws-networking-setup.md) — VPC, RDS, IAM, Secrets Manager (#76)
- [`infra/aws/README.md`](../../infra/aws/README.md) — overview всех AWS-related файлов
- Issue #43 — domain setup (нужен для Phase 2)
- Issue #82 — ECS Fargate (использует тот же VPC + IAM из #76)
- Issue `#89` (post-MVP) — CloudWatch alarms для CloudFront (5xx rate, hit ratio)
- Issue `#102` (post-MVP) — миграция в Terraform
