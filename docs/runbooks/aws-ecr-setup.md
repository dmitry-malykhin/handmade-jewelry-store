# AWS ECR Setup — Container Registry + GitHub Actions IAM

ECR repository для NestJS API Docker image + IAM user для CI auto-push.

**Время настройки:** ~15 минут (Console) или ~1 минута (скрипт)
**Стоимость:** ~$2/mo (storage для последних 30 images)
**Результат:** Private ECR repository, lifecycle policy, IAM user с минимальными правами для GitHub Actions, image-scanning-on-push enabled
**Issue:** #81

---

## Зачем нужно

`.github/workflows/deploy-production.yml` уже умеет push images в ECR при merge в main. Эта задача создаёт **сами AWS-ресурсы**, на которые workflow ссылается:

| Без ECR | С ECR |
|---|---|
| ECS Fargate не может запустить контейнер (нет registry) | ECS pulls fresh image из ECR при каждом deploy |
| Docker Hub free tier — 100 pulls/6h, может block prod | Unlimited pulls в той же AWS region (бесплатно по traffic) |
| Image scanning — отдельная интеграция | ECR auto-scan on push, vulnerabilities в Console |
| Storage cost не контролируется | Lifecycle policy auto-cleanup старых images |

## Что создаётся

| Ресурс | Назначение |
|---|---|
| **ECR repository** `handmade-jewelry-api` | Private, encrypted (AES256), `IMMUTABLE` tags (нельзя overwrite published image) |
| **Image scanning on push** | Auto-scan на CVE при каждом push (free) |
| **Lifecycle policy** | Untagged → expire after 7 days; SHA-tagged → keep last 30 |
| **IAM user** `handmade-jewelry-store-github-actions` | Programmatic-only (no console access) |
| **IAM inline policy** | ECR push + ECS deploy + iam:PassRole для task role/exec role |
| **Access key pair** | Для использования в GitHub Secrets |

**НЕ создаётся в этой задаче:**
- ❌ ECS cluster / service / task definition — это #82
- ❌ ALB — также #82
- ❌ OIDC federation для GitHub Actions (вместо access keys) — post-MVP improvement, см. секцию ниже

---

## До того как начнёшь

- [ ] AWS account готов, region us-east-1 (или твой)
- [ ] AWS CLI v2 + jq установлены
- [ ] IAM user/role с `AdministratorAccess` для bootstrap (после первого запуска можно урезать)
- [ ] У тебя есть admin-доступ к GitHub repo для добавления Secrets

---

## Путь A — Скрипт (1 минута)

```bash
./infra/aws/setup-ecr.sh
```

Скрипт делает 5 шагов и **печатает access keys на выход**. Сразу скопируй и сохрани в GitHub Secrets — `SecretAccessKey` показывается ОДИН РАЗ.

После — переходи к **Шаг 7: Add GitHub Secrets** ниже.

## Путь B — AWS Console (15 минут)

### Шаг 1 — Create ECR repository

1. **Amazon ECR** → **Repositories** → **Create**
2. **Visibility settings:** Private
3. **Repository name:** `handmade-jewelry-api`
4. **Tag immutability:** **Mutable** (Vercel-default)
   ⚠️ Я рекомендую сразу **Immutable** — guarantees что одну и ту же tag никто accidentally overwrite (например `:latest` → race condition при concurrent deploy). Для git SHA tags это безразлично (SHA уникальный), но защищает от ошибок.
5. **Image scan settings:** **Scan on push** — enable (free)
6. **Encryption:** AES-256 (default, free)
7. **Create**
8. Запомни **Repository URI** (типа `123456789.dkr.ecr.us-east-1.amazonaws.com/handmade-jewelry-api`)

### Шаг 2 — Lifecycle policy

1. Открой repository → **Lifecycle policy** tab → **Edit**
2. **JSON view** → paste содержимое [`infra/aws/ecr/lifecycle-policy.json`](../../infra/aws/ecr/lifecycle-policy.json)
3. **Save**

Эффект:
- **Rule 1:** Untagged images expire after 7 days. Защита от build artifacts которые не получили tag (например, build failure после push).
- **Rule 2:** SHA-tagged images keep последние 30. Старые images можно re-build из git если нужно. 30 ≈ один месяц при ~1 deploy/day.

### Шаг 3 — Create IAM user

1. **IAM** → **Users** → **Create user**
2. **User name:** `handmade-jewelry-store-github-actions`
3. **Provide user access to AWS Management Console:** **No** (programmatic-only — security best practice)
4. **Next** → **Permissions options:** **Attach policies directly** → но мы skip управляемые policies, добавим inline на следующем шаге
5. **Create user**

### Шаг 4 — Attach inline policy

1. Открой созданного user → **Permissions** tab → **Add permissions** → **Create inline policy**
2. **JSON view** → paste содержимое [`infra/aws/ecr/github-actions-policy.json`](../../infra/aws/ecr/github-actions-policy.json)
3. **Next** → policy name: `handmade-jewelry-store-github-actions-policy` → **Create policy**

Что эта policy разрешает:
- ECR auth + push (BatchCheckLayer, InitiateLayerUpload, PutImage)
- ECR pull + describe для нашей repository (handmade-jewelry-api)
- ECS describe-task-definition + register-task-definition + update-service (для deploy шага в workflow)
- iam:PassRole для task execution role и task role (требуется ECS чтобы task мог assume роли)

### Шаг 5 — Create access key

1. User → **Security credentials** tab → **Create access key**
2. **Use case:** Application running outside AWS — **Other** (нет idiomatic GitHub Actions option)
3. **Description tag:** `GitHub Actions deploy-production workflow`
4. **Create access key**
5. **⚠️ Save BOTH values:**
   - **Access key ID** (10-20 символов)
   - **Secret access key** (40 символов) — **показывается ОДИН РАЗ**, после закрытия страницы AWS его не покажет
6. **Done**

### Шаг 6 — Verify ECR access

```bash
# Test login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# должен показать "Login Succeeded"

# Test list (с newly-created user creds)
AWS_ACCESS_KEY_ID=<ID> AWS_SECRET_ACCESS_KEY=<SECRET> AWS_REGION=us-east-1 \
  aws ecr describe-repositories --repository-name handmade-jewelry-api
# должен вернуть JSON с repository details
```

### Шаг 7 — Add GitHub Secrets

GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **Repository secrets** → **New repository secret**:

```
AWS_ACCESS_KEY_ID         AKIAXXXX...   (из Шага 5)
AWS_SECRET_ACCESS_KEY     XXXXXXXXX...  (из Шага 5)
AWS_REGION                us-east-1
ECR_REPOSITORY            handmade-jewelry-api
ECS_CLUSTER               handmade-jewelry-store-cluster      (placeholder, обновишь после #82)
ECS_SERVICE               handmade-jewelry-api                (placeholder, после #82)
ECS_TASK_DEFINITION       handmade-jewelry-api                (placeholder, после #82)
```

⚠️ ECS-related Secrets — placeholders для сейчас. `deploy-production.yml` упадёт пока #82 не provisioned. Это OK — workflow триггерится только на push в main, тебе никто не мешает.

После того как #82 готов — обнови ECS_CLUSTER / ECS_SERVICE / ECS_TASK_DEFINITION на real values и workflow начнёт работать end-to-end.

---

## Manual push (для testing локально)

```bash
# 1. Login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# 2. Build (из repo root)
docker build -f apps/api/Dockerfile -t handmade-jewelry-api:test .

# 3. Tag
docker tag handmade-jewelry-api:test \
  <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/handmade-jewelry-api:test

# 4. Push
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/handmade-jewelry-api:test

# 5. Verify
aws ecr describe-images --repository-name handmade-jewelry-api
# должен показать image с tag "test"
```

---

## Access key rotation (рекомендация — каждые 90 дней)

```bash
# 1. Создать новый ключ (без удаления старого)
aws iam create-access-key --user-name handmade-jewelry-store-github-actions
# Копируй новый AccessKeyId + SecretAccessKey

# 2. Обновить GitHub Secrets с новыми values

# 3. Trigger test deploy (например, empty commit) → проверь что прошёл

# 4. Удалить старый ключ
aws iam list-access-keys --user-name handmade-jewelry-store-github-actions
aws iam delete-access-key \
  --user-name handmade-jewelry-store-github-actions \
  --access-key-id <OLD_KEY_ID>
```

---

## Post-MVP: миграция на OIDC federation

Long-lived AWS access keys — **современный антипаттерн**. AWS рекомендует **OIDC federation**:

- GitHub Actions assumes IAM role через short-lived OIDC token
- Нет access keys to leak/rotate
- Setup занимает ~30 минут, требует:
  - GitHub OIDC provider в AWS IAM
  - IAM role с trust policy для GitHub OIDC
  - Update workflow: `aws-actions/configure-aws-credentials@v4` с `role-to-assume` и `audience`

**Когда мигрировать:** при первом security review или когда добавим второго developer'а.

**Issue:** create new ticket "feat: GitHub Actions OIDC federation для AWS deploys" с label `priority: medium, sp:2, post-mvp`.

---

## Troubleshooting

| Проблема | Причина | Решение |
|---|---|---|
| `RepositoryAlreadyExists` при создании | Repo уже создан | `aws ecr describe-repositories --repository-name handmade-jewelry-api` — если есть, skip Шаг 1 |
| `AccessDenied: ecr:PutImage` в CI | IAM policy не applied или wrong user | Re-check inline policy attached, что user который делает push — это `handmade-jewelry-store-github-actions` |
| Lifecycle не удаляет images | Policy не применена | `aws ecr get-lifecycle-policy --repository-name handmade-jewelry-api` |
| `Unable to push to ECR — request signature mismatch` | Clock skew или wrong region | Проверь system time + AWS_REGION в GitHub Secret |
| `iam:PassRole` denied при ECS deploy | task role / execution role не существуют (нет #76) | Run `setup-networking.sh` из #76 сначала |

---

## Cleanup (для откатов)

```bash
# 1. Delete все images в repo
aws ecr batch-delete-image --repository-name handmade-jewelry-api \
  --image-ids "$(aws ecr list-images --repository-name handmade-jewelry-api --query 'imageIds[*]' | jq -c)"

# 2. Delete repository
aws ecr delete-repository --repository-name handmade-jewelry-api --force

# 3. Detach inline policy from user
aws iam delete-user-policy \
  --user-name handmade-jewelry-store-github-actions \
  --policy-name handmade-jewelry-store-github-actions-policy

# 4. Delete access keys (list first → delete each)
aws iam list-access-keys --user-name handmade-jewelry-store-github-actions
aws iam delete-access-key --user-name handmade-jewelry-store-github-actions --access-key-id <KEY_ID>

# 5. Delete IAM user
aws iam delete-user --user-name handmade-jewelry-store-github-actions

# 6. Remove GitHub Secrets (UI only — нет API)
```

---

## Связанные документы

- [docs/runbooks/aws-networking-setup.md](aws-networking-setup.md) — VPC + RDS + IAM roles (#76, нужно ДО #81)
- [docs/runbooks/aws-cloudfront-s3-setup.md](aws-cloudfront-s3-setup.md) — S3 + CDN (#77)
- [`infra/aws/README.md`](../../infra/aws/README.md) — overview всех AWS-related файлов
- [`.github/workflows/deploy-production.yml`](../../.github/workflows/deploy-production.yml) — потребитель этих ECR resources
- Issue #82 — ECS Fargate (зависит от наличия ECR repo + push'нутого image)
