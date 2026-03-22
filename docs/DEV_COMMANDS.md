# Команды разработки — Handmade Jewelry Store

Все команды запускаются из **корня проекта** (`handmade-jewelry-store/`).

---

## Первый запуск (один раз на новой машине)

```bash
# 1. Установить зависимости
pnpm install

# 2. Скопировать файлы окружения
cp .env.example .env
cp apps/api/.env.example apps/api/.env   # ← заполнить значения!

# 3. Запустить PostgreSQL
pnpm db:up

# 4. Запустить весь проект
pnpm dev
```

---

## Запуск приложений

```bash
pnpm dev          # фронт + бэк одновременно (через Turborepo)
                  # → Next.js на http://localhost:3000
                  # → NestJS на http://localhost:4000

pnpm web:dev      # только фронтенд (Next.js, порт 3000)
pnpm api:dev      # только бэкенд (NestJS, порт 4000, hot-reload)
```

---

## База данных

```bash
pnpm db:up        # запустить PostgreSQL в Docker (нужен Docker Desktop)
pnpm db:down      # остановить PostgreSQL
pnpm db:logs      # смотреть логи PostgreSQL в реальном времени (Ctrl+C выйти)

pnpm db:generate  # сгенерировать Prisma клиент после изменения schema.prisma
pnpm db:migrate   # применить миграции (создать/изменить таблицы в БД)
pnpm db:studio    # открыть Prisma Studio — визуальный UI для просмотра данных
                  # → открывается на http://localhost:5555
```

> PostgreSQL должен быть запущен (`pnpm db:up`) перед запуском бэкенда.

---

## Тесты

```bash
# Бэкенд (NestJS + Jest)
pnpm api:test         # unit тесты — быстрые, без сервера
pnpm api:test:e2e     # E2E тесты — поднимает реальный HTTP сервер в памяти

# Фронтенд (Next.js + Vitest)
pnpm web:test         # unit + компонентные тесты
pnpm web:test:e2e     # Playwright тесты — открывает реальный браузер
```

---

## Качество кода

```bash
pnpm lint             # проверить код на ошибки (ESLint)
pnpm lint:fix         # исправить ошибки автоматически
pnpm format           # отформатировать все файлы (Prettier)
pnpm format:check     # только проверить форматирование (используется в CI)
```

---

## Сборка для production

```bash
pnpm build            # собрать фронт + бэк
pnpm api:build        # собрать только бэкенд → dist/
```

---

## Проверка что всё работает

После `pnpm db:up` и `pnpm api:dev`:

| URL | Что проверяет |
|-----|--------------|
| http://localhost:4000/api/health | Бэкенд запущен → `{"status":"ok"}` |
| http://localhost:3000 | Фронтенд запущен → главная страница |

---

## Структура .env файлов

```
handmade-jewelry-store/
├── .env              ← Docker Compose читает этот файл (только PostgreSQL)
└── apps/api/
    └── .env          ← NestJS читает этот файл (все настройки бэкенда)
```

Оба файла в `.gitignore` — не коммитятся. Шаблоны:
- `.env.example` — шаблон для корневого `.env`
- `apps/api/.env.example` — шаблон для api `.env`

---

## Порты

| Сервис | Порт | URL |
|--------|------|-----|
| Next.js (фронтенд) | 3000 | http://localhost:3000 |
| NestJS (бэкенд) | 4000 | http://localhost:4000 |
| PostgreSQL | 5432 | localhost:5432 |
| Prisma Studio | 5555 | http://localhost:5555 |
