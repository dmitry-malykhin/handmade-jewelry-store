# MCP Servers — конфигурация

MCP (Model Context Protocol) server — внешний процесс, дающий Claude доступ к API/БД/файлам. Уже подключены: `figma`, `atlassian`.

Этот документ — рекомендованные дополнительные MCP для проекта.

---

## 1. GitHub MCP (P0)

**Что даёт.** Чтение/правка issues #62-#129, PR review, поиск кода — без выхода в `gh` shell.

```bash
# 1. Создать PAT: https://github.com/settings/tokens
#    Scopes: repo, workflow, read:org
# 2. Сохранить в keychain:
security add-generic-password -a github-mcp -s claude-mcp -w <YOUR_TOKEN>

# 3. Подключить
claude mcp add github \
  -e GITHUB_PERSONAL_ACCESS_TOKEN="$(security find-generic-password -a github-mcp -w)" \
  -- npx -y @modelcontextprotocol/server-github
```

**Альтернатива** — official `github` plugin (см. [official/github-plugin.md](official/github-plugin.md)), который сам поднимает этот MCP. Использовать одно из двух, не оба.

---

## 2. Postgres MCP (P0)

**Что даёт.** Read-only запросы к локальной/staging БД во время отладки. Объяснение query plans. Проверка миграций.

```bash
# Создать read-only роль (один раз)
psql -d jewelry_dev -c "CREATE USER claude_reader WITH PASSWORD 'reader' LOGIN;"
psql -d jewelry_dev -c "GRANT CONNECT ON DATABASE jewelry_dev TO claude_reader;"
psql -d jewelry_dev -c "GRANT USAGE ON SCHEMA public TO claude_reader;"
psql -d jewelry_dev -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO claude_reader;"
psql -d jewelry_dev -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO claude_reader;"

# Подключить MCP
claude mcp add postgres \
  -- npx -y @modelcontextprotocol/server-postgres \
  "postgresql://claude_reader:reader@localhost:5432/jewelry_dev"
```

**Критично:** read-only роль. Никогда не давать write-доступ к БД через MCP — Claude не должен мочь делать `DELETE` ad-hoc.

---

## 3. Stripe MCP (P0)

Подключается автоматически вместе с `stripe` plugin (см. [official/stripe-plugin.md](official/stripe-plugin.md)).

Если ставить вручную:

```bash
# Test mode!
claude mcp add stripe \
  -e STRIPE_SECRET_KEY="sk_test_..." \
  -- npx -y @stripe/mcp --tools=all
```

**Что даёт.** Создание test products/prices/customers/payment intents. Особенно полезно для BNPL отладки (Klarna/Afterpay) — флоу сложно тестировать без MCP.

**Безопасность.** Никогда не подключать production secret key. Если случайно — `claude mcp remove stripe` + ротация ключа в dashboard.

---

## 4. Sentry MCP (P1 — после W9)

**Что даёт.** Подтягивает свежие issues/events во время отладки production-багов.

```bash
# 1. Создать auth token: https://sentry.io/settings/account/api/auth-tokens/
#    Scopes: event:read, project:read, org:read
claude mcp add sentry \
  -e SENTRY_AUTH_TOKEN="..." \
  -e SENTRY_ORG="handmade-jewelry" \
  -- npx -y @sentry/mcp-server
```

Полезен после Issue #88 (Sentry интеграция в W9).

---

## 5. AWS MCP — CloudWatch Logs (P1 — после W9)

**Что даёт.** Чтение CloudWatch logs, describe ECS services, S3 listings без CLI permission-prompts.

```bash
# Использовать AWS profile (не root keys!)
claude mcp add aws-cw \
  -e AWS_PROFILE=handmade-jewelry \
  -e AWS_REGION=us-east-1 \
  -- uvx awslabs.cloudwatch-logs-mcp-server

claude mcp add aws-ecs \
  -e AWS_PROFILE=handmade-jewelry \
  -e AWS_REGION=us-east-1 \
  -- uvx awslabs.ecs-mcp-server
```

Подключать после первого production-инцидента, иначе пустое потребление контекста.

---

## 6. Playwright MCP (P2)

**Что даёт.** Browser automation, скриншоты, Lighthouse-style audits — Claude может сам открыть страницу и проверить.

```bash
claude mcp add playwright \
  -- npx -y @playwright/mcp
```

**Альтернатива** — `chrome-devtools-mcp` plugin (см. [official/chrome-devtools-mcp.md](official/chrome-devtools-mcp.md)). Часто его достаточно — Playwright MCP пригождается только для расширенных сценариев (multi-page flows, multiple browsers).

---

## Уже подключённые (для справки)

### Figma MCP

Загружен. Подробности в системном промпте Figma:
- `get_design_context`, `get_screenshot`, `get_metadata`, `get_figjam` — чтение
- `use_figma`, `generate_figma_design`, `create_new_file`, `upload_assets` — запись
- `get_code_connect_map`, `add_code_connect_map` — bridge

Использовать с custom skill [custom/figma-to-shadcn.md](custom/figma-to-shadcn.md).

### Atlassian MCP

Confluence + Jira. Не критично для текущей фазы — issues живут в GitHub. Может пригодиться если перейдём на Jira для product management.

---

## Команды управления

```bash
# Список
claude mcp list

# Удалить
claude mcp remove <name>

# Reset auth (если "needs auth" заело)
rm ~/.claude/mcp-needs-auth-cache.json
# или конкретно для одного:
cat ~/.claude/mcp-needs-auth-cache.json | jq 'del(.[$NAME])' | tee ~/.claude/mcp-needs-auth-cache.json
```

---

## Сравнительная таблица: MCP vs Plugin vs CLI

Когда что использовать:

| Задача | Лучший инструмент |
| --- | --- |
| Read GitHub issues | `github` plugin или MCP |
| Open PR draft | `gh pr create` (CLI) — Claude всё равно его использует |
| Query Postgres ad-hoc | Postgres MCP |
| Migrate DB schema | `prisma` plugin / pnpm scripts |
| List Stripe products | Stripe MCP |
| Reverse-engineer payment intent | Stripe MCP |
| Read CloudWatch logs | AWS MCP / `aws` CLI |
| Trigger deploy | `gh workflow run` CLI |
| Check Sentry recent issues | Sentry MCP |

**Правило большого пальца:** MCP — для интерактивной разведки во время диалога. CLI/plugin — для выполнения операций.

---

## Безопасность MCP

Те же правила что для скиллов (см. [security.md](security.md)):

1. **Только vendor-owned MCP серверы.** Anthropic-built, Microsoft (playwright), Sentry, Stripe, AWS Labs.
2. **Read-only credentials.** Postgres role с GRANT SELECT only. Stripe test mode. AWS profile с минимальным IAM.
3. **Никогда production secrets.** Если MCP запросил production credentials — это сигнал тревоги.
4. **Audit.** `~/.claude/mcp-needs-auth-cache.json` показывает к каким MCP идёт запрос аутентификации. Если незнакомый — удалить плагин.
