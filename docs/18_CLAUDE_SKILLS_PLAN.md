# Claude Code Skills — План для проекта

> Главный документ. Полный обзор всех skills/plugins/MCP, рекомендованных под этот проект (Next.js 15 + NestJS + Prisma + AWS + Stripe + i18n e-commerce monorepo).
> Отдельные файлы по каждому скиллу — в [docs/skills/](skills/).

---

## TL;DR — что установить в первую очередь

Если читать дальше нет времени, минимальный набор для немедленного внедрения:

| Шаг | Команда | Зачем |
| --- | --- | --- |
| 1 | `/plugin install typescript-lsp@claude-plugins-official` | LSP-диагностика для всего монорепо |
| 2 | `/plugin install context7@claude-plugins-official` | Свежие, версионно-привязанные доки (Next 15, Prisma 6, NestJS 11) |
| 3 | `/plugin install superpowers@claude-plugins-official` | TDD + systematic debugging + plan/execute workflow |
| 4 | `/plugin install prisma@claude-plugins-official` | Prisma MCP — миграции, query, schema-первая работа |
| 5 | `/plugin install stripe@claude-plugins-official` | Stripe MCP для BNPL/webhook/payment intent отладки |
| 6 | `/plugin install sentry@claude-plugins-official` | Подтягивание production-ошибок прямо в Claude |
| 7 | `/plugin install github@claude-plugins-official` | Работа с issues #62-#129 без выхода в `gh` |
| 8 | `npx skills add vercel-labs/agent-skills` | Next.js perf + a11y best practices |
| 9 | `/plugin marketplace add AgricIDaniel/claude-seo && /plugin install claude-seo` | SEO audit / JSON-LD / GEO |
| 10 | `/fewer-permission-prompts` | Автоматический allowlist под `pnpm/git/gh/terraform/aws` |

Дальше — добавить 5 custom-скиллов проекта (см. [docs/skills/custom/](skills/custom/)) и hooks из [docs/skills/hooks.md](skills/hooks.md).

---

## 1. Что такое Skill, Plugin, MCP, Hook — без жаргона

| Понятие | Что это | Где живёт | Пример |
| --- | --- | --- | --- |
| **Skill** | Markdown-файл с инструкциями (frontmatter + тело), который Claude автоматически или по запросу применяет к задаче | `.claude/skills/<name>/SKILL.md` (проектный) или `~/.claude/skills/` (юзерский) | `/code-review`, `/verify` |
| **Plugin** | Пакет из skills + agents + hooks + MCP servers, распространяется через marketplace | Устанавливается через `/plugin install` | `superpowers`, `claude-seo` |
| **MCP server** | Внешний процесс, дающий Claude доступ к API/БД/файлам (figma, github, postgres) | Конфигурируется через `claude mcp add ...` | `figma` MCP уже подключен |
| **Hook** | Shell-команда, которую harness запускает в ответ на событие (PostToolUse, Stop и т.д.) | `.claude/settings.json` → `hooks` | `eslint --fix` после каждого Edit |

**Важно.** Memory/CLAUDE.md *не запускает* код. Любое требование "автоматически делать X при Y" — это hook, а не правило в memory. Подробно: [docs/skills/hooks.md](skills/hooks.md).

---

## 2. Текущее состояние

### Что уже работает в проекте

- **MCP-серверы:** `figma` (загружен в текущей сессии), `atlassian` (Confluence/Jira).
- **Bundled Anthropic skills доступны:** `code-review`, `simplify`, `verify`, `run`, `init`, `review`, `security-review`, `loop`, `schedule`, `claude-api`, `fewer-permission-prompts`, `update-config`, `keybindings-help`.
- **Permissions allowlist:** `git/gh/pnpm/npx/curl/python3/ls/cat/grep/mkdir/cp/mv/touch/cd` + Read/Write/Edit/Glob/Grep/WebFetch/WebSearch.
- **Hooks:** нет.
- **Custom skills:** нет.
- **Custom plugins:** нет.

### Чего не хватает

| Зона | Закрытие сейчас | Что добавить |
| --- | --- | --- |
| Next.js / React best practices | `code-review` (общий) | `vercel-labs/agent-skills` + custom `new-feature-component` |
| NestJS scaffold | вручную | custom `new-nest-module` |
| Prisma migrations safety | вручную | `prisma` plugin + custom `prisma-migrate-safe` |
| i18n EN/RU/ES sync | вручную (правило в CLAUDE.md) | custom `i18n-sync` + Stop hook |
| SEO / JSON-LD | docs/05 (вручную) | `claude-seo` plugin + custom `jsonld-audit` |
| Stripe BNPL | docs + runbook | `stripe` plugin + custom `stripe-webhook-handler` |
| Sentry triage | вручную | `sentry` plugin |
| AWS / Terraform / ECS | runbooks | `aws-serverless` (частично) + custom `tf-module-add` + `ecs-deploy-debug` |
| Marketing / Klaviyo / Pinterest | docs/16 | `coreyhaines31/marketingskills` + custom `klaviyo-flow-spec` |
| Analytics taxonomy | docs/16 | custom `track-event` |
| Jewelry domain (price/ring/measurement) | docs/09/10 | custom `price-display`, `measurement-toggle`, `ring-size-picker` |
| Image work | runbooks (R2/S3) | `cloudinary` plugin (если перейдём на CDN-преобразования) |
| Live perf audit | manual Lighthouse | `chrome-devtools-mcp` |

---

## 3. Полный каталог skills/plugins

Подробное описание каждого — в отдельных файлах. Здесь — карта.

### 3.1. Bundled Anthropic skills

Уже работают, ничего ставить не надо. Файл-обзор: [docs/skills/official/anthropic-bundled.md](skills/official/anthropic-bundled.md).

| Skill | Назначение |
| --- | --- |
| `/code-review` | Ревью текущего diff (low/medium/high/ultra) |
| `/simplify` | Применить cleanup-фиксы к diff |
| `/verify` | Запустить приложение и убедиться, что фича работает |
| `/run` | Запустить приложение (требует `/run-skill-generator` для монорепо) |
| `/run-skill-generator` | Один раз — записать процедуру запуска под этот проект |
| `/init` | Сгенерировать первичный CLAUDE.md |
| `/review` | PR ревью |
| `/security-review` | Security ревью текущего бранча |
| `/fewer-permission-prompts` | Построить allowlist по транскриптам |
| `/loop` | Запустить задачу на интервале |
| `/schedule` | Создать cron-routine |
| `/claude-api` | Помощь по Anthropic SDK (не нужно — мы не вызываем Claude API) |
| `/update-config` | Изменить settings.json |
| `/keybindings-help` | Настройка хоткеев |

### 3.2. Official marketplace plugins

Устанавливаются командой `/plugin install <name>@claude-plugins-official`. Обзоры:

| Plugin | Файл | Приоритет |
| --- | --- | --- |
| `typescript-lsp` | [docs/skills/official/typescript-lsp.md](skills/official/typescript-lsp.md) | P0 — must-have |
| `context7` | [docs/skills/official/context7.md](skills/official/context7.md) | P0 |
| `github` | [docs/skills/official/github-plugin.md](skills/official/github-plugin.md) | P0 |
| `prisma` | [docs/skills/official/prisma-plugin.md](skills/official/prisma-plugin.md) | P0 |
| `stripe` | [docs/skills/official/stripe-plugin.md](skills/official/stripe-plugin.md) | P0 |
| `sentry` | [docs/skills/official/sentry-plugin.md](skills/official/sentry-plugin.md) | P1 — после W9 |
| `playwright` | [docs/skills/official/playwright-plugin.md](skills/official/playwright-plugin.md) | P1 |
| `chrome-devtools-mcp` | [docs/skills/official/chrome-devtools-mcp.md](skills/official/chrome-devtools-mcp.md) | P1 — для Core Web Vitals |
| `security-guidance` | [docs/skills/official/security-guidance.md](skills/official/security-guidance.md) | P1 — e-commerce + Stripe + PII |
| `pr-review-toolkit` | [docs/skills/official/pr-review-toolkit.md](skills/official/pr-review-toolkit.md) | P2 |
| `coderabbit` | [docs/skills/official/coderabbit.md](skills/official/coderabbit.md) | P2 |
| `cloudinary` | [docs/skills/official/cloudinary.md](skills/official/cloudinary.md) | P2 — если перейдём с R2/S3 на Cloudinary CDN |
| `adobe-for-creativity` | [docs/skills/official/adobe.md](skills/official/adobe.md) | P3 — опционально |
| `datadog` | — | P3 — если откажемся от Grafana Loki |

### 3.3. Community plugins (использовать с осторожностью!)

Только из проверенных источников. Подробности — [docs/skills/security.md](skills/security.md).

| Plugin | Источник | Файл | Приоритет |
| --- | --- | --- | --- |
| `superpowers` | github.com/obra/superpowers (в official marketplace) | [docs/skills/community/superpowers.md](skills/community/superpowers.md) | P0 |
| `vercel-labs/agent-skills` | github.com/vercel-labs/agent-skills | [docs/skills/community/vercel-agent-skills.md](skills/community/vercel-agent-skills.md) | P0 |
| `claude-seo` | github.com/AgricIDaniel/claude-seo | [docs/skills/community/claude-seo.md](skills/community/claude-seo.md) | P0 |
| `coreyhaines31/marketingskills` | github.com/coreyhaines31/marketingskills | [docs/skills/community/marketingskills.md](skills/community/marketingskills.md) | P1 |

### 3.4. Custom skills (написать самим)

Полная спецификация — [docs/skills/custom/](skills/custom/).

**Топ-5 priority (impact/effort):**

1. `i18n-sync` — синхронизация EN/RU/ES → [docs/skills/custom/i18n-sync.md](skills/custom/i18n-sync.md)
2. `new-feature-component` — скаффолд компонента под все правила CLAUDE.md → [docs/skills/custom/new-feature-component.md](skills/custom/new-feature-component.md)
3. `new-nest-module` — backend module scaffold → [docs/skills/custom/new-nest-module.md](skills/custom/new-nest-module.md)
4. `track-event` — единая точка для analytics event → [docs/skills/custom/track-event.md](skills/custom/track-event.md)
5. `price-display` — гарант инвариантов цены → [docs/skills/custom/price-display.md](skills/custom/price-display.md)

**Остальные (по убыванию impact):**

- `jsonld-audit` — [docs/skills/custom/jsonld-audit.md](skills/custom/jsonld-audit.md)
- `prisma-migrate-safe` — [docs/skills/custom/prisma-migrate-safe.md](skills/custom/prisma-migrate-safe.md)
- `stripe-webhook-handler` — [docs/skills/custom/stripe-webhook-handler.md](skills/custom/stripe-webhook-handler.md)
- `shopping-feed-validate` — [docs/skills/custom/shopping-feed-validate.md](skills/custom/shopping-feed-validate.md)
- `measurement-toggle` — [docs/skills/custom/measurement-toggle.md](skills/custom/measurement-toggle.md)
- `ring-size-picker` — [docs/skills/custom/ring-size-picker.md](skills/custom/ring-size-picker.md)
- `tanstack-query-hook` — [docs/skills/custom/tanstack-query-hook.md](skills/custom/tanstack-query-hook.md)
- `shadcn-themed-add` — [docs/skills/custom/shadcn-themed-add.md](skills/custom/shadcn-themed-add.md)
- `seo-page-audit` — [docs/skills/custom/seo-page-audit.md](skills/custom/seo-page-audit.md)
- `tf-module-add` — [docs/skills/custom/tf-module-add.md](skills/custom/tf-module-add.md)
- `cloudwatch-alarm-add` — [docs/skills/custom/cloudwatch-alarm-add.md](skills/custom/cloudwatch-alarm-add.md)
- `ecs-deploy-debug` — [docs/skills/custom/ecs-deploy-debug.md](skills/custom/ecs-deploy-debug.md)
- `cowrite-tests` — [docs/skills/custom/cowrite-tests.md](skills/custom/cowrite-tests.md)
- `allure-annotate` — [docs/skills/custom/allure-annotate.md](skills/custom/allure-annotate.md)
- `resend-template` — [docs/skills/custom/resend-template.md](skills/custom/resend-template.md)
- `klaviyo-flow-spec` — [docs/skills/custom/klaviyo-flow-spec.md](skills/custom/klaviyo-flow-spec.md)
- `i18n-extract` — [docs/skills/custom/i18n-extract.md](skills/custom/i18n-extract.md)
- `figma-to-shadcn` — [docs/skills/custom/figma-to-shadcn.md](skills/custom/figma-to-shadcn.md)

### 3.5. MCP servers (помимо уже подключённых)

Подробности и команды установки — [docs/skills/mcp-servers.md](skills/mcp-servers.md).

| MCP | Что даёт | Приоритет |
| --- | --- | --- |
| `github` | Чтение/правка issues, PR | P0 |
| `postgres` | Read-only запросы к локальной/staging БД | P0 |
| `stripe` | Test-mode payment intents, products, customers | P0 |
| `sentry` | Issues/events во время отладки | P1 |
| `aws` (CloudWatch logs) | Чтение логов без CLI | P1 — после W9 |
| `playwright` | Browser-driven verification | P2 |

---

## 4. Roadmap внедрения (привязка к [docs/12_PLAN_PERSONAL.md](12_PLAN_PERSONAL.md))

### W4 — Products API (сейчас)

**Установить:** `typescript-lsp`, `context7`, `github`, `prisma`, `superpowers`, `vercel-labs/agent-skills`.
**Написать custom:** `i18n-sync`, `new-feature-component`, `new-nest-module`, `prisma-migrate-safe`.
**Hooks:** ESLint --fix on Edit, i18n parity on Stop.

### W5-W6 — Cart, Checkout, Payments

**Установить:** `stripe`, `chrome-devtools-mcp`.
**Написать custom:** `track-event`, `price-display`, `stripe-webhook-handler`, `tanstack-query-hook`.

### W7-W8 — Auth, SEO, UX

**Установить:** `claude-seo`, `security-guidance`.
**Написать custom:** `jsonld-audit`, `seo-page-audit`, `i18n-extract`, `measurement-toggle`, `ring-size-picker`.

### W9 — Infra & Observability

**Установить:** `sentry`, `aws` MCP.
**Написать custom:** `tf-module-add`, `cloudwatch-alarm-add`, `ecs-deploy-debug`, `cowrite-tests`, `allure-annotate`.

### W10 — Launch

**Установить:** `coderabbit`, `pr-review-toolkit`, `playwright` MCP.
**Написать custom:** `shopping-feed-validate`, `resend-template`, `klaviyo-flow-spec`.

### POST-MVP

**Установить:** `coreyhaines31/marketingskills`, `cloudinary` (если меняем CDN), `figma` custom skill.
**Написать custom:** `figma-to-shadcn`, `shadcn-themed-add`.

---

## 5. Безопасность (read this!)

Третий пункт после "что ставить" — **что НЕ ставить**.

- **SKILL.md = executable instructions** для tool с file-write + bash. Установка незнакомого скилла = `curl | bash`.
- С февраля 2026 идёт активная malware-кампания через "leaked Claude Code Pro" репозитории (Trend Micro, Zscaler).
- В мае 2026 reversec.com опубликовал PoC компрометации Claude Code через malicious skill.
- **Ставить только:**
  - официальный marketplace (`claude-plugins-official`)
  - vendor-owned orgs (vercel-labs, cloudflare, datadog, coderabbitai)
  - именованные авторы с реальной активностью (obra/superpowers, AgricIDaniel/claude-seo)
- **Не ставить:**
  - "awesome-claude-skills" грабли с 1000+ скиллов
  - "leaked Pro" репозитории
  - "Sales" plugin из официального marketplace (флагнут как low-quality в buildtolaunch review)
  - "Productivity" plugin (тот же отчёт)

Полная политика — [docs/skills/security.md](skills/security.md).

---

## 6. Структура файлов после внедрения

```
.claude/
├── settings.json              # permissions + hooks
├── settings.local.json        # локальные оверрайды (gitignored)
└── skills/                    # custom skills этого проекта
    ├── i18n-sync/SKILL.md
    ├── new-feature-component/SKILL.md
    ├── new-nest-module/SKILL.md
    ├── track-event/SKILL.md
    ├── price-display/SKILL.md
    └── ...

docs/
├── 18_CLAUDE_SKILLS_PLAN.md   # этот файл
└── skills/
    ├── README.md              # навигация
    ├── installation-guide.md  # пошаговая инструкция
    ├── security.md            # политика безопасности
    ├── hooks.md               # конфигурация hooks
    ├── mcp-servers.md         # MCP серверы
    ├── official/              # bundled + marketplace
    ├── community/             # third-party
    └── custom/                # наши

scripts/
├── check-i18n-parity.mjs      # вызывается hooks
└── check-money-fields.mjs     # вызывается hooks
```

---

## 7. Что дальше

1. Прочитать [docs/skills/installation-guide.md](skills/installation-guide.md) и [docs/skills/security.md](skills/security.md).
2. Выполнить 10 шагов из TL;DR выше.
3. Запустить `/fewer-permission-prompts` чтобы сократить permission-промпты.
4. По мере прохождения недель W4-W10 — устанавливать плагины и писать custom-скиллы из roadmap (раздел 4).
5. После каждого нового скилла — добавить ссылку в этот файл и в [docs/skills/README.md](skills/README.md).

---

## Источники

Все источники — реальные URL, по которым велось исследование:

- https://code.claude.com/docs/en/skills — каноническая документация skills
- https://code.claude.com/docs/en/plugins — авторинг плагинов
- https://code.claude.com/docs/en/discover-plugins — содержимое официального marketplace
- https://claude.com/plugins — каталог плагинов
- https://github.com/anthropics/claude-plugins-official — официальный marketplace репо
- https://github.com/anthropics/claude-plugins-community — community marketplace
- https://github.com/obra/superpowers — superpowers (215k★)
- https://github.com/vercel-labs/agent-skills — Vercel skills (27.4k★)
- https://github.com/AgricIDaniel/claude-seo — SEO plugin (7.8k★)
- https://github.com/coreyhaines31/marketingskills
- https://labs.reversec.com/posts/2026/05/skill-issues-compromising-claude-code-with-malicious-skills-agents-part-1 — security warning
- https://www.trendmicro.com/en_us/research/26/d/weaponizing-trust-claude-code-lures-and-github-release-payloads.html — malware campaign
- https://www.firecrawl.dev/blog/best-claude-code-skills — Firecrawl review
- https://buildtolaunch.substack.com/p/best-claude-code-plugins-tested-review — quality review
