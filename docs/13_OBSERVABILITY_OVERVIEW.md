# Observability & Monitoring — Market Analysis & Stack Selection

> Полный анализ рынка инструментов мониторинга, логирования, трекинга ошибок и аналитики.
> Выбор стека для минимального бюджета с путём развития.
> Последнее обновление: 2026-03-23

---

## Содержание

1. [Что такое Observability и зачем это нужно](#1-что-такое-observability-и-зачем-это-нужно)
2. [Три столпа Observability](#2-три-столпа-observability)
3. [Карта инструментов рынка 2025-2026](#3-карта-инструментов-рынка-2025-2026)
4. [Детальное сравнение: Error Tracking](#4-детальное-сравнение-error-tracking)
5. [Детальное сравнение: Логирование (Backend)](#5-детальное-сравнение-логирование-backend)
6. [Детальное сравнение: User Analytics & Session Recording](#6-детальное-сравнение-user-analytics--session-recording)
7. [Детальное сравнение: Infrastructure Monitoring](#7-детальное-сравнение-infrastructure-monitoring)
8. [Детальное сравнение: Uptime Monitoring](#8-детальное-сравнение-uptime-monitoring)
9. [AWS-нативный стек](#9-aws-нативный-стек)
10. [Рекомендуемый стек: $0 старт](#10-рекомендуемый-стек-0-старт)
11. [Рекомендуемый стек: $1k–5k MRR](#11-рекомендуемый-стек-1k5k-mrr)
12. [Рекомендуемый стек: $10k+ MRR](#12-рекомендуемый-стек-10k-mrr)
13. [Что собирать о пользователях для маркетинга](#13-что-собирать-о-пользователях-для-маркетинга)
14. [Timeline внедрения](#14-timeline-внедрения)

---

## 1. Что такое Observability и зачем это нужно

**Observability** (наблюдаемость) — способность понять внутреннее состояние системы по её внешним сигналам.

### Три вопроса которые это решает

| Вопрос | Без observability | С observability |
|---|---|---|
| "Что сломалось?" | Читаешь complaints от пользователей в почте | Sentry уже показал stack trace 30 секунд назад |
| "Почему медленно работает?" | Угадываешь | Grafana показывает что PostgreSQL запрос занимает 800ms |
| "Почему конверсия упала?" | Не знаешь | PostHog показывает что 60% уходят на Shipping step |

### Для чего это критично в e-commerce

1. **Потерянный заказ = потерянные деньги.** Если payment webhook упал — нужно знать сразу.
2. **SEO зависит от Core Web Vitals.** Замедление на 1 секунду = -7% конверсии.
3. **Маркетинг без данных = деньги на ветер.** Нужно знать откуда приходят покупатели.
4. **Fraud detection.** Повторные неудачные попытки оплаты — сигнал атаки.

---

## 2. Три столпа Observability

```
┌────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY                               │
│                                                               │
│  📋 LOGS              📊 METRICS            🔍 TRACES         │
│  Что произошло?       Как система себя      Путь запроса      │
│  Структурированные    чувствует?             через сервисы     │
│  события с            CPU, RAM, RPS,         Request ID        │
│  контекстом           Error Rate, P99        от Browser → API  │
│                                              → DB              │
└────────────────────────────────────────────────────────────────┘
```

**Для MVP:** Нужны Logs + базовые Metrics. Traces — post-MVP (нужны при микросервисах или сложных флоу).

---

## 3. Карта инструментов рынка 2025-2026

### По категориям и бюджету

```
FREE ──────────────────────────────────────────── EXPENSIVE

ERROR TRACKING:
[Sentry free]──────[Sentry Team $26/mo]──────[Datadog ~$100+]

LOGGING:
[CloudWatch*]──[Grafana Cloud free]──[BetterStack $24]──[Datadog $15+/GB]

USER ANALYTICS:
[GA4 free]──[PostHog free 1M]──[Mixpanel free 20M]──[Amplitude $$$]

SESSION RECORDING:
[MS Clarity free]──────────────────────────[LogRocket $99]──[FullStory $$$]

INFRASTRUCTURE:
[CloudWatch*]──[Grafana Cloud free]──[New Relic free]──[Datadog $$$]

UPTIME:
[UptimeRobot free]──[BetterUptime $20]──[PagerDuty $$$]

* CloudWatch включён в AWS, но платишь за хранение
```

---

## 4. Детальное сравнение: Error Tracking

### Что это даёт

Когда у пользователя возникает исключение в коде (500 error в API, JS error во фронте) — автоматически:
- Захватывается полный stack trace
- Запись в базе ошибок с контекстом (URL, user, browser, OS)
- Уведомление в Slack / Email
- Группировка одинаковых ошибок
- Отслеживание "is this resolved?"

### Сравнительная таблица

| Инструмент | Free Tier | Платный (start) | Рынок | NestJS | Next.js | Особенности |
|---|---|---|---|---|---|---|
| **Sentry** | 5k ошибок/мес, 1 user | $26/мес (Team, 50k) | 🏆 Лидер | ✅ Официальный SDK | ✅ Official Next.js SDK | Session Replay (free tier: 50) |
| **Bugsnag** | 7,500 ошибок/мес | $59/мес | Популярный | ✅ SDK | ✅ SDK | Хорошая группировка ошибок |
| **Rollbar** | 5,000 ошибок/мес | $19/мес (500 вхождений/мин) | Средний | ✅ SDK | ✅ SDK | Real-time notifications |
| **Datadog APM** | нет | ~$100+/мес | Энтерпрайз | ✅ | ✅ | Комплексное решение, дорогое |
| **AWS CloudWatch** | Free tier (5GB logs) | ~$0.10/1k ошибок | AWS-native | ✅ через Logger | ✅ | Не специализированное |

### Победитель для нашего проекта: **Sentry**

**Почему:**
- Самый популярный инструмент в экосистеме (GitHub: 37k stars)
- Официальные SDK для NestJS и Next.js App Router
- Free tier 5k ошибок/месяц — достаточно для MVP (при хорошем коде)
- Session replay бесплатно (50 сессий/месяц) — можно увидеть что делал пользователь перед ошибкой
- Performance monitoring включён в free tier
- Один инструмент для frontend + backend

---

## 5. Детальное сравнение: Логирование (Backend)

### Что это даёт

Структурированные логи — это JSON-объекты с контекстом, не просто `console.log`:
```json
{
  "level": "error",
  "timestamp": "2026-03-23T12:34:56Z",
  "requestId": "req-abc123",
  "userId": "user-xyz",
  "method": "POST",
  "path": "/api/orders",
  "statusCode": 500,
  "duration": 234,
  "message": "Failed to create order",
  "error": "Unique constraint violation on 'Order.stripeId'"
}
```

Такой лог позволяет: найти все запросы конкретного пользователя, все медленные запросы, все ошибки за период.

### Форматы логов: Winston vs Pino

| | Winston | Pino |
|---|---|---|
| Популярность | ⭐⭐⭐⭐⭐ NestJS стандарт | ⭐⭐⭐⭐ Популярен в Node.js |
| Производительность | Средняя | Очень высокая (5x быстрее) |
| NestJS интеграция | `nest-winston` официально | `nestjs-pino` |
| JSON output | ✅ | ✅ |
| Transports (CloudWatch, Datadog) | Много готовых | Меньше, но есть |
| Рекомендация | Для большинства | При высокой нагрузке |

**Выбор: Winston** — стандарт для NestJS, достаточно для нашего масштаба.

### Куда отправлять логи: сравнение

| Инструмент | Free Tier | Платный | Поиск | Алерты | AWS | Особенности |
|---|---|---|---|---|---|---|
| **AWS CloudWatch Logs** | 5GB ingestion/мес (free tier), затем $0.50/GB | $0.50/GB ingestion + $0.03/GB хранение | Через CloudWatch Insights | ✅ через Alarms | 🔒 Native | Уже на AWS — дополнительной инфры не нужно |
| **Grafana Cloud** | 50GB логов/мес, 14 дней хранения | От $0 (pay-as-you-go) | ✅ LogQL | ✅ | ✅ Loki agent | Очень generous free tier |
| **BetterStack (Logtail)** | 1GB/мес, 3 дня | $24/мес (10GB, 30 дней) | ✅ Отличный UI | ✅ | через HTTP | Лучший UX для поиска логов |
| **Datadog Logs** | нет | $0.10/GB (~$15+/мес) | ✅ Excellent | ✅ | ✅ Agent | Дорогой, но мощный |
| **New Relic** | 100GB/мес data (!), 8 дней | $0.30/GB beyond | ✅ NRQL | ✅ | ✅ | Очень generous free tier в 2024+ |
| **Papertrail** | 50MB/день, 7 дней | $7/мес (1GB/day) | ✅ | ✅ | через syslog | Простой, дешёвый |

### Победитель для нашего проекта: **AWS CloudWatch** (старт) → **Grafana Cloud** (рост)

**Почему CloudWatch на старте:**
- Уже включён в AWS инфраструктуру (ECS Fargate автоматически отправляет логи в CloudWatch)
- Никаких дополнительных агентов и настроек
- Free tier 5GB/месяц — хватает на первые месяцы
- CloudWatch Insights для SQL-like запросов по логам

**Почему Grafana Cloud при росте:**
- 50GB free логов/месяц с 14-дневным хранением
- Единая платформа для логов (Loki) + метрик (Prometheus) + дашбордов
- Open-source основа → нет vendor lock-in
- Loki — минимальная индексация (дешевле Elasticsearch)

---

## 6. Детальное сравнение: User Analytics & Session Recording

### Два разных инструмента

**Продуктовая аналитика (PostHog / Mixpanel):** Что делают пользователи, воронки конверсии, retention, A/B тесты.

**Сессионные записи (Clarity / LogRocket):** Буквально видео того что делал пользователь — куда кликал, как скроллил, где завис.

### Продуктовая аналитика

| Инструмент | Free Tier | Платный | Self-host | Особенности |
|---|---|---|---|---|
| **PostHog** | 1M events/мес (!), 15k сессий | $0-450/мес (usage-based) | ✅ Docker | Все фичи: funnels, heatmaps, session replay, A/B тесты, feature flags. Open-source |
| **Mixpanel** | 20M events/мес (!!) | $28/мес (200M) | ❌ | Лучшие фичи retention/cohort анализа |
| **Amplitude** | 10M events/мес | $0-custom | ❌ | Продукт-ориентированная аналитика, сложнее |
| **GA4** | Бесплатно | Бесплатно (GA4 360 = $$$) | ❌ | Google интеграция, e-commerce tracking, Google Ads |

### Сессионные записи / Тепловые карты

| Инструмент | Free Tier | Платный | Особенности |
|---|---|---|---|
| **Microsoft Clarity** | ∞ бесплатно (!!) | — | Сессии, heatmaps, scroll maps. Нет лимитов. От Microsoft |
| **PostHog Session Replay** | 15k сессий/мес | В платном плане | Встроено в PostHog |
| **Hotjar** | 35 daily sessions | $39/мес | Пионер heatmaps, дорого |
| **LogRocket** | 1k сессий/мес | $99/мес | Лучшее качество записей + DevTools |
| **FullStory** | — | $$$-enterprise | Enterprise, дорого |

### Победитель: **PostHog + MS Clarity + GA4** (все бесплатно)

**Связка:**
- **GA4** — обязательно (Google Search Console, Google Ads, бесплатно)
- **PostHog** — product analytics, funnels, feature flags, A/B тесты (бесплатно до 1M events)
- **Microsoft Clarity** — session recordings, heatmaps (бесплатно, безлимитно)

Эта связка стоит $0 и покрывает 90% потребностей магазина.

---

## 7. Детальное сравнение: Infrastructure Monitoring

### Что мониторировать

- CPU / Memory ECS Fargate tasks
- RDS PostgreSQL: connections, query latency, storage
- ALB: request count, 5xx errors, latency
- API response times (P50, P95, P99)

### Инструменты

| Инструмент | Free Tier | Платный | Сложность setup | AWS-native |
|---|---|---|---|---|
| **AWS CloudWatch** | Базовые метрики EC2/RDS включены | $0.30/metric/мес beyond free | Низкая (встроено) | 🔒 Native |
| **Grafana Cloud** | 10k metrics series, 14 дней | Pay-as-you-go | Средняя | ✅ AWS agent |
| **New Relic** | 100GB data/мес, 1 пользователь | $49/мес+user | Средняя | ✅ AWS integration |
| **Datadog** | нет | ~$15-23/host/мес | Высокая | ✅ AWS integration |
| **Prometheus + Grafana** | Self-hosted = $0 | Инфра расходы | Высокая (ops overhead) | ✅ | Золотой стандарт, но нужен DevOps |

### Победитель: **AWS CloudWatch** (старт) → **Grafana Cloud** (рост)

AWS CloudWatch на старте:
- Встроен, ничего настраивать не нужно
- RDS, ECS, ALB метрики автоматически
- CloudWatch Alarms → SNS → Email/SMS при проблемах

---

## 8. Детальное сравнение: Uptime Monitoring

Упрощённо: ping your site every 5 minutes, alert if down.

| Инструмент | Free Tier | Платный | Features |
|---|---|---|---|
| **UptimeRobot** | 50 monitors, 5-min intervals | $7/мес (50 monitors, 1-min) | Email/SMS/Slack alerts, status page |
| **BetterUptime** | 10 monitors | $20/мес | On-call schedules, incident management |
| **StatusCake** | 10 monitors, 5-min | $24/мес | SSL monitoring, page speed |
| **Freshping** | 50 monitors, 1-min (!!) | $14/мес | Generous free tier |
| **AWS CloudWatch** | через Synthetic Canaries | $0.0012/run | AWS-native, scripted checks |

### Победитель: **UptimeRobot** (free tier достаточно для MVP)

---

## 9. AWS-нативный стек

Если всё на AWS — можно обойтись почти только AWS-сервисами:

| Потребность | AWS Решение | Цена | Ограничения |
|---|---|---|---|
| Логи | CloudWatch Logs | ~$0.50/GB | Поиск неудобный |
| Метрики | CloudWatch Metrics | Базовые бесплатно | Ограниченная кастомизация |
| Алерты | CloudWatch Alarms → SNS | ~$0.50/1M notifications | |
| Трейсинг | AWS X-Ray | $5/1M traces | Хорошо для AWS-internal |
| Uptime | CloudWatch Synthetics | $0.0012/run | Надо скриптовать |
| RDS Performance | RDS Performance Insights | Бесплатно для t3.micro | Только DB |
| Error tracking | ❌ нет | — | Нужен Sentry |
| User analytics | ❌ нет | — | Нужен PostHog/GA4 |

**Плюс AWS-стека:**
- Нет дополнительных интеграций
- IAM для безопасности
- Данные не выходят из AWS (compliance)

**Минус:**
- CloudWatch дорожает при масштабировании (метрики $0.30/штуку)
- Нет хорошего error tracking
- Нет user analytics
- UX для поиска логов — слабее чем Grafana/BetterStack

---

## 10. Рекомендуемый стек: $0 старт

> Для первых 6-12 месяцев, до ~$5k MRR

```
┌─────────────────────────────────────────────────────────────┐
│  $0 OBSERVABILITY STACK                                     │
│                                                             │
│  Error Tracking:        Sentry (free: 5k errors/мес)       │
│  Logging Backend:       Winston → AWS CloudWatch Logs       │
│  Logging DB:            RDS Performance Insights (free)     │
│  Logging Frontend:      Sentry (same SDK)                   │
│  User Analytics:        PostHog (free: 1M events/мес)      │
│  Session Recording:     Microsoft Clarity (free, unlimited) │
│  GA4:                   Google Analytics 4 (free)           │
│  Infrastructure:        AWS CloudWatch (included in AWS)    │
│  Uptime:                UptimeRobot (free: 50 monitors)     │
│                                                             │
│  ДОПОЛНИТЕЛЬНЫЕ РАСХОДЫ: ~$0/мес                           │
│  (CloudWatch: ~$1-3/мес при малом объёме)                  │
└─────────────────────────────────────────────────────────────┘
```

### Что эта связка даёт

- Видишь ВСЕ ошибки в frontend и backend (Sentry)
- Видишь медленные страницы и API (Sentry Performance)
- Видишь где покупатели уходят из воронки (PostHog Funnels)
- Видишь записи сессий — что делал пользователь (Clarity)
- Видишь трафик из Google, конверсии (GA4)
- Видишь метрики CPU/RAM/DB (CloudWatch)
- Оповещение если сайт упал (UptimeRobot → email)
- Общие расходы: ~$0-3/мес

---

## 11. Рекомендуемый стек: $1k–5k MRR

> После product-market fit, когда есть первые реальные продажи

```
┌─────────────────────────────────────────────────────────────┐
│  $50-80/МЕС OBSERVABILITY STACK                             │
│                                                             │
│  Error Tracking:    Sentry Team ($26/мес, 50k errors)      │
│  Logging:           Grafana Cloud (free 50GB/мес!)         │
│                     + Grafana Loki agent на ECS             │
│  User Analytics:    PostHog (free / $0-20/мес)             │
│  Session Recording: Microsoft Clarity (free)                │
│  GA4:               Free                                    │
│  Infrastructure:    Grafana Cloud + CloudWatch              │
│  Uptime:            BetterUptime ($20/мес) — on-call       │
│                                                             │
│  ДОПОЛНИТЕЛЬНЫЕ РАСХОДЫ: ~$46-66/мес                       │
└─────────────────────────────────────────────────────────────┘
```

### Что добавляется

- Grafana Cloud: единый дашборд для логов + метрик + алертов
- Sentry Team: больше квота, team collaboration, release tracking
- BetterUptime: on-call rotation (критично когда магазин приносит деньги)

---

## 12. Рекомендуемый стек: $10k+ MRR

> При стабильном росте, когда observability влияет на retention

```
┌─────────────────────────────────────────────────────────────┐
│  $200-400/МЕС OBSERVABILITY STACK                           │
│                                                             │
│  Error Tracking:    Sentry Business ($80/мес)              │
│  Logging:           Grafana Cloud Pro ($50/мес)            │
│                     или BetterStack ($24+/мес)              │
│  APM / Tracing:     New Relic ($49/мес) или Grafana Tempo  │
│  User Analytics:    PostHog ($0-50/мес)                    │
│  Session Recording: LogRocket ($99/мес) — лучшее качество  │
│                     или Microsoft Clarity (free)            │
│  Infrastructure:    Grafana Cloud + CloudWatch              │
│  Uptime + On-call:  PagerDuty ($21/user/мес)               │
│                                                             │
│  ДОПОЛНИТЕЛЬНЫЕ РАСХОДЫ: ~$300-500/мес                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 13. Что собирать о пользователях для маркетинга

### Данные из сессий (без регистрации)

| Событие | Инструмент | Зачем |
|---|---|---|
| Страница входа (UTM source/medium/campaign) | GA4 + PostHog | Attribution: откуда пришёл покупатель |
| Просмотренные продукты | PostHog | Recommend похожие, ретаргетинг |
| Время на странице | Clarity | Интерес к контенту |
| Куда кликает и где уходит | Clarity | UX улучшения |
| Search queries | PostHog | Какие товары ищут но не находят |
| Add to cart (без покупки) | PostHog + GA4 | Abandoned cart email (Klaviyo) |
| Checkout start → abandonment | PostHog Funnels | Где теряем конверсию |
| Device / Browser / OS | GA4 | Mobile-first оптимизация |
| Geographic location (страна/штат) | GA4 | Таргетинг, доставка |

### Данные при регистрации и заказах

| Данные | Когда собирать | Зачем |
|---|---|---|
| Email | Регистрация / Guest checkout | Email маркетинг (Klaviyo) |
| Дата первого заказа | Автоматически | "Happy 1-year anniversary" email |
| Сумма заказов (LTV) | Автоматически | Сегментация: VIP клиенты |
| Категории купленных товаров | Автоматически | Cross-sell рекомендации |
| День рождения (опционально) | Account settings | Birthday coupon |
| Откуда пришёл первый раз | UTM параметры + cookie | Attribution: Pinterest vs Google |
| Количество посещений до покупки | PostHog | Сколько "прогревов" нужно |

### Данные которые НЕЛЬЗЯ собирать (GDPR/CCPA)

- ❌ Полный IP адрес без согласия
- ❌ Device fingerprinting без согласия
- ❌ Sharing data с third parties без явного opt-in
- ❌ Tracking детей (< 13 лет)

**Cookie consent banner обязателен** (Issue #107) — перед GA4/PostHog/Pixel должно быть согласие.

---

## 14. Timeline внедрения

### До MVP (сейчас)

- [x] Заложить структуру логирования в NestJS (Winston, см. docs/14_LOGGING.md)
- [ ] Добавить Sentry в Next.js и NestJS
- [ ] Подключить GA4 (tracking code в layout.tsx)
- [ ] CloudWatch Logs — автоматически с ECS Fargate

### При запуске MVP

- [ ] PostHog — tracking key events (add_to_cart, purchase, page_view)
- [ ] Microsoft Clarity — session recording
- [ ] UptimeRobot — мониторинг uptime
- [ ] CloudWatch Alarm — если CPU > 80% или 5xx > 10/мин
- [ ] Facebook Pixel (#94) — для будущих FB/Instagram реклам

### После первых продаж ($1k+ MRR)

- [ ] Klaviyo — abandoned cart emails (окупается за 1 неделю)
- [ ] PostHog Funnels — анализ где теряем конверсию
- [ ] Sentry Team upgrade (если > 5k ошибок/мес)
- [ ] Grafana Cloud — если CloudWatch становится дорогим

### При масштабировании ($10k+ MRR)

- [ ] LogRocket или продолжать Clarity
- [ ] BetterUptime с on-call rotation
- [ ] New Relic или Datadog APM
- [ ] Full distributed tracing
