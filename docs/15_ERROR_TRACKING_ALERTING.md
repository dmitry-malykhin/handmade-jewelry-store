# Error Tracking & Alerting — Sentry + CloudWatch Alarms

> Автоматическое обнаружение багов и алертинг для NestJS и Next.js.
> Стек: Sentry (errors) + CloudWatch Alarms (infrastructure) + UptimeRobot (uptime).
> Последнее обновление: 2026-03-23

---

## Содержание

1. [Почему Sentry](#1-почему-sentry)
2. [Sentry — NestJS Backend setup](#2-sentry--nestjs-backend-setup)
3. [Sentry — Next.js Frontend setup](#3-sentry--nextjs-frontend-setup)
4. [Sentry Alerts — настройка уведомлений](#4-sentry-alerts--настройка-уведомлений)
5. [CloudWatch Alarms — Infrastructure](#5-cloudwatch-alarms--infrastructure)
6. [UptimeRobot — Uptime Monitoring](#6-uptimerobot--uptime-monitoring)
7. [Incident Response — что делать когда пришёл алерт](#7-incident-response--что-делать-когда-пришёл-алерт)
8. [Error Triage Process](#8-error-triage-process)
9. [Environment variables](#9-environment-variables)

---

## 1. Почему Sentry

**Проблема:** Ошибка произошла в production. Пользователь видит 500. Как понять что случилось?

Без Sentry: ищешь в CloudWatch Logs среди тысяч строк, не знаешь что искать.

С Sentry: через 30 секунд после ошибки ты видишь:
```
TypeError: Cannot read property 'id' of undefined
  at OrdersService.createOrder (orders.service.ts:45)
  at OrdersController.create (orders.controller.ts:23)

User: user-abc123 (test@example.com)
URL: POST /api/orders
Request Body: { items: [...], shippingAddress: {...} }
Breadcrumbs:
  12:34:55  Navigation  GET /checkout
  12:34:57  HTTP        POST /api/cart/items 200
  12:35:01  HTTP        POST /api/orders 500 ← HERE
```

### Sentry Free Tier (достаточно для MVP)

- **5,000 errors/month** — при хорошем коде хватит на первые месяцы
- **50 session replays/month** — можно видеть что делал пользователь
- **Performance monitoring** — Core Web Vitals, slow API calls
- **1 user** — достаточно для соло-разработчика
- **30 дней хранения**

При росте → **Sentry Team: $26/month** (50k errors, 5 users, 90 дней).

---

## 2. Sentry — NestJS Backend setup

### Установка

```bash
pnpm add --filter api @sentry/node @sentry/profiling-node
```

### Инициализация — ПЕРВЫЙ импорт в main.ts

```typescript
// apps/api/src/instrument.ts
// ВАЖНО: этот файл должен быть импортирован ПЕРВЫМ в main.ts
// Sentry должен быть инициализирован до всего остального
import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

Sentry.init({
  dsn: process.env.SENTRY_DSN_API,
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.APP_VERSION,  // из CI/CD: git tag или commit hash

  // Трассировка производительности
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // 10% запросов в production (не перегружать quota), 100% в dev

  // CPU profiling (optional)
  profilesSampleRate: 0.05,  // 5% запросов

  integrations: [
    nodeProfilingIntegration(),
    Sentry.prismaIntegration(),  // трассировка Prisma queries!
  ],

  // Не отправлять в dev по умолчанию
  enabled: process.env.NODE_ENV !== 'development' || !!process.env.SENTRY_DSN_API,
})
```

```typescript
// apps/api/src/main.ts — ПЕРВАЯ строка
import './instrument'

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
// ...
```

### SentryExceptionFilter — глобальный обработчик

```typescript
// apps/api/src/common/filters/sentry-exception.filter.ts
import { ArgumentsHost, Catch } from '@nestjs/common'
import { BaseExceptionFilter } from '@nestjs/core'
import * as Sentry from '@sentry/node'

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Не отправлять в Sentry ожидаемые HTTP ошибки (4xx)
    const isHttpException =
      exception instanceof Error && (exception as { status?: number }).status !== undefined
    const statusCode = isHttpException ? (exception as { status: number }).status : 500

    if (statusCode >= 500) {
      Sentry.captureException(exception, {
        extra: {
          requestId: host.switchToHttp().getRequest()?.['requestId'],
        },
      })
    }

    super.catch(exception, host)
  }
}
```

```typescript
// apps/api/src/main.ts
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter'

app.useGlobalFilters(new SentryExceptionFilter(app.get(HttpAdapterHost)))
```

### Добавить userId в контекст

Когда пользователь авторизован — привязывать ошибки к пользователю:

```typescript
// apps/api/src/common/interceptors/sentry-user.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import * as Sentry from '@sentry/node'
import { Observable } from 'rxjs'

@Injectable()
export class SentryUserInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const authenticatedUser = request.user  // после JwtAuthGuard

    if (authenticatedUser) {
      Sentry.setUser({
        id: authenticatedUser.id,
        email: authenticatedUser.email,
      })
    }

    return next.handle()
  }
}
```

---

## 3. Sentry — Next.js Frontend setup

### Установка через wizard (рекомендовано)

```bash
pnpm --filter web add @sentry/nextjs
npx --prefix apps/web @sentry/wizard@latest -i nextjs
```

Wizard автоматически создаст:
- `apps/web/sentry.client.config.ts`
- `apps/web/sentry.server.config.ts`
- `apps/web/sentry.edge.config.ts`
- Обновит `apps/web/next.config.ts`

### Конфигурация (после wizard)

```typescript
// apps/web/sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  tracesSampleRate: 0.1,   // 10% в production

  // Session Replay — показывает что делал пользователь перед ошибкой
  replaysSessionSampleRate: 0.01,   // 1% всех сессий
  replaysOnErrorSampleRate: 1.0,    // 100% сессий где была ошибка

  integrations: [
    Sentry.replayIntegration({
      // Скрывать PII в записях
      maskAllText: false,         // показывать текст кнопок и навигации
      blockAllMedia: false,
      // Но маскировать поля форм (пароли, CC)
      mask: ['[type="password"]', '[data-sentry-mask]'],
    }),
  ],
})
```

### Error Boundary для React компонентов

```typescript
// apps/web/src/components/common/ErrorBoundary.tsx
import * as Sentry from '@sentry/nextjs'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={fallback ?? <ErrorFallback />}
      onError={(error) => {
        // Дополнительный контекст при ошибке компонента
        Sentry.setTag('error.source', 'react_component')
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}
```

### Global Error Pages (Next.js App Router)

```typescript
// apps/web/src/app/global-error.tsx
'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <p>Our team has been notified. Please try again.</p>
      </body>
    </html>
  )
}
```

---

## 4. Sentry Alerts — настройка уведомлений

### Что настроить в Sentry Dashboard

**Alert 1 — New error in production (CRITICAL)**
```
Trigger: A new issue is created
Filter: environment = production
Action: Send Slack notification + Email
Channel: #production-errors
```

**Alert 2 — Error spike (CRITICAL)**
```
Trigger: Number of occurrences exceeds 50 in 1 hour
Filter: environment = production
Action: Send Slack + PagerDuty (post-MVP)
```

**Alert 3 — Stripe/Payment errors (CRITICAL)**
```
Trigger: New issue matching "PaymentsService" OR "stripe"
Filter: environment = production
Action: Email immediately
```

**Alert 4 — Performance degradation**
```
Trigger: P95 response time exceeds 2000ms for /api/*
Filter: environment = production
Action: Slack notification
```

### Slack Integration

Sentry → Settings → Integrations → Slack → Connect

Создать `#production-errors` канал в Slack. Все Sentry алерты туда.

Если нет Slack — использовать email.

---

## 5. CloudWatch Alarms — Infrastructure

### Обязательные алармы для production

```typescript
// AWS CDK / Terraform — или настроить вручную в AWS Console

// Alarm 1: API Error Rate
// Trigger: 5xx errors > 5% of requests for 5 minutes
MetricAlarm:
  MetricName: HTTPCode_Target_5XX_Count
  Namespace: AWS/ApplicationELB
  Threshold: 10  // 10 ошибок за 1 минуту
  Period: 60
  EvaluationPeriods: 5
  TreatMissingData: notBreaching
  AlarmActions: [SNS_TOPIC_ARN]

// Alarm 2: RDS CPU
MetricAlarm:
  MetricName: CPUUtilization
  Namespace: AWS/RDS
  Threshold: 85  // %
  ComparisonOperator: GreaterThanThreshold
  AlarmActions: [SNS_TOPIC_ARN]

// Alarm 3: RDS Storage
MetricAlarm:
  MetricName: FreeStorageSpace
  Namespace: AWS/RDS
  Threshold: 2147483648  // 2GB в байтах
  ComparisonOperator: LessThanThreshold
  AlarmActions: [SNS_TOPIC_ARN]

// Alarm 4: ECS Task Restarts
MetricAlarm:
  MetricName: MemoryUtilization
  Namespace: AWS/ECS
  Threshold: 90  // %
  AlarmActions: [SNS_TOPIC_ARN]
```

### SNS → Email уведомления (простейший способ)

```
AWS Console → SNS → Create Topic → "jewelry-store-alerts"
  → Create Subscription → Email → your@email.com
  → Confirm subscription email

CloudWatch Alarm → Action → SNS Topic "jewelry-store-alerts"
```

### Что получишь

Письмо:
```
ALARM: "RDS-FreeStorage-Low" in US East (N. Virginia)
State Change: OK → ALARM
Reason: Threshold Crossed: 1 datapoint (1.87 GB) was less than the threshold (2 GB)
```

---

## 6. UptimeRobot — Uptime Monitoring

### Health endpoint в NestJS (обязательно — до настройки UptimeRobot)

UptimeRobot пингует URL и проверяет HTTP 200. Нужен endpoint который отвечает только если
приложение реально работает (DB доступна, приложение запущено).

```bash
# Установить в apps/api
pnpm add @nestjs/terminus
```

```typescript
// apps/api/src/health/health.module.ts
import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { HealthController } from './health.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

```typescript
// apps/api/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common'
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus'
import { PrismaService } from '../prisma/prisma.service'

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  checkHealth() {
    return this.healthCheckService.check([
      // Проверяет что Prisma может сделать SELECT 1
      () => this.prismaService.$queryRaw`SELECT 1`.then(() => ({
        database: { status: 'up' },
      })),
    ])
  }
}
```

```typescript
// apps/api/src/app.module.ts — добавить HealthModule
import { HealthModule } from './health/health.module'

@Module({
  imports: [
    // ... other modules
    HealthModule,
  ],
})
export class AppModule {}
```

**Ответ при здоровом состоянии:**
```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } },
  "error": {},
  "details": { "database": { "status": "up" } }
}
```

**Ответ при проблеме с DB (UptimeRobot увидит не-200):**
```json
{ "status": "error", "error": { "database": { "status": "down" } } }
```

> Endpoint публичный, без авторизации. Никаких секретных данных не возвращает.

---

### Создать мониторы

**Monitor 1: API Health**
```
URL: https://api.jewelry-store.com/health
Method: GET
Expected status: 200
Check interval: 5 minutes
Alert: Email + SMS
```

**Monitor 2: Frontend Homepage**
```
URL: https://jewelry-store.com
Method: GET
Expected status: 200
Check interval: 5 minutes
```

**Monitor 3: Checkout (Critical path)**
```
URL: https://jewelry-store.com/cart
Method: GET
Expected status: 200
Check interval: 5 minutes
```

### Status Page

UptimeRobot позволяет создать публичную Status Page:
`status.jewelry-store.com` — показывает историю uptime.

Это trust signal для покупателей: "наш магазин надёжен".

---

## 7. Incident Response — что делать когда пришёл алерт

### Severity Levels

| Severity | Пример | Время реакции |
|---|---|---|
| P0 — Critical | Сайт недоступен / Payments не работают | Немедленно |
| P1 — High | Ошибки у 10%+ пользователей / DB проблемы | 30 минут |
| P2 — Medium | Отдельные ошибки / медленные страницы | Рабочий день |
| P3 — Low | Warning logs / minor UX issues | Sprint |

### P0 Playbook (сайт недоступен)

```
1. Проверь UptimeRobot → какие мониторы красные?
2. Проверь AWS Console → ECS Tasks, RDS status
3. Проверь CloudWatch → последние ошибки за 15 минут
4. Проверь Sentry → новые ошибки
5. Если ECS task upал → перезапусти через Console или aws ecs update-service
6. Если DB → проверь connections, storage, CPU
7. Если деплой случился недавно → rollback через ECS (предыдущий task definition)
```

### P1 Playbook (payment errors)

```
1. Sentry → PaymentsService ошибки → full stack trace
2. Stripe Dashboard → смотри Events → последние payment intents
3. Проверь логи в CloudWatch Insights:
   fields @timestamp, message, orderId, stripeError
   | filter context="PaymentsService" AND level="error"
   | sort @timestamp desc
4. Если Stripe проблема → проверь status.stripe.com
5. Если наша ошибка → hotfix deploy
```

---

## 8. Error Triage Process

Еженедельный процесс (15 минут по понедельникам):

```
1. Открыть Sentry → Issues → New this week
2. Для каждой новой ошибки:
   - Это реальный баг? (не валидация, не 404)
   - Сколько пользователей затронуто?
   - Есть ли паттерн (одно устройство, один endpoint)?
3. Критичные (P0/P1) → создать GitHub issue → fix в текущем спринте
4. Некритичные → добавить в backlog
5. Игнорируемые (external bots, crawlers) → добавить в ignore list Sentry
```

### Как уменьшить noise в Sentry (не все ошибки важны)

```typescript
// В Sentry конфиге — фильтровать известный noise

beforeSend(event, hint) {
  const error = hint.originalException

  // Игнорировать 404 ошибки (боты, сканеры)
  if (error instanceof Error && error.message.includes('Not Found')) {
    return null
  }

  // Игнорировать отмены пользователем (AbortError)
  if (error instanceof Error && error.name === 'AbortError') {
    return null
  }

  // Игнорировать ошибки расширений браузера
  const frames = event.exception?.values?.[0]?.stacktrace?.frames
  if (frames?.some(frame => frame.filename?.includes('extension://'))) {
    return null
  }

  return event
}
```

---

## 9. Environment variables

```bash
# apps/api/.env.example
SENTRY_DSN_API=https://abc123@o123456.ingest.sentry.io/789012
APP_VERSION=1.0.0   # или git SHA из CI/CD

# apps/web/.env.example (публичные переменные — используй NEXT_PUBLIC_)
NEXT_PUBLIC_SENTRY_DSN=https://xyz789@o123456.ingest.sentry.io/345678
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Как получить DSN

1. Sentry.io → Create Account (free)
2. Create Project → NestJS → копируй DSN
3. Create Project → Next.js → копируй DSN
4. Два отдельных проекта = отдельные квоты, отдельный routing

### Source Maps в production

Для читаемых stack traces в production:

```typescript
// apps/web/next.config.ts
import { withSentryConfig } from '@sentry/nextjs'

export default withSentryConfig(nextConfig, {
  // Загружать source maps в Sentry при деплое
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Удалить source maps из production бандла (не показывать код пользователям)
  hideSourceMaps: true,
})
```
