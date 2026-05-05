# AWS Networking Setup — VPC + Subnets + SGs + IAM + RDS + Secrets Manager

Подготовка networking foundation для ECS Fargate (#82), CloudFront/S3 (#77) и production deploy.

**Время настройки:** ~45 минут (Console) или ~5 минут (скрипт)
**Стоимость:** ~$13/mo (RDS db.t3.micro) + ~$0.40 (Secrets Manager)
**Результат:** VPC, public/private subnets, security groups, IAM roles, RDS PostgreSQL, AWS Secrets Manager
**Issue:** #76

---

## Что делается и зачем

| Ресурс | Назначение |
|---|---|
| **VPC `10.0.0.0/16`** | Изолированная сеть — наша песочница в AWS |
| **2 public subnets** (10.0.1.0/24, 10.0.2.0/24) | Здесь живёт ALB — принимает трафик из интернета. Распределены по 2 AZ для отказоустойчивости |
| **2 private subnets** (10.0.11.0/24, 10.0.12.0/24) | Здесь живут ECS tasks (NestJS API) и RDS PostgreSQL. Из интернета напрямую недоступны |
| **Internet Gateway** | Привязан к VPC — даёт публичный интернет для public subnets |
| **3 Security Groups** | ALB SG (443/80 from 0.0.0.0/0) → ECS SG (port 4000 from ALB only) → RDS SG (port 5432 from ECS only). Никто извне не достучится до БД |
| **2 IAM Roles** | Execution role (ECR pull + CloudWatch + Secrets read) и Task role (S3 + Secrets для приложения) |
| **RDS PostgreSQL** db.t3.micro | Боевая БД, в private subnet, со включёнными бэкапами (7 дней) и шифрованием storage |
| **Secrets Manager** | Здесь живут DB-креды и app-секреты — их читает ECS task через Task role |

**НЕ создаётся (намеренно):**
- ❌ NAT Gateway — стоит ~$32/мес. Вместо этого ECS pulls images через VPC endpoint (#82)
- ❌ Multi-AZ для RDS — экономия $13/мес. Single-AZ достаточно для MVP, апгрейд при росте трафика
- ❌ ECR repository (#81)
- ❌ ECS cluster (#82)
- ❌ ALB (#82)

---

## До того как начнёшь

- [ ] AWS account создан, billing настроен
- [ ] IAM user с `AdministratorAccess` для bootstrap (после первого запуска можно урезать до least-privilege)
- [ ] AWS CLI v2 установлен (`aws --version` → 2.x)
- [ ] `aws configure` запущен — введены access key, secret, region (рекомендую `us-east-1` — дешевле и ближе к US-восточному побережью)
- [ ] Cost alerts настроены в AWS Billing на $50/мес — defensive
- [ ] `jq` установлен (`brew install jq`) — нужен для парсинга JSON в скрипте

---

## Путь A — Через скрипт (быстрый, ~5 минут)

```bash
# Из корня репо:
./infra/aws/setup-networking.sh
```

Скрипт идёт по тем же шагам что ниже, но автоматически. Печатает все ID на выходе — сохрани их в `.env.prod.local` или менеджер паролей. Они нужны для #81 (ECR) и #82 (ECS).

После — пропусти к **«Шаг 9 — Проверка»** ниже.

---

## Путь B — Через AWS Console (ручной, ~45 минут)

### Шаг 1 — VPC

1. AWS Console → **VPC** → **Create VPC**
2. Resources to create: **VPC only** (не "VPC and more" — проще понять что создаётся)
3. Name tag: `handmade-jewelry-store-vpc`
4. IPv4 CIDR: `10.0.0.0/16`
5. Tenancy: **Default**
6. **Create VPC**
7. Modify VPC settings → enable: `DNS hostnames`, `DNS resolution`

### Шаг 2 — Internet Gateway

1. **Internet Gateways** → **Create internet gateway**
2. Name: `handmade-jewelry-store-igw`
3. **Create**
4. Actions → **Attach to VPC** → выбери `handmade-jewelry-store-vpc`

### Шаг 3 — Subnets

Создай 4 subnets — 2 public + 2 private, разнесённые по 2 AZ.

| Name | AZ | CIDR | Назначение |
|---|---|---|---|
| `handmade-jewelry-store-public-a` | `us-east-1a` | `10.0.1.0/24` | ALB |
| `handmade-jewelry-store-public-b` | `us-east-1b` | `10.0.2.0/24` | ALB |
| `handmade-jewelry-store-private-a` | `us-east-1a` | `10.0.11.0/24` | ECS + RDS |
| `handmade-jewelry-store-private-b` | `us-east-1b` | `10.0.12.0/24` | ECS + RDS |

Для **public** subnets: после создания → Modify auto-assign IP settings → enable `Auto-assign public IPv4 address`.

### Шаг 4 — Route Tables

1. **Route Tables** → **Create route table**
2. Name: `handmade-jewelry-store-public-rt`, VPC: наш VPC
3. После создания → **Routes** tab → **Edit routes** → **Add route**:
   - Destination: `0.0.0.0/0`
   - Target: **Internet Gateway** → `handmade-jewelry-store-igw`
4. **Subnet associations** tab → **Edit** → выбери оба public subnets

Private subnets оставляем на default route table — без интернета. Это намеренно, см. секцию выше.

### Шаг 5 — Security Groups

Порядок имеет значение — SGs ссылаются друг на друга.

#### 5.1 ALB SG

1. **Security Groups** → **Create**
2. Name: `handmade-jewelry-store-alb-sg`
3. VPC: наш
4. Inbound rules:
   - HTTPS (443) from `0.0.0.0/0`
   - HTTP (80) from `0.0.0.0/0` (для redirect → HTTPS)
5. Outbound: All traffic (default)

#### 5.2 ECS SG

1. Name: `handmade-jewelry-store-ecs-sg`
2. Inbound:
   - Custom TCP, port 4000, source: **ALB SG** (`handmade-jewelry-store-alb-sg`)
3. Outbound: All (default)

#### 5.3 RDS SG

1. Name: `handmade-jewelry-store-rds-sg`
2. Inbound:
   - PostgreSQL (5432), source: **ECS SG**
3. Outbound: All (default)

**Эта цепочка** — security best practice: интернет → ALB → ECS → RDS. Никаких сокращений.

### Шаг 6 — IAM Roles

Используй JSON-политики из репо: [`infra/aws/iam/`](../../infra/aws/iam/).

#### 6.1 ECS Task Execution Role

Эта роль используется самим ECS-агентом — для pull-а Docker image из ECR и записи логов в CloudWatch.

1. IAM → **Roles** → **Create role**
2. Trusted entity: **AWS service** → **Elastic Container Service** → **Elastic Container Service Task**
3. Permissions: skip (добавим inline policy ниже)
4. Name: `handmade-jewelry-store-ecs-task-execution-role`
5. После создания → **Add inline policy** → JSON tab → paste содержимое [`ecs-task-execution-role-policy.json`](../../infra/aws/iam/ecs-task-execution-role-policy.json)
6. Name policy: `handmade-jewelry-store-ecs-task-execution-role-policy`

#### 6.2 ECS Task Role

Эта роль используется самим приложением (NestJS) — для доступа к S3 (загрузка фото товаров) и Secrets Manager (чтение app-секретов в runtime).

1. IAM → **Roles** → **Create role**
2. Trusted entity: **AWS service** → **Elastic Container Service** → **Elastic Container Service Task**
3. Skip permissions
4. Name: `handmade-jewelry-store-ecs-task-role`
5. Add inline policy → paste [`ecs-task-role-policy.json`](../../infra/aws/iam/ecs-task-role-policy.json)
6. Name: `handmade-jewelry-store-ecs-task-role-policy`

⚠️ Имя bucket'а в `ecs-task-role-policy.json` — `handmade-jewelry-store-product-images`. Он создаётся в #77 (CloudFront/S3). Если в #77 имя будет другим — обнови JSON перед apply.

### Шаг 7 — RDS PostgreSQL

1. **RDS** → **Create database**
2. Method: **Standard create**
3. Engine: **PostgreSQL**, version: 16.4 (или последняя 16.x)
4. Templates: **Free tier** (если ещё не использовал) или **Production**
5. Settings:
   - DB instance identifier: `handmade-jewelry-store-db`
   - Master username: `jewelry_app`
   - Master password: сгенерируй strong password (`openssl rand -base64 24` минимум) — он попадёт в Secrets Manager на шаге 8
6. Instance configuration: **db.t3.micro**
7. Storage: 20 GB gp3, **enable storage encryption**
8. Connectivity:
   - VPC: наш
   - DB subnet group: **Create new** — name `handmade-jewelry-store-db-subnet-group`, выбери оба private subnets
   - Public access: **No**
   - VPC security group: **Existing** → `handmade-jewelry-store-rds-sg`
   - AZ: leave default
9. Database authentication: **Password authentication**
10. Additional configuration:
    - Initial database name: `jewelry`
    - **Backup retention period: 7 days**
    - Backup window: выбери ночное окно для US-East (например 06:00–07:00 UTC = 02:00–03:00 EST)
    - **Disable** Auto minor version upgrade на проде — контролируй обновления вручную
    - **Disable** deletion protection пока не уверен в финальном setup; включи позже

11. **Create database** — ждать 5–10 минут

### Шаг 8 — Secrets Manager

1. **Secrets Manager** → **Store a new secret**
2. Type: **Other type of secret** (не "Credentials for RDS database" — нам нужен plain key/value, чтобы приложение читало в одном месте)
3. Key/value pairs:
   - `username`: `jewelry_app`
   - `password`: тот пароль что задал в Шаге 7
   - `host`: endpoint из RDS console (выглядит как `handmade-jewelry-store-db.xxx.us-east-1.rds.amazonaws.com`)
   - `port`: `5432`
   - `db`: `jewelry`
4. Name: `handmade-jewelry-store/db-credentials`
5. **Skip** rotation для MVP (включишь позже когда настроишь rotation Lambda)
6. **Store**

В будущем добавятся секреты:
- `handmade-jewelry-store/jwt-secret`
- `handmade-jewelry-store/stripe-keys`
- `handmade-jewelry-store/sentry-dsn`
- `handmade-jewelry-store/resend-api-key`

(Все в формате `handmade-jewelry-store/*` чтобы Task role policy ловила их одной wildcard).

### Шаг 9 — Проверка

```bash
# 1. VPC видна и DNS включён
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=handmade-jewelry-store-vpc" \
  --query 'Vpcs[0].{VpcId:VpcId, DnsHostnames:EnableDnsHostnames}'

# 2. RDS instance "available"
aws rds describe-db-instances --db-instance-identifier handmade-jewelry-store-db \
  --query 'DBInstances[0].{Status:DBInstanceStatus, Endpoint:Endpoint.Address}'

# 3. Secret читается
aws secretsmanager get-secret-value --secret-id handmade-jewelry-store/db-credentials \
  --query 'SecretString' --output text | jq -r '.host'
# должен вернуть RDS endpoint

# 4. Test connection (после того как RDS перешёл в "available")
# Из private subnet — недоступно с твоего ноутбука. Проверишь через ECS task в #82.
```

---

## Куда сохранить ID-шники

После Path A или Path B — выпиши в `.env.prod.local` (НЕ в `.env.example`!) или менеджер паролей:

```bash
# AWS Networking — issue #76
AWS_VPC_ID=vpc-xxxxxxxxxxxxx
AWS_PUBLIC_SUBNET_A=subnet-xxxxxxxxxxxxx
AWS_PUBLIC_SUBNET_B=subnet-xxxxxxxxxxxxx
AWS_PRIVATE_SUBNET_A=subnet-xxxxxxxxxxxxx
AWS_PRIVATE_SUBNET_B=subnet-xxxxxxxxxxxxx
AWS_ALB_SG=sg-xxxxxxxxxxxxx
AWS_ECS_SG=sg-xxxxxxxxxxxxx
AWS_RDS_SG=sg-xxxxxxxxxxxxx
AWS_ECS_EXEC_ROLE_ARN=arn:aws:iam::ACCOUNT:role/handmade-jewelry-store-ecs-task-execution-role
AWS_ECS_TASK_ROLE_ARN=arn:aws:iam::ACCOUNT:role/handmade-jewelry-store-ecs-task-role
AWS_DB_ENDPOINT=handmade-jewelry-store-db.xxx.us-east-1.rds.amazonaws.com
AWS_DB_SECRET_ARN=arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:handmade-jewelry-store/db-credentials-xxxxxx
```

---

## Что делать если что-то пошло не так

| Проблема | Решение |
|---|---|
| RDS остаётся в `creating` дольше 15 минут | Проверь CloudTrail на ошибки. Чаще всего — subnet group в одной AZ |
| Skript упал на середине | Безопасно — каждый ресурс idempotent через имена. Удали что создалось вручную и запусти снова |
| `aws configure list` показывает no credentials | Запусти `aws configure` ещё раз. Region обязательно `us-east-1` (или твой выбранный) |
| `Permission denied` на VPC create | IAM user должен иметь `AdministratorAccess` или хотя бы `AmazonVPCFullAccess` + `IAMFullAccess` + `AmazonRDSFullAccess` + `SecretsManagerReadWrite` |
| Не помнишь пароль к RDS | `aws secretsmanager get-secret-value --secret-id handmade-jewelry-store/db-credentials` |

---

## Разрушение (cleanup) для откатов

Если нужно начать с нуля (например, в dev-аккаунте):

```bash
# 1. Удалить RDS (с финальным snapshot — на всякий)
aws rds delete-db-instance --db-instance-identifier handmade-jewelry-store-db \
  --final-db-snapshot-identifier handmade-jewelry-store-db-final-$(date +%Y%m%d)

# 2. После того как RDS удалится (5–10 мин), удалить subnet group
aws rds delete-db-subnet-group --db-subnet-group-name handmade-jewelry-store-db-subnet-group

# 3. Удалить Secrets Manager secret (с recovery period 7 дней — defensive)
aws secretsmanager delete-secret --secret-id handmade-jewelry-store/db-credentials

# 4. IAM roles
aws iam delete-role-policy --role-name handmade-jewelry-store-ecs-task-execution-role \
  --policy-name handmade-jewelry-store-ecs-task-execution-role-policy
aws iam delete-role --role-name handmade-jewelry-store-ecs-task-execution-role
# Repeat for task role

# 5. Security Groups (в обратном порядке — RDS SG → ECS SG → ALB SG)
aws ec2 delete-security-group --group-id $RDS_SG
aws ec2 delete-security-group --group-id $ECS_SG
aws ec2 delete-security-group --group-id $ALB_SG

# 6. Subnets, IGW, VPC через console или AWS CLI delete-vpc cascade
```

---

## Связанные документы

- [docs/17_STAGING_ENVIRONMENTS.md](../17_STAGING_ENVIRONMENTS.md) — staging strategy (Fly.io vs AWS)
- [`infra/aws/README.md`](../../infra/aws/README.md) — overview всех AWS-related файлов в репо
- Issue #77 — CloudFront + S3 для static assets и product images (зависит от наличия VPC)
- Issue #81 — ECR repository для Docker images
- Issue #82 — ECS Fargate cluster + ALB (consumer этого setup'а)
