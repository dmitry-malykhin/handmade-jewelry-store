# Installation Guide

Пошаговое внедрение skills/plugins/MCP в проект. Делать ровно в этом порядке.

---

## Шаг 0 — Проверить версию Claude Code

```bash
claude --version
```

Минимум — `2.1.154` (нужно для `/simplify` + новой системы плагинов).
Если ниже:

```bash
# macOS (Homebrew)
brew upgrade claude-code

# Manual
curl -fsSL https://claude.ai/install.sh | bash
```

---

## Шаг 1 — Базовые официальные plugins

Все ставятся одной командой через `/plugin install`:

```bash
# В сессии Claude Code:
/plugin install typescript-lsp@claude-plugins-official
/plugin install context7@claude-plugins-official
/plugin install github@claude-plugins-official
/plugin install prisma@claude-plugins-official
/plugin install stripe@claude-plugins-official
/plugin install superpowers@claude-plugins-official
```

После каждой команды Claude перезагрузит skill registry. Проверить установку:

```
/plugin list
```

Скоуп установки:
- `--scope user` (по умолчанию) — `~/.claude/plugins/`, доступно во всех проектах
- `--scope project` — `.claude/plugins/`, коммитится в репо
- Для этого проекта: **superpowers + typescript-lsp + context7 ставим user-scope**, остальные — project-scope (чтобы было видно команде через git).

```bash
/plugin install prisma@claude-plugins-official --scope project
/plugin install stripe@claude-plugins-official --scope project
/plugin install github@claude-plugins-official --scope project
```

---

## Шаг 2 — Community plugins

```bash
# Vercel agent skills (Next.js best practices)
npx skills add vercel-labs/agent-skills --scope project

# Claude SEO
/plugin marketplace add AgricIDaniel/claude-seo
/plugin install claude-seo@agricidaniel-claude-seo --scope project
```

**Stop.** Перед каждой установкой 3rd-party skill — прочитать [security.md](security.md) и проверить:

1. Репо имеет ≥1000 stars или это vendor-owned org
2. Последний коммит свежее 3 месяцев
3. Открыть `SKILL.md` и прочитать что он делает (любой shell-команды через `Bash:` должна выглядеть осмысленно)

---

## Шаг 3 — Включить MCP-серверы

См. полный гайд: [mcp-servers.md](mcp-servers.md).

Минимум для W4:

```bash
# GitHub MCP — нужен Personal Access Token с scopes: repo, workflow
claude mcp add github \
  -e GITHUB_PERSONAL_ACCESS_TOKEN=$(security find-generic-password -a github-mcp -w) \
  -- npx -y @modelcontextprotocol/server-github

# Postgres MCP — read-only роль для безопасности
claude mcp add postgres \
  -- npx -y @modelcontextprotocol/server-postgres \
  "postgresql://reader:reader@localhost:5432/jewelry_dev"
```

Stripe — после Шага 1 (`stripe` plugin сам поднимет MCP).

---

## Шаг 4 — Hooks

Скопировать конфиг из [hooks.md](hooks.md) в `.claude/settings.json` (мерджить с существующим `permissions`).

Создать helper-скрипты:

```bash
mkdir -p scripts
touch scripts/check-i18n-parity.mjs
touch scripts/check-money-fields.mjs
```

Содержимое — в [hooks.md](hooks.md).

Перезапустить сессию Claude Code (либо `/reload-plugins`), чтобы hooks подцепились.

---

## Шаг 5 — Custom skills (постепенно)

Каждый custom skill — отдельная папка под `.claude/skills/<name>/`. Минимальная структура:

```
.claude/skills/i18n-sync/
└── SKILL.md
```

`SKILL.md` начинается с frontmatter:

```markdown
---
name: i18n-sync
description: Use when JSX strings change or messages/*.json edited. Reports missing keys, proposes RU/ES translations.
---

# i18n-sync

(тело — детальная инструкция Claude)
```

Спецификации каждого скилла — в [custom/](custom/).

Порядок написания (по приоритету): см. [docs/18_CLAUDE_SKILLS_PLAN.md → Roadmap](../18_CLAUDE_SKILLS_PLAN.md#4-roadmap-внедрения).

---

## Шаг 6 — Проверка

```bash
# В сессии Claude Code:
/plugin list      # перечень плагинов
/mcp list         # MCP серверы
/skills           # все доступные skills
```

Должен быть виден весь набор: bundled + installed plugins + custom.

Запустить тестовый сценарий:

```
/code-review medium
```

— должно отработать без ошибок.

---

## Шаг 7 — Команде

После всех настроек:

```bash
# Закоммитить project-scoped плагины + hooks + custom skills
git add .claude/settings.json .claude/skills/ .claude/plugins/
git status   # проверить что нет .claude/session* / .claude/cache/
```

Добавить в `.gitignore`:

```
.claude/settings.local.json
.claude/session*
.claude/cache/
.claude/file-history/
```

---

## Update / Removal

```bash
# Обновить все plugins
/plugin update --all

# Удалить
/plugin uninstall <name>

# Hot-reload skills после правки SKILL.md
/reload-plugins
```

---

## Troubleshooting

| Симптом | Причина | Решение |
| --- | --- | --- |
| Skill не появляется в `/skills` | Не указан `name:` в frontmatter | Проверить YAML frontmatter |
| Hook не запускается | Неверный path в `command` | Проверить через `bash -x` |
| MCP server "needs auth" | Не задан env | Перезапустить Claude после `claude mcp add ... -e KEY=value` |
| `/plugin install` 404 | Неверный marketplace slug | `/plugin marketplace list` показывает доступные |
| Plugin ставится, но не работает | Конфликт версий Claude Code | `claude --version` ≥ 2.1.154 |
