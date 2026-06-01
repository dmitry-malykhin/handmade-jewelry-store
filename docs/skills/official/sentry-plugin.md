# sentry (plugin)

**Priority:** P1 — после W9 (когда Sentry будет подключён к API и web).

## Что делает

Доступ к production Sentry issues/events во время отладки:
- Чтение последних issues по проекту
- Stack traces с source maps
- Поиск похожих ошибок
- Группировка по release/environment
- Связь issue ↔ commit (через release tagging)

## Установка

```bash
/plugin install sentry@claude-plugins-official --scope project
```

Auth:

```bash
# Auth token: https://sentry.io/settings/account/api/auth-tokens/
#   Scopes: event:read, project:read, org:read
security add-generic-password -a sentry-mcp -s claude-mcp -w "..."
```

## Использование

Активируется когда:
- Sentry alert приходит на почту/Slack
- Юзер пишет "проверь почему 500 на /api/orders в продакшене"
- В CI failing test упоминает Sentry issue ID

Примеры:

```
Покажи последние 5 issues в проекте handmade-jewelry-api за сегодня
```

```
SENTRY-API-42 — что произошло, какой stack trace, какой релиз
```

```
Найди похожие issues на "Cannot read property 'currency' of undefined" в orders/
```

## Когда ставить

После W9 (#88 — Sentry интеграция). До этого момента плагин подключать бесполезно — проектов в Sentry ещё нет.

## Интеграция с custom skills

- `ecs-deploy-debug` (custom) использует Sentry MCP параллельно с CloudWatch logs — корреляция production-инцидента с deploy
- `code-review --high` после merge'a — авто-проверка не появились ли новые Sentry issues с тегом текущего release

## Trade-offs

- Auth token имеет read-only по `event:read`, но `project:read` + `org:read` даёт visibility во ВСЕ проекты org'a. Для multi-tenant org — risk
- Соответственно — отдельный Sentry org для пет-проекта рекомендован

## Источник

- https://code.claude.com/docs/en/discover-plugins
- https://docs.sentry.io/product/integrations/integration-platform/
