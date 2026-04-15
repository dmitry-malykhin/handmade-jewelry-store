# Telegram Alerts Setup — Sentry + UptimeRobot

Настройка мгновенных уведомлений об ошибках и даунтайме в Telegram.

**Время настройки:** ~2 часа  
**Стоимость:** $0/месяц  
**Результат:** все production алерты из Sentry (API + Web) и UptimeRobot приходят в Telegram

---

## Архитектура

```
Sentry jewelry-api   ──┐
                        ├──→ Make.com webhook → Telegram бот → твой чат
Sentry jewelry-web   ──┘

UptimeRobot ──────────────→ Telegram бот (нативная интеграция) → твой чат
```

---

## Шаг 1 — Создать Telegram бот

### 1.1 Создать бота через BotFather

1. Открой Telegram → найди **@BotFather**
2. Отправь `/newbot`
3. Имя бота: `Jewelry Store Alerts`
4. Username: `jewelry_store_alerts_bot` (придумай любой свободный, должен заканчиваться на `_bot`)
5. BotFather ответит токеном вида:
   ```
   7123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
6. **Сохрани токен в менеджер паролей** (1Password / Bitwarden)

### 1.2 Получить свой chat_id

1. Напиши боту любое сообщение (например `/start`)
2. Открой в браузере:
   ```
   https://api.telegram.org/bot<ТВОЙ_ТОКЕН>/getUpdates
   ```
3. В ответе найди `"chat":{"id": 123456789}` — это твой chat_id
4. Сохрани chat_id

### 1.3 Проверить что бот работает

Замени значения и открой в браузере:
```
https://api.telegram.org/bot<ТОКЕН>/sendMessage?chat_id=<CHAT_ID>&text=Jewelry+Store+bot+works!
```

Если пришло сообщение — бот готов.

---

## Шаг 2 — Подключить Sentry через Make.com

Make.com (бывший Integromat) — бесплатный tier: 1000 операций/месяц.  
Для алертов об ошибках этого хватит на годы при нормальном коде.

### 2.1 Создать аккаунт Make.com

1. Зайди на **make.com** → Sign up (бесплатно)
2. Create new scenario

### 2.2 Создать сценарий для jewelry-api

**Добавить модуль 1: Webhooks → Custom webhook**
1. Add module → Webhooks → Custom webhook
2. Add webhook → назови `sentry-jewelry-api`
3. Скопируй URL вида: `https://hook.eu1.make.com/xxxxx`

**Добавить модуль 2: Telegram → Send a message**
1. Add module → Telegram Bot → Send a message
2. Connection → Create connection → вставь токен бота
3. Chat ID: вставь свой chat_id
4. Text:
```
🔴 *[jewelry-api] Новая ошибка в production*

*{{1.data.issue.title}}*

`{{1.data.issue.culprit}}`

Частота: {{1.data.issue.count}} раз
→ {{1.data.issue.url}}
```
5. Parse Mode: `Markdown`

**Сохранить и активировать сценарий** (переключатель внизу в ON)

### 2.3 Подключить webhook в Sentry — jewelry-api

1. Sentry → **jewelry-api** → Settings → Integrations → **WebHooks**
2. Add to Project
3. Callback URLs: вставь URL от Make.com
4. Enable Plugin

**Создать Alert Rule:**
1. Sentry → jewelry-api → Alerts → Create Alert Rule
2. Set conditions:
   - When: `A new issue is created`
   - Filter: `The issue's environment is production`
   - Action: `Send a notification via an integration → WebHooks`
3. Rule name: `New production error → Telegram`
4. Save

### 2.4 Создать второй сценарий для jewelry-web

Повтори шаги 2.2–2.3 для проекта **jewelry-web**:
- Новый webhook в Make.com → `sentry-jewelry-web`
- Новый URL → подключить в Sentry jewelry-web

Текст сообщения:
```
🔴 *[jewelry-web] Новая ошибка в production*

*{{1.data.issue.title}}*

`{{1.data.issue.culprit}}`

Частота: {{1.data.issue.count}} раз
→ {{1.data.issue.url}}
```

---

## Шаг 3 — Подключить UptimeRobot

UptimeRobot имеет нативную интеграцию с Telegram — без Make.com.

### 3.1 Добавить Telegram в Alert Contacts

1. UptimeRobot → **My Settings** → Alert Contacts → Add Alert Contact
2. Alert Contact Type: **Telegram**
3. Bot Token: вставь токен бота
4. Chat ID: вставь свой chat_id
5. Friendly Name: `Telegram — Jewelry Alerts`
6. Save → придёт тестовое сообщение в Telegram

### 3.2 Привязать к мониторам

Для каждого монитора (API Health, Frontend, Checkout):
1. UptimeRobot → Monitors → Edit monitor
2. Alert Contacts → добавить `Telegram — Jewelry Alerts`
3. Save

---

## Шаг 4 — Проверить всё работает

### Тест Sentry → Telegram

В Sentry → jewelry-api → Issues → любой issue → Actions → **Send Test Notification**  
Через 5-10 секунд должно прийти сообщение в Telegram.

### Тест UptimeRobot → Telegram

UptimeRobot → Monitors → любой монитор → Edit → Alert Contacts → **Send Test Alert**

---

## Итоговые переменные для сохранения в менеджере паролей

```
Telegram Bot Token:  7123456789:AAFxxx...
Telegram Chat ID:    123456789
Make.com Webhook 1:  https://hook.eu1.make.com/xxx  (jewelry-api)
Make.com Webhook 2:  https://hook.eu1.make.com/yyy  (jewelry-web)
```

---

## Примеры сообщений

**Ошибка в production (Sentry):**
```
🔴 [jewelry-api] Новая ошибка в production

TypeError: Cannot read properties of undefined (reading 'id')
OrdersService.createOrder

Частота: 3 раза
→ https://sentry.io/organizations/handmade-jewelry-store/issues/123/
```

**Сайт упал (UptimeRobot):**
```
🔴 DOWNTIME ALERT

jewelry-api is DOWN
URL: https://api.jewelry-store.com/health
Reason: Connection timeout
Duration: Just started
```

**Сайт восстановился:**
```
✅ RECOVERY ALERT

jewelry-api is UP
Downtime duration: 3 minutes
```
