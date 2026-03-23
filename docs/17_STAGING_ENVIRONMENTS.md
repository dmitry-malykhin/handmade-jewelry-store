# Staging Environments — Handmade Jewelry Store

> Глубокий архитектурный анализ: нужен ли staging до MVP, варианты решений, стоимость.
> Последнее обновление: 2026-03-23

---

## Содержание

1. [Что такое staging и зачем он нужен](#1-что-такое-staging-и-зачем-он-нужен)
2. [Нужен ли staging ДО MVP — честный ответ](#2-нужен-ли-staging-до-мвп--честный-ответ)
3. [Что реально нужно до запуска](#3-что-реально-нужно-до-запуска)
4. [Варианты staging — сравнительный анализ](#4-варианты-staging--сравнительный-анализ)
5. [Детальный разбор AWS-подхода](#5-детальный-разбор-aws-подхода)
6. [Рекомендация по фазам](#6-рекомендация-по-фазам)
7. [Таблица финального выбора](#7-таблица-финального-выбора)
8. [План внедрения](#8-план-внедрения)

---

## 1. Что такое staging и зачем он нужен

**Staging** — это окружение, максимально похожее на production, где проверяют изменения
до выкатки к живым пользователям.

### Классическая пирамида окружений в US-компаниях

```
                    ┌─────────────────┐
                    │   PRODUCTION    │  ← живые пользователи, реальные деньги
                    └────────┬────────┘
                             │ deploy after staging approval
                    ┌────────▼────────┐
                    │    STAGING      │  ← production-like, финальная проверка
                    └────────┬────────┘
                             │ auto-deploy on merge to main
                    ┌────────▼────────┐
                    │   DEVELOPMENT   │  ← локально или shared dev server
                    └─────────────────┘
```

### Что даёт staging

| Риск без staging | Как staging защищает |
|---|---|
| Миграция сломала prod БД | Сначала прогоняешь миграцию на staging — видишь проблему до прода |
| Stripe webhook не работает с новым кодом | Тестируешь с реальным Stripe test-mode endpoint |
| Email шаблон сломался | Видишь до того как клиент получил кривое письмо |
| Новый checkout flow ломает оплату | QA-тест перед деньгами реальных покупателей |
| ENV переменные не те в prod | Находишь несоответствие заранее |

---

## 2. Нужен ли staging ДО MVP — честный ответ

### Короткий ответ: **НЕТ — до MVP staging не нужен**

### Почему не нужен до MVP

**Ситуация:** Ты единственный разработчик. В production нет ни одного реального пользователя.
В базе нет чужих данных. Никто не теряет деньги если что-то сломается.

До MVP launch ты НЕ имеешь:
- Реальных покупателей которых можно потерять
- Реальных данных заказов которые можно уничтожить
- Репутации которую можно испортить инцидентом
- Revenue потери от downtime

До MVP у тебя есть:
- Локальная среда (Docker Compose + PostgreSQL)
- Stripe test mode (полноценный sandbox, бесплатно)
- Возможность дропнуть и пересоздать базу в любой момент

**Вывод:** Staging до MVP — это платить за страховку которая тебе не нужна,
пока у тебя нет того что нужно страховать.

### Когда staging становится необходим

| Триггер | Почему это меняет ситуацию |
|---|---|
| **Первый реальный пользователь** | Есть что терять — его данные, его доверие |
| **Первый оплаченный заказ** | Финансовые данные требуют осторожности |
| **CI/CD автодеплой настроен** | Без staging любой merge в main идёт сразу в прод |
| **>1 человека в команде** | Нужно изолировать изменения друг от друга |
| **Миграции трогают существующие данные** | Удаление колонки, rename, cascade delete |

**Для твоего проекта:** Staging нужен **СРАЗУ ПОСЛЕ ПЕРВОГО ДЕПЛОЯ В ПРОД** — то есть
при запуске MVP, не до него.

---

## 3. Что реально нужно до запуска

Вместо staging до MVP нужен правильно настроенный **локальный development workflow**:

### Local dev → production deployment checklist

```
┌─────────────────────────────────────────────────────────────────┐
│  LOCAL DEVELOPMENT (уже есть или почти)                         │
│                                                                 │
│  ✅ Docker Compose — PostgreSQL + NestJS + Next.js             │
│  ✅ .env.local — изолированные переменные для dev               │
│  ✅ Stripe test mode — полный sandbox без реальных денег        │
│  ✅ Prisma migrations — история изменений схемы                 │
│  ✅ Seed script — восстановить тестовые данные за 30 секунд    │
│  ⬜ Stripe CLI — локальные webhook events (stripe listen)       │
│  ⬜ Resend test mode — email в dev не уходят реальным людям     │
└─────────────────────────────────────────────────────────────────┘
```

### Stripe CLI для локальных webhooks (до staging)

```bash
# Вместо staging для тестирования Stripe webhooks:
stripe listen --forward-to localhost:3001/webhooks/stripe
# Реальные webhook events приходят на localhost — бесплатно, мгновенно
```

Это заменяет staging для 80% тест-кейсов связанных с оплатой.

---

## 4. Варианты staging — сравнительный анализ

### Таблица сравнения всех опций

| Вариант | Стоимость/мес | Время настройки | Похож на prod | AWS-совместим | Для чего подходит |
|---|---|---|---|---|---|
| **[A] Fly.io Free** | **$0** | 2-3 часа | ⭐⭐⭐ | Нет (разная инфра) | Pre-MVP → Post-MVP start |
| **[B] Railway** | **$5** | 1-2 часа | ⭐⭐⭐ | Нет | Самый быстрый старт |
| **[C] Render Free** | **$0** (с задержкой) | 1 час | ⭐⭐ | Нет | Только если терпишь cold start |
| **[D] AWS минимал** | **$25-35** | 4-6 часов | ⭐⭐⭐⭐⭐ | Да | После стабильного revenue |
| **[E] AWS shared ALB** | **$18-25** | 3-4 часа | ⭐⭐⭐⭐⭐ | Да | Компромисс AWS + экономия |
| **[F] Neon DB branch** | **$0** | 1 час (только DB) | ⭐⭐⭐⭐ | Частично | Staging только для миграций |
| **[G] GitHub PR Preview** | **$0** | 2 часа | ⭐⭐⭐ | Нет | Если Next.js на Vercel |
| **[H] EC2 spot instance** | **$3-8** | 5-7 часов | ⭐⭐⭐⭐ | Да | Budget AWS |

---

## 5. Детальный разбор AWS-подхода

### Архитектура prod (уже запланирована)

```
Internet → Route53 → CloudFront → ALB → ECS Fargate (NestJS)
                                     └→ ECS Fargate (Next.js) [или Vercel]
                                         ↓
                                      RDS PostgreSQL (db.t3.micro)
```

### Вариант D — Полный AWS staging (дорогой)

```
staging.domain.com → Route53 → ALB (staging) → ECS Fargate staging → RDS staging
                                                    ↑
                                              ($16/мес ALB — это проблема)
```

**Калькуляция месячной стоимости:**

| Ресурс | Размер | Цена/мес |
|---|---|---|
| ALB (staging отдельный) | — | ~$16 (минимум) |
| ECS Fargate (NestJS) | 0.25 vCPU / 0.5 GB | ~$7 |
| ECS Fargate (Next.js) | 0.25 vCPU / 0.5 GB | ~$7 |
| RDS db.t4g.micro | 2 GB RAM | ~$12 |
| **ИТОГО** | | **~$42/мес** |

Это дорого для небольшого магазина. ALB стоит $16 независимо от трафика.

---

### Вариант E — AWS shared ALB (лучший AWS-вариант для малого бюджета)

**Идея:** Один ALB для prod и staging, разделение по поддомену через Listener Rules.

```
             ┌─────────────────────────────┐
             │    One ALB (~$16/мес)        │
             └──┬─────────────────────────┬┘
                │                         │
  staging.domain.com             domain.com
  (Host header rule)           (default rule)
                │                         │
     ┌──────────▼──────────┐    ┌──────────▼──────────┐
     │  Staging Target Group│    │   Prod Target Group  │
     │  ECS Service         │    │   ECS Service        │
     │  0.25vCPU / 0.5GB    │    │   0.5vCPU / 1GB     │
     └─────────────────────┘    └─────────────────────┘
                │                         │
     ┌──────────▼──────────┐    ┌──────────▼──────────┐
     │  staging DB (schema) │    │   prod DB            │
     │  Same RDS instance   │    │   Same RDS instance  │
     │  database: staging   │    │   database: prod     │
     └─────────────────────┘    └─────────────────────┘
```

**Ключевые решения:**
- Один ALB — экономим ~$16/мес
- Один RDS, разные databases (staging / prod) — экономим ~$12/мес
- Staging ECS tasks меньше prod tasks (0.25 vCPU vs 0.5 vCPU)

**Калькуляция:**

| Ресурс | Стратегия | Экономия | Цена/мес |
|---|---|---|---|
| ALB | Shared между staging и prod | $16 saved | $0 доп. |
| Staging ECS Fargate | 0.25 vCPU / 0.5 GB — только 8 часов в день (CI/CD) | ~60% | ~$3-5 |
| RDS | Shared instance, отдельная database | $12 saved | $0 доп. |
| **ИТОГО доп. расходов** | | | **~$3-5/мес** |

> При условии что staging ECS tasks запускаются только во время CI/CD деплоев
> (не 24/7). Для staging это нормально.

---

### Вариант F — Neon Database Branching (только DB, без сервисов)

Самый современный подход к проблеме "не сломать prod миграцией":

```bash
# Создаём ветку базы данных — как git branch, но для PostgreSQL
neon branches create --name staging --parent main

# Применяем миграцию на staging ветку
DATABASE_URL=<neon-staging-url> npx prisma migrate deploy

# Убедились что всё ок → применяем на main (prod)
DATABASE_URL=<neon-prod-url> npx prisma migrate deploy
```

**Преимущества Neon branching:**
- Copy-on-write snapshot prod данных за секунды
- Тестируешь миграции на РЕАЛЬНОЙ копии prod БД
- Бесплатно (free tier: 3 ветки, 512MB)
- Идеально для проверки деструктивных миграций

**Ограничение:** Только база данных. Сервисы (NestJS, Next.js) нужно отдельно.

**Когда достаточно только Neon branching:**
- Если основной риск — миграции БД (чаще всего так и есть)
- Если код-изменения можно протестировать локально

---

### Вариант A — Fly.io (рекомендованный старт)

```yaml
# fly.toml для staging NestJS
app = "handmade-jewelry-api-staging"
primary_region = "iad"  # us-east — близко к AWS us-east-1

[build]
  dockerfile = "apps/api/Dockerfile"

[env]
  NODE_ENV = "staging"
  PORT = "3001"

[[services]]
  internal_port = 3001
  protocol = "tcp"
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[mounts]
  # Нет — stateless NestJS

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

**Fly.io Free tier (2025):**
- 3 shared-cpu-1x VMs @ 256MB (бесплатно)
- 3 PostgreSQL кластера Fly Postgres (бесплатно)
- 160 GB outbound / month
- Нет credit card до превышения лимита

**Минус:** Инфраструктура отличается от AWS ECS. Если проблема специфична для ECS/ALB
— staging на Fly.io её не поймает.

---

## 6. Рекомендация по фазам

### Фаза 0: Сейчас (до MVP, W1–W9)

**Делать: ничего дополнительно. Использовать локальное окружение.**

```
✅ Уже есть: Docker Compose + локальная PostgreSQL
✅ Уже есть: Stripe test mode
⬜ Добавить: Stripe CLI для локальных webhooks (15 минут настройки)
⬜ Добавить: Resend test mode (уже поддерживается Resend из коробки)
```

Стоимость: **$0/мес**
Время: **15 минут** (только Stripe CLI)

---

### Фаза 1: Launch Day + первая неделя после запуска

**Делать: Fly.io staging для NestJS + Neon branch для DB миграций.**

Это даёт 90% ценности staging за $0/мес.

```
[Next.js staging]   → Vercel Preview Deployments (автоматически, бесплатно)
                      или локально перед деплоем
[NestJS staging]    → Fly.io free tier (staging.api.yourdomain.com)
[Database staging]  → Neon branch "staging" (копия prod данных)
[Stripe staging]    → Stripe test mode (не меняется)
[Email staging]     → Resend test mode (не меняется)
```

**CI/CD flow:**
```
git push feature/xxx
  → GitHub Actions: lint + test + build
  → merge to main
  → deploy to staging (Fly.io)
  → manual QA check
  → promote to production (AWS ECS)
```

Стоимость: **$0/мес**
Время настройки: **3-4 часа**

---

### Фаза 2: После первых $500/мес revenue (условно ~3-6 месяцев после launch)

**Делать: AWS shared ALB подход (Вариант E).**

К этому моменту:
- Есть реальные покупатели с реальными деньгами
- CI/CD уже настроен
- Нужна инфраструктура идентичная prod (ECS, IAM, Security Groups — всё то же)

```
staging.yourdomain.com → Route53 → Prod ALB → Staging Target Group → ECS staging
                                                                       ↓
                                                                   RDS staging schema
```

Стоимость: **+$3-5/мес** (только доп. ECS tasks на staging)
Время настройки: **4-6 часов** (Terraform + GitHub Actions env)

---

### Фаза 3: После $5,000/мес revenue или >2 разработчиков

**Делать: Полная CI/CD пирамида с отдельными окружениями.**

```
feature branch → Preview (Fly.io или ECS ephemeral) → автотесты Playwright
merge to main  → Staging (AWS) → ручной QA → одобрение
release tag    → Production (AWS) → smoke tests → done
```

Стоимость: **$40-60/мес доп.**

---

## 7. Таблица финального выбора

| Фаза проекта | Рекомендованный вариант | Стоимость/мес | Время setup | Что получаешь |
|---|---|---|---|---|
| **До MVP** (сейчас) | Только Stripe CLI + локальный Docker | **$0** | 15 мин | Локальные webhook тесты |
| **Launch Day** | Fly.io + Neon branch + Vercel Preview | **$0** | 3-4 часа | Полноценный staging pipeline |
| **После 1-го месяца** | Fly.io + Neon branch (продолжение) | **$0** | 0 (уже есть) | То же самое |
| **После $500/мес** | AWS shared ALB + ECS staging | **+$5/мес** | 4-6 часов | AWS-идентичная среда |
| **После $5k/мес** | AWS полный staging + ephemeral envs | **+$45/мес** | 8-10 часов | Enterprise-grade pipeline |

### Почему Fly.io, а не Railway или Render

| | Fly.io | Railway | Render |
|---|---|---|---|
| Free tier | ✅ 3 VMs + 3 DBs | ❌ $5/мес нижний порог | ⚠️ Есть, но 15-мин cold start |
| Docker поддержка | ✅ Нативно | ✅ Нативно | ✅ Нативно |
| Proximity к AWS us-east-1 | ✅ iad (Washington DC) | ⚠️ us-west-2 | ✅ Ohio |
| NestJS + PostgreSQL stack | ✅ Отлично | ✅ Отлично | ✅ Хорошо |
| Рекомендован в JS community | ✅ Широко | ✅ Популярен | ⚠️ Менее популярен |
| Uptime free tier | ✅ 24/7 | N/A | ⚠️ Спит |
| Итог | **Лучший выбор** | Если хочешь заплатить $5 за простоту | Не подходит |

---

## 8. План внедрения

### Шаг 0: Stripe CLI (сделать сейчас, до деплоя в prod)

**Цель:** Тестировать Stripe webhooks локально без staging.

```bash
# Установка
brew install stripe/stripe-cli/stripe

# Авторизация
stripe login

# Форвардинг webhooks на localhost
stripe listen --forward-to http://localhost:3001/webhooks/stripe

# В соседнем терминале — тригернуть тестовый payment
stripe trigger payment_intent.succeeded
```

**Время:** 15 минут
**Стоимость:** $0

---

### Шаг 1: Fly.io staging (сделать при деплое MVP в prod)

**Создать аккаунт + приложение:**

```bash
# Установка CLI
brew install flyctl

# Регистрация (бесплатно, нет карты)
fly auth signup

# Создание staging app для NestJS
cd apps/api
fly launch --name handmade-jewelry-api-staging --region iad --no-deploy

# Создание Postgres на Fly.io
fly postgres create --name handmade-jewelry-db-staging --region iad

# Attach DB к приложению
fly postgres attach handmade-jewelry-db-staging --app handmade-jewelry-api-staging

# Deployment
fly deploy
```

**Secrets для staging:**
```bash
fly secrets set \
  NODE_ENV=staging \
  STRIPE_SECRET_KEY=sk_test_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxx \
  RESEND_API_KEY=re_xxx \
  --app handmade-jewelry-api-staging
```

**GitHub Actions для auto-deploy on merge to main:**
```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to staging

on:
  push:
    branches: [main]

jobs:
  deploy-api-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: fly deploy apps/api --app handmade-jewelry-api-staging
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

**Время:** 2-3 часа
**Стоимость:** $0/мес

---

### Шаг 2: Neon Database Branching (сделать при первых prod данных)

```bash
# Установка Neon CLI
npm install -g neonctl

# Создание staging ветки (копия prod данных за секунды)
neonctl branches create --name staging --project-id <your-project-id>

# Тестирование миграции на staging ветке
DATABASE_URL=$(neonctl connection-string --branch staging) \
  npx prisma migrate deploy

# Верификация
DATABASE_URL=$(neonctl connection-string --branch staging) \
  npx prisma studio

# Применение на prod (после успешного теста)
DATABASE_URL=$(neonctl connection-string --branch main) \
  npx prisma migrate deploy
```

**Время:** 1 час
**Стоимость:** $0/мес (3 ветки бесплатно)

---

### Шаг 3: AWS shared ALB (после $500/мес revenue)

**Добавить в Terraform конфиг:**

```hcl
# Staging listener rule на существующем ALB
resource "aws_lb_listener_rule" "staging_api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_staging.arn
  }

  condition {
    host_header {
      values = ["staging.api.yourdomain.com"]
    }
  }
}

# Staging target group
resource "aws_lb_target_group" "api_staging" {
  name     = "api-staging-tg"
  port     = 3001
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path = "/health"
  }
}

# Staging ECS Service (меньше prod)
resource "aws_ecs_service" "api_staging" {
  name            = "api-staging"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api_staging.arn
  desired_count   = 1  # один инстанс достаточно для staging

  # Spot instances для экономии (staging допускает прерывание)
  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 1
  }
}
```

**Отдельная database на том же RDS:**
```sql
-- Создаём staging database на prod RDS инстансе (экономим $12/мес на RDS)
CREATE DATABASE jewelry_staging;
```

```env
# staging .env
DATABASE_URL=postgresql://user:pass@<same-rds-host>:5432/jewelry_staging
```

**Время:** 4-6 часов
**Стоимость:** +$3-5/мес (только staging ECS Fargate tasks)

---

## Итог одной строкой

> **До MVP:** не нужен, трать время на фичи.
> **При запуске MVP:** Fly.io + Neon branch = полноценный staging за $0.
> **При первых деньгах ($500/мес):** AWS shared ALB за +$5/мес.

---

## GitHub Issues

| Задача | Фаза | Issue |
|---|---|---|
| Stripe CLI setup для локальных webhooks | До MVP | Добавить в #70 (Stripe backend) |
| Fly.io staging для NestJS API | Launch | Новый issue (pre-MVP, низкий приоритет) |
| Neon database branching для миграций | Launch | Новый issue (pre-MVP) |
| AWS shared ALB staging | Post-launch | Добавить в #76 (AWS networking) или новый `[POST-MVP]` issue |
