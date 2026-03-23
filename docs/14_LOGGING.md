# Logging System — Technical Implementation Guide

> Структурированное логирование для NestJS, PostgreSQL и Next.js.
> Стек: Winston + AWS CloudWatch Logs → Grafana Cloud (при росте).
> Последнее обновление: 2026-03-23

---

## Содержание

1. [Что такое структурированное логирование](#1-что-такое-структурированное-логирование)
2. [Уровни логирования](#2-уровни-логирования)
3. [NestJS / Backend — Winston setup](#3-nestjs--backend--winston-setup)
4. [Request Logging — Middleware](#4-request-logging--middleware)
5. [AWS CloudWatch — транспорт](#5-aws-cloudwatch--транспорт)
6. [PostgreSQL — логирование запросов](#6-postgresql--логирование-запросов)
7. [Next.js — Frontend логирование](#7-nextjs--frontend-логирование)
8. [Correlation IDs — связывание запросов](#8-correlation-ids--связывание-запросов)
9. [Sensitive Data — что НЕ логировать](#9-sensitive-data--что-не-логировать)
10. [Log Retention Policy](#10-log-retention-policy)
11. [Grafana Cloud — при росте](#11-grafana-cloud--при-росте)

---

## 1. Что такое структурированное логирование

### Плохо (неструктурированное)

```
[2026-03-23 12:34:56] Order created for user abc123, total: $68
```

Нельзя искать, нельзя агрегировать, нельзя строить алерты.

### Хорошо (структурированное JSON)

```json
{
  "level": "info",
  "timestamp": "2026-03-23T12:34:56.789Z",
  "requestId": "req-4a8f2b",
  "service": "api",
  "context": "OrdersService",
  "message": "Order created",
  "orderId": "order-xyz",
  "userId": "user-abc123",
  "totalUsd": 68.00,
  "itemCount": 1,
  "duration": 234
}
```

Можно: `SELECT * WHERE userId = 'user-abc123' AND level = 'error'`

---

## 2. Уровни логирования

```
error   → Ошибки требующие немедленного внимания. Stripe payment failed, DB connection lost
warn    → Нежелательное но не критичное. Deprecated API used, slow query > 1s
info    → Нормальные бизнес-события. Order created, User registered, Payment succeeded
debug   → Детали для отладки. Request/Response body, DB query params (только в dev!)
verbose → Очень детальные данные. Только при активной отладке конкретной проблемы
```

### Правило: что логировать на каком уровне

| Событие | Уровень | Поля |
|---|---|---|
| HTTP 5xx error | `error` | requestId, method, path, statusCode, error |
| HTTP 4xx error (кроме 401/404) | `warn` | requestId, method, path, statusCode |
| HTTP 401/404 | `info` | requestId, method, path, statusCode |
| HTTP 2xx | `info` | requestId, method, path, statusCode, duration |
| Order created | `info` | requestId, orderId, userId, totalUsd |
| Payment succeeded | `info` | orderId, stripePaymentIntentId, amountUsd |
| Payment failed | `warn` | orderId, stripeError, userId |
| DB query > 1 second | `warn` | query (truncated), duration, context |
| Unhandled exception | `error` | stack, context, requestId |
| App started | `info` | port, environment |

---

## 3. NestJS / Backend — Winston setup

### Установка

```bash
pnpm add --filter api winston nest-winston winston-cloudwatch
```

### LoggerModule — глобальный модуль

```typescript
// apps/api/src/logger/logger.module.ts
import { Global, Module } from '@nestjs/common'
import { WinstonModule } from 'nest-winston'
import { createWinstonLogger } from './winston.config'

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: () => createWinstonLogger(),
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
```

### Winston конфигурация

```typescript
// apps/api/src/logger/winston.config.ts
import * as winston from 'winston'
import WinstonCloudWatch from 'winston-cloudwatch'

export function createWinstonLogger(): winston.LoggerOptions {
  const isProduction = process.env.NODE_ENV === 'production'

  const transports: winston.transport[] = [
    // Всегда: вывод в консоль
    new winston.transports.Console({
      format: isProduction
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),  // JSON в production (для CloudWatch)
          )
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(
              ({ level, message, timestamp, context, ...rest }) =>
                `${timestamp} [${context ?? 'App'}] ${level}: ${message} ${
                  Object.keys(rest).length ? JSON.stringify(rest) : ''
                }`,
            ),
          ),
    }),
  ]

  // CloudWatch только в production
  if (isProduction && process.env.AWS_CLOUDWATCH_LOG_GROUP) {
    transports.push(
      new WinstonCloudWatch({
        logGroupName: process.env.AWS_CLOUDWATCH_LOG_GROUP,
        logStreamName: `api-${process.env.NODE_ENV}-${new Date().toISOString().slice(0, 10)}`,
        awsRegion: process.env.AWS_REGION ?? 'us-east-1',
        messageFormatter: ({ level, message, ...meta }) =>
          JSON.stringify({ level, message, ...meta }),
        retentionInDays: 30,
      }),
    )
  }

  return {
    level: isProduction ? 'info' : 'debug',
    transports,
    // Не крашить приложение из-за ошибки логгера
    exitOnError: false,
  }
}
```

### Использование в сервисах

```typescript
// apps/api/src/orders/orders.service.ts
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name)

  async createOrder(createOrderDto: CreateOrderDto, userId: string) {
    this.logger.log('Creating order', {
      userId,
      itemCount: createOrderDto.items.length,
    })

    try {
      const order = await this.prisma.order.create({ ... })
      this.logger.log('Order created successfully', {
        orderId: order.id,
        userId,
        totalUsd: order.total,
      })
      return order
    } catch (error) {
      this.logger.error('Failed to create order', {
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  }
}
```

### Добавить LoggerModule в AppModule

```typescript
// apps/api/src/app.module.ts
import { LoggerModule } from './logger/logger.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    PrismaModule,
    // ...
  ],
})
export class AppModule {}
```

---

## 4. Request Logging — Middleware

Автоматически логировать каждый HTTP запрос:

```typescript
// apps/api/src/common/middleware/request-logger.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP')

  use(request: Request, response: Response, next: NextFunction) {
    const requestId = randomUUID()
    const startTime = Date.now()

    // Добавляем requestId к запросу (для correlation в других логах)
    request['requestId'] = requestId
    response.setHeader('X-Request-Id', requestId)

    response.on('finish', () => {
      const { method, originalUrl } = request
      const { statusCode } = response
      const duration = Date.now() - startTime

      const logData = {
        requestId,
        method,
        path: originalUrl,
        statusCode,
        duration,
        userAgent: request.get('user-agent'),
        ip: request.ip,
      }

      if (statusCode >= 500) {
        this.logger.error('Request failed', logData)
      } else if (statusCode >= 400) {
        this.logger.warn('Request client error', logData)
      } else {
        this.logger.log('Request completed', logData)
      }
    })

    next()
  }
}
```

```typescript
// apps/api/src/app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*')
  }
}
```

---

## 5. AWS CloudWatch — транспорт

### Переменные окружения

```bash
# apps/api/.env.example
AWS_CLOUDWATCH_LOG_GROUP=/jewelry-store/api
AWS_REGION=us-east-1
```

### IAM политика для ECS Task Role

```json
{
  "Effect": "Allow",
  "Action": [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents",
    "logs:DescribeLogStreams"
  ],
  "Resource": "arn:aws:logs:us-east-1:*:log-group:/jewelry-store/*"
}
```

### CloudWatch Log Groups структура

```
/jewelry-store/api        → NestJS application logs
/jewelry-store/access     → Request access logs (ALB)
/jewelry-store/postgres   → RDS PostgreSQL logs
```

### CloudWatch Insights — полезные запросы

```sql
-- Все ошибки за последний час
fields @timestamp, message, requestId, context
| filter level = "error"
| sort @timestamp desc
| limit 100

-- Медленные запросы (> 1 секунды)
fields @timestamp, path, duration, requestId
| filter duration > 1000
| stats avg(duration), max(duration), count() by path
| sort avg(duration) desc

-- Ошибки конкретного пользователя
fields @timestamp, message, level, orderId
| filter userId = "user-abc123"
| sort @timestamp desc

-- Статистика по endpoint за день
fields @timestamp, path, statusCode, duration
| stats count() as requestCount, avg(duration) as avgDuration,
        sum(statusCode >= 500) as errorCount by path
| sort requestCount desc
```

---

## 6. PostgreSQL — логирование запросов

### RDS Performance Insights (бесплатно для db.t3.micro)

Включить в AWS Console: RDS → Database → Performance Insights.

Показывает:
- Top SQL statements по времени выполнения
- Wait events (что ждёт запрос — I/O, locks, CPU)
- Database load по времени
- Specific queries с полным текстом

### pg_stat_statements — медленные запросы

Включить в RDS Parameter Group:
```
shared_preload_libraries = pg_stat_statements
pg_stat_statements.track = all
log_min_duration_statement = 1000  # логировать запросы > 1 секунды
```

Просмотр в PostgreSQL:
```sql
SELECT
  query,
  calls,
  total_exec_time / calls AS avg_time_ms,
  rows / calls AS avg_rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

### Prisma — логирование в NestJS

```typescript
// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    super({
      log: [
        { level: 'warn', emit: 'event' },   // медленные запросы
        { level: 'error', emit: 'event' },  // ошибки
        // { level: 'query', emit: 'event' } // ← только для debug! очень много логов
      ],
    })

    // Логировать медленные Prisma queries
    this.$on('warn', (event) => {
      this.logger.warn('Prisma warning', { message: event.message })
    })

    this.$on('error', (event) => {
      this.logger.error('Prisma error', { message: event.message })
    })
  }

  async onModuleInit() {
    await this.$connect()
    this.logger.log('Database connected')
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
```

### RDS CloudWatch метрики которые мониторить

| Метрика | Нормально | Алерт при |
|---|---|---|
| `DatabaseConnections` | < 50 | > 80 |
| `FreeStorageSpace` | > 5GB | < 2GB |
| `CPUUtilization` | < 60% | > 85% |
| `ReadLatency` | < 5ms | > 20ms |
| `WriteLatency` | < 10ms | > 30ms |
| `FreeableMemory` | > 200MB | < 100MB |

---

## 7. Next.js — Frontend логирование

### Два контекста: Server и Client

```
Server Side (Node.js):    console.log → CloudWatch (автоматически в ECS) / Vercel logs
Client Side (Browser):    window.onerror → Sentry (см. docs/15_ERROR_TRACKING.md)
```

### Server-side Next.js логирование

```typescript
// apps/web/src/lib/logger.ts
const isServer = typeof window === 'undefined'

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    if (isServer) {
      console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }))
    }
    // Client side — нет, Sentry обрабатывает
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    if (isServer) {
      console.error(JSON.stringify({ level: 'error', message, ...meta, timestamp: new Date().toISOString() }))
    }
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    if (isServer) {
      console.warn(JSON.stringify({ level: 'warn', message, ...meta, timestamp: new Date().toISOString() }))
    }
  },
}
```

### Server Actions и Route Handlers

```typescript
// apps/web/src/app/api/webhooks/stripe/route.ts
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    logger.info('Stripe webhook received', { path: '/api/webhooks/stripe' })
    // ... process webhook
    logger.info('Webhook processed successfully', { eventType: event.type })
    return new Response('OK')
  } catch (error) {
    logger.error('Stripe webhook processing failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return new Response('Error', { status: 500 })
  }
}
```

### Client-side: только через Sentry

На клиенте НЕ нужен свой logger. Sentry автоматически перехватывает:
- Unhandled Promise rejections
- `window.onerror` (JS exceptions)
- Network errors (optional)

Для кастомных событий:
```typescript
// apps/web/src/components/checkout/CheckoutForm.tsx
import * as Sentry from '@sentry/nextjs'

// Логировать важное пользовательское действие
Sentry.addBreadcrumb({
  message: 'User started checkout',
  level: 'info',
  data: { itemCount: cartItems.length },
})
```

---

## 8. Correlation IDs — связывание запросов

Чтобы связать лог Frontend → API → DB в единый трейс:

### Схема

```
Browser request
  → Next.js Server Component: добавляет X-Request-Id: req-abc123
    → fetch('/api/orders'): передаёт X-Request-Id header
      → NestJS: читает X-Request-Id, логирует все события с ним
        → Prisma: логирует query с requestId
```

### NestJS: читать requestId из header

```typescript
// apps/api/src/common/middleware/request-logger.middleware.ts
use(request: Request, response: Response, next: NextFunction) {
  // Принять requestId от frontend или сгенерировать новый
  const requestId = (request.headers['x-request-id'] as string) ?? randomUUID()
  request['requestId'] = requestId
  // ...
}
```

### AsyncLocalStorage для передачи requestId в deep functions

```typescript
// apps/api/src/common/context/request-context.ts
import { AsyncLocalStorage } from 'node:async_hooks'

interface RequestContext {
  requestId: string
  userId?: string
}

export const requestContext = new AsyncLocalStorage<RequestContext>()

// В Middleware:
requestContext.run({ requestId, userId }, () => next())

// В любом Service:
const context = requestContext.getStore()
this.logger.log('Processing payment', { requestId: context?.requestId })
```

---

## 9. Sensitive Data — что НЕ логировать

```typescript
// НИКОГДА не логировать:
const FORBIDDEN_LOG_FIELDS = [
  'password',
  'passwordHash',
  'cardNumber',       // CC номер
  'cvv',             // CVV
  'ssn',             // Social Security Number
  'stripeSecretKey', // API keys
  'jwtToken',
  'refreshToken',
  'accessToken',
]

// Sanitize function — использовать перед логированием request body
export function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const result = { ...obj }
  FORBIDDEN_LOG_FIELDS.forEach((field) => {
    if (field in result) {
      result[field] = '[REDACTED]'
    }
  })
  return result
}
```

### Что конкретно редактировать в логах

| Поле | В логе писать |
|---|---|
| `password` | `[REDACTED]` |
| `stripeId` (payment intent) | Первые 8 символов: `pi_3abc...` |
| Email пользователя | Только domain: `***@gmail.com` |
| Адрес | Только город и штат |
| Phone | `[REDACTED]` |
| IP адрес | Последний октет: `1.2.3.xxx` |

---

## 10. Log Retention Policy

| Уровень | AWS CloudWatch | Grafana Cloud |
|---|---|---|
| Error logs | 90 дней | 30 дней |
| Warn logs | 30 дней | 14 дней |
| Info/Access logs | 14 дней | 7 дней |
| Debug logs | 3 дня | Не хранить в prod |

CloudWatch retention настраивается в `winston-cloudwatch` → `retentionInDays` или в CloudWatch Console.

---

## 11. Grafana Cloud — при росте

Когда CloudWatch становится дорогим (> $20/мес на логах) или нужен лучший UX для поиска:

### Setup Grafana Cloud + Loki

```yaml
# docker-compose для локальной разработки: Loki + Grafana
services:
  loki:
    image: grafana/loki:3.0.0
    ports: ["3100:3100"]

  grafana:
    image: grafana/grafana:latest
    ports: ["3001:3000"]  # port 3000 занят Next.js
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### Winston Loki transport (production)

```typescript
// pnpm add --filter api winston-loki
import LokiTransport from 'winston-loki'

new LokiTransport({
  host: process.env.GRAFANA_LOKI_URL,
  basicAuth: `${process.env.GRAFANA_USER}:${process.env.GRAFANA_API_KEY}`,
  labels: {
    app: 'jewelry-api',
    environment: process.env.NODE_ENV,
  },
  json: true,
})
```

### LogQL — Grafana Loki queries

```logql
# Все ошибки
{app="jewelry-api"} | json | level="error"

# Медленные API запросы
{app="jewelry-api"} | json | duration > 1000 | line_format "{{.path}} took {{.duration}}ms"

# Ошибки Stripe
{app="jewelry-api"} | json | level="error" | context="PaymentsService"

# Запросы конкретного пользователя
{app="jewelry-api"} | json | userId="user-abc123"
```
