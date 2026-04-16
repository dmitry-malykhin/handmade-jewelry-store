# Neon Database Branching — Safe Migration Testing

Безопасное тестирование Prisma миграций перед применением на production.

**Время настройки:** ~1 час  
**Стоимость:** $0/месяц (free tier: 3 ветки, 512 MB)  
**Результат:** staging ветка БД для тестирования миграций без риска для prod данных

---

## Зачем

Prisma миграция на production — самый опасный момент деплоя. Neon позволяет создать **ветку базы данных** (как git branch) — мгновенная копия prod данных. Прогоняешь миграцию на ветке, убеждаешься что всё ок, применяешь на prod.

---

## Шаг 1 — Создать аккаунт и проект

1. Зайди на **neon.tech** → Sign up (бесплатно)
2. **Create Project**:
   - Name: `handmade-jewelry-store`
   - Region: `US East (Ohio)` — ближе к AWS us-east-1
   - Postgres Version: 16
3. Скопируй **connection string** → сохрани в менеджер паролей

---

## Шаг 2 — Установить Neon CLI

```bash
npm install -g neonctl
neonctl auth
```

---

## Шаг 3 — Создать staging ветку

```bash
# Посмотреть project ID
neonctl projects list

# Создать staging ветку (копия prod данных за секунды)
neonctl branches create --name staging --project-id <your-project-id>

# Получить connection string для staging ветки
neonctl connection-string --branch staging --project-id <your-project-id>
```

---

## Шаг 4 — Workflow при каждой миграции

### Перед деструктивной миграцией (DROP, RENAME, ALTER TYPE)

```bash
# 1. Обновить staging ветку (пересоздать с актуальными prod данными)
neonctl branches reset staging --parent --project-id <your-project-id>

# 2. Тестировать миграцию на staging
DATABASE_URL=$(neonctl connection-string --branch staging --project-id <id>) \
  pnpm --filter api prisma migrate deploy

# 3. Проверить что данные целы
DATABASE_URL=$(neonctl connection-string --branch staging --project-id <id>) \
  pnpm --filter api prisma studio

# 4. Если всё ок — применить на prod
DATABASE_URL=<prod-connection-string> \
  pnpm --filter api prisma migrate deploy
```

### Для безопасных миграций (ADD COLUMN, CREATE TABLE)

Можно применять сразу на prod — нет риска потери данных.

---

## Шаг 5 — Подключить к Fly.io staging

В Fly.io secrets установить connection string от staging ветки:

```bash
fly secrets set \
  DATABASE_URL=$(neonctl connection-string --branch staging --project-id <id>) \
  --app handmade-jewelry-api-staging
```

---

## Полезные команды

```bash
# Список веток
neonctl branches list --project-id <id>

# Удалить ветку
neonctl branches delete staging --project-id <id>

# Пересоздать ветку с актуальными prod данными
neonctl branches reset staging --parent --project-id <id>
```

---

## Free tier лимиты

| Ресурс | Лимит |
|--------|-------|
| Ветки | 10 |
| Storage | 512 MB |
| Compute hours | 191.9 часов/мес |
| Проекты | 1 |

Для staging одного магазина — хватит навсегда.
