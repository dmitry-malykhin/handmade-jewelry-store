# Anthropic Bundled Skills

Skills, поставляющиеся вместе с Claude Code. Ставить ничего не надо.

## Полный список

### `/code-review [low|medium|high|ultra] [--fix] [--comment]`

Ревью текущего diff на корректность и cleanup-возможности.

- `low/medium` — высокая уверенность, мало findings
- `high` — больше покрытие, может включать uncertain
- `ultra` — multi-agent cloud review (биллится отдельно, требует git repo)
- `--fix` — применить fixes к working tree
- `--comment` — postить findings inline в PR

**Когда использовать:** перед каждым PR. На большом изменении — `medium` или `high`. На critical (payments, auth) — `ultra`.

### `/simplify [target]`

Применить cleanup-фиксы из `/code-review --fix`. Эквивалент.

### `/verify`

Запустить приложение в браузере/CLI и убедиться что фича реально работает (не просто компилируется/тесты зелёные).

**Требует:** `/run-skill-generator` запущен один раз для этого монорепо.

### `/run`

Запуск приложения. Универсальный — но для нашего монорепо нужно сначала записать процедуру через `/run-skill-generator` (иначе Claude не знает что нужно `docker compose up` + `pnpm --filter api dev` + `pnpm --filter web dev` параллельно).

### `/run-skill-generator`

**Один раз на проект.** Записывает в `.claude/skills/run-<name>/` процедуру запуска. После — `/run` и `/verify` работают корректно.

Запустить **сейчас** (W4) — не откладывать.

### `/init`

Генерирует первичный `CLAUDE.md`. У нас уже есть подробный — не использовать.

### `/review`

PR ревью (отличается от `/code-review` — этот заточен под GitHub PR, читает контекст из `gh pr view`).

### `/security-review`

Security ревью текущего бранча. Применять перед мерджем changes в `apps/api/auth`, `apps/api/payments`, любых endpoint'ов с user input.

### `/fewer-permission-prompts`

Сканирует последние транскрипты сессии, находит часто-используемые Bash-команды и MCP-инструменты, добавляет их в `allow` в `.claude/settings.json`.

**Запустить:** в конце каждой плотной недели работы — сократит permission prompts.

### `/loop [interval] [prompt]`

Запускает задачу на интервале. Альтернатива cron.

Применение:
- Поллинг CloudWatch alarms каждые 5 минут
- Babysit-PR флоу: каждые 2 минуты проверять статус CI
- Авто-апдейт runbook по часам

### `/schedule`

Создать cron-задание для удалённого агента (запускается в Anthropic cloud, не локально). Использовать для:
- Еженедельные dependency updates (npm audit + pnpm update)
- Ежедневные SEO audit'ы продуктовых страниц
- Ночные backup DB → S3

### `/claude-api [migrate|managed-agents-onboard]`

Помощь по Anthropic SDK. **Не применимо** — мы не вызываем Claude API из приложения.

### `/update-config`

Изменение `settings.json` через диалог (вместо ручной правки JSON). Использовать когда не уверены в синтаксисе hooks/permissions.

### `/keybindings-help`

Кастомизация хоткеев. Низкий приоритет.

### `/debug [description]`

Включает session debug log и анализирует его. Использовать когда Claude ведёт себя странно и нужно понять почему.

---

## Workflow вспомогательные команды (не skills, но полезно знать)

- `/agents` — выбор подагента вручную
- `/compact` — сжать историю беседы (если контекст забивается)
- `/diff` — посмотреть текущий diff
- `/doctor` — диагностика установки Claude Code
- `/insights` — статистика использования
- `/plan` — войти в plan mode
- `/team-onboarding` — onboarding для новых членов команды

---

## Что использовать когда

| Сценарий | Команда |
| --- | --- |
| Перед PR | `/code-review medium` |
| После большого refactor | `/simplify` |
| Тестирование UI-фичи | `/verify` |
| Запуск проекта | `/run` (после `/run-skill-generator`) |
| Перед merge auth/payment кода | `/security-review` |
| Permission prompts надоели | `/fewer-permission-prompts` |
| Поллинг CI | `/loop 60s gh run watch` |
| Ежедневный SEO audit | `/schedule` + `/seo audit` |
| Claude ведёт себя странно | `/debug` |

---

## Источник

- https://code.claude.com/docs/en/commands — полная таблица bundled skills/commands
