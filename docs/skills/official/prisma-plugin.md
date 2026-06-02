# prisma (plugin)

**Priority:** P0.

## Что делает

Прямая работа с Prisma:
- Чтение/правка `schema.prisma` через MCP
- Создание миграций (`prisma migrate dev`)
- Запросы к БД (read-only по дефолту)
- Объяснение query plans
- Diff между схемой и БД (`prisma db pull`/`prisma db push`)

Подключает Prisma MCP server + skills для типичных задач (add field, add relation, add enum).

## Установка

```bash
/plugin install prisma@claude-plugins-official --scope project
```

Никаких env vars — плагин читает `DATABASE_URL` из `apps/api/.env`.

## Что появляется

Skills (зависит от текущей версии плагина):
- `/prisma:add-field <model> <field> <type>` — добавить поле + миграция
- `/prisma:add-relation <from> <to>` — добавить связь
- `/prisma:explain <query>` — план запроса

MCP-инструменты:
- `prisma.query` — read-only SQL
- `prisma.migrate` — генерация миграции (Claude всё равно показывает diff перед apply)

## Когда применять

- **W4 — Issues #116, #112** (order status enum + product dimensions).
  Пример: `/prisma:add-field Order productionDays Int?`
- **W5 — Cart/Orders schema** — массовое добавление полей
- Любое изменение `schema.prisma`

## Интеграция с custom skill

Должен использоваться совместно с custom [prisma-migrate-safe.md](../custom/prisma-migrate-safe.md), который добавляет:
- Запрет drop/rename без `-- backfill` комментария
- Проверку синхронизации `OrderStatus` enum ↔ `order-status.transitions.ts`
- Обновление seed после изменений

`prisma-migrate-safe` запускается **поверх** `prisma` plugin.

## Trade-offs

- `prisma.migrate` запускает реальные миграции — критично, чтобы это происходило только в dev/staging
- В production миграции применяются через CI (`prisma migrate deploy`), плагин для этого не нужен
- MCP query инструмент по умолчанию имеет write-access если `DATABASE_URL` — admin user. Использовать с PostgresMCP read-only ролью для безопасности

## Конфигурация для read-only режима

В `.claude/settings.json`:

```json
{
  "permissions": {
    "deny": [
      "Bash(npx prisma migrate reset:*)",
      "Bash(npx prisma db push --accept-data-loss:*)",
      "Bash(npx prisma db execute --file=/etc/*)"
    ]
  }
}
```

— блокирует destructive команды по умолчанию.

## Источник

- https://code.claude.com/docs/en/discover-plugins
- https://www.prisma.io/blog/prisma-mcp-server
