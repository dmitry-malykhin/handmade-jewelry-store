# UptimeRobot Setup — Uptime Monitoring

Настройка мониторинга доступности API, фронтенда и критических путей.

**Время настройки:** ~30 минут  
**Стоимость:** $0/месяц (free tier: 50 мониторов, 5-минутный интервал)  
**Результат:** email/Telegram алерт в течение 5 минут если сайт или API упали

---

## Prerequisite — Health endpoint

Уже реализован в #88:
- `GET /api/health` — возвращает 200 если API и DB живы, 503 если DB недоступна
- Без авторизации — UptimeRobot может пинговать без токена

Проверить локально:
```bash
curl http://localhost:4000/api/health
# → {"status":"ok","info":{"database":{"status":"up"}},...}
```

---

## Шаг 1 — Создать аккаунт

1. Зайди на **uptimerobot.com** → Sign up (бесплатно, без карты)
2. Подтверди email

---

## Шаг 2 — Добавить мониторы

### Monitor 1: API Health (Critical)

1. Dashboard → **+ Add New Monitor**
2. Monitor Type: **HTTP(s)**
3. Friendly Name: `jewelry-api — health`
4. URL: `https://api.jewelry-store.com/api/health`
5. Monitoring Interval: **5 minutes**
6. Alert Contacts: выбрать email (добавится автоматически)
7. Save

### Monitor 2: Frontend Homepage

1. **+ Add New Monitor**
2. Monitor Type: **HTTP(s)**
3. Friendly Name: `jewelry-web — homepage`
4. URL: `https://jewelry-store.com`
5. Monitoring Interval: **5 minutes**
6. Save

### Monitor 3: Checkout (Critical path)

1. **+ Add New Monitor**
2. Monitor Type: **HTTP(s)**
3. Friendly Name: `jewelry-web — cart`
4. URL: `https://jewelry-store.com/cart`
5. Monitoring Interval: **5 minutes**
6. Save

---

## Шаг 3 — Подключить Telegram алерты

Если Telegram бот уже настроен (см. `docs/runbooks/telegram-alerts-setup.md`):

1. **My Settings** → **Alert Contacts** → **Add Alert Contact**
2. Alert Contact Type: **Telegram**
3. Bot Token: вставь токен бота
4. Chat ID: вставь свой chat_id
5. Friendly Name: `Telegram — Jewelry Alerts`
6. Save → придёт тестовое сообщение

### Привязать Telegram ко всем мониторам

Для каждого монитора:
1. Edit monitor → Alert Contacts → добавить `Telegram — Jewelry Alerts`
2. Save

---

## Шаг 4 — Создать Status Page

Публичная страница с историей uptime — trust signal для покупателей.

1. **My Settings** → **Status Pages** → **Add Status Page**
2. Friendly Name: `Jewelry Store Status`
3. Custom Domain: `status.jewelry-store.com` (опционально, нужен CNAME запись)
4. Monitors: добавить все 3 монитора
5. Save

Если без custom domain — UptimeRobot даст URL вида `stats.uptimerobot.com/xxxxx`.

---

## Шаг 5 — Проверить алерты

1. Для каждого монитора нажми **Edit** → **Send Test Alert**
2. Проверь что пришёл email
3. Проверь что пришло сообщение в Telegram (если подключён)

---

## Итоговая конфигурация

| Монитор | URL | Тип | Интервал |
|---------|-----|-----|----------|
| API Health | `https://api.jewelry-store.com/api/health` | HTTP(s) | 5 мин |
| Frontend | `https://jewelry-store.com` | HTTP(s) | 5 мин |
| Cart | `https://jewelry-store.com/cart` | HTTP(s) | 5 мин |

**Alert Contacts:** Email + Telegram

---

## Примеры алертов

**Сайт упал:**
```
Monitor is DOWN: jewelry-api — health
URL: https://api.jewelry-store.com/api/health
Reason: Connection Timeout
Date/Time: 2026-04-16 12:30:00 UTC
```

**Сайт восстановился:**
```
Monitor is UP: jewelry-api — health
URL: https://api.jewelry-store.com/api/health
Duration: 3 minutes
Date/Time: 2026-04-16 12:33:00 UTC
```

---

## Troubleshooting

**Монитор показывает DOWN но сайт работает:**
- Проверь что URL корректный (включая `/api/health`, не просто `/health`)
- Проверь что сервер отвечает 200 (не 301 redirect)
- Проверь что нет IP-блокировки для UptimeRobot (их IP ranges в документации)

**Health endpoint возвращает 503:**
- База данных недоступна — проверь RDS/Neon статус
- Проверь connection string в переменных окружения
