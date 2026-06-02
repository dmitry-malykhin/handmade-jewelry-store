# Claude Code Skills — навигация

Главный план — [docs/18_CLAUDE_SKILLS_PLAN.md](../18_CLAUDE_SKILLS_PLAN.md). Здесь — индекс всех отдельных файлов.

## Базовые документы

- [installation-guide.md](installation-guide.md) — пошаговая инструкция установки
- [security.md](security.md) — политика безопасности 3rd-party скиллов
- [hooks.md](hooks.md) — настройка hooks в settings.json
- [mcp-servers.md](mcp-servers.md) — конфигурация MCP серверов

## Bundled Anthropic skills (уже доступны)

- [official/anthropic-bundled.md](official/anthropic-bundled.md) — обзор всех 14 встроенных skills

## Official marketplace plugins

| Plugin | Priority | Файл |
| --- | --- | --- |
| `typescript-lsp` | P0 | [official/typescript-lsp.md](official/typescript-lsp.md) |
| `context7` | P0 | [official/context7.md](official/context7.md) |
| `github` | P0 | [official/github-plugin.md](official/github-plugin.md) |
| `prisma` | P0 | [official/prisma-plugin.md](official/prisma-plugin.md) |
| `stripe` | P0 | [official/stripe-plugin.md](official/stripe-plugin.md) |
| `sentry` | P1 | [official/sentry-plugin.md](official/sentry-plugin.md) |
| `playwright` | P1 | [official/playwright-plugin.md](official/playwright-plugin.md) |
| `chrome-devtools-mcp` | P1 | [official/chrome-devtools-mcp.md](official/chrome-devtools-mcp.md) |
| `security-guidance` | P1 | [official/security-guidance.md](official/security-guidance.md) |
| `pr-review-toolkit` | P2 | [official/pr-review-toolkit.md](official/pr-review-toolkit.md) |
| `coderabbit` | P2 | [official/coderabbit.md](official/coderabbit.md) |
| `cloudinary` | P2 | [official/cloudinary.md](official/cloudinary.md) |

## Community plugins

| Plugin | Priority | Файл |
| --- | --- | --- |
| `superpowers` | P0 | [community/superpowers.md](community/superpowers.md) |
| `vercel-labs/agent-skills` | P0 | [community/vercel-agent-skills.md](community/vercel-agent-skills.md) |
| `claude-seo` | P0 | [community/claude-seo.md](community/claude-seo.md) |
| `marketingskills` | P1 | [community/marketingskills.md](community/marketingskills.md) |

## Custom skills (написать самим)

### Top 5 priority

1. [custom/i18n-sync.md](custom/i18n-sync.md)
2. [custom/new-feature-component.md](custom/new-feature-component.md)
3. [custom/new-nest-module.md](custom/new-nest-module.md)
4. [custom/track-event.md](custom/track-event.md)
5. [custom/price-display.md](custom/price-display.md)

### По категориям

**Frontend:**
- [custom/new-feature-component.md](custom/new-feature-component.md)
- [custom/tanstack-query-hook.md](custom/tanstack-query-hook.md)
- [custom/shadcn-themed-add.md](custom/shadcn-themed-add.md)
- [custom/figma-to-shadcn.md](custom/figma-to-shadcn.md)

**Backend:**
- [custom/new-nest-module.md](custom/new-nest-module.md)
- [custom/stripe-webhook-handler.md](custom/stripe-webhook-handler.md)

**Database:**
- [custom/prisma-migrate-safe.md](custom/prisma-migrate-safe.md)

**Testing:**
- [custom/cowrite-tests.md](custom/cowrite-tests.md)
- [custom/allure-annotate.md](custom/allure-annotate.md)

**DevOps / AWS:**
- [custom/tf-module-add.md](custom/tf-module-add.md)
- [custom/cloudwatch-alarm-add.md](custom/cloudwatch-alarm-add.md)
- [custom/ecs-deploy-debug.md](custom/ecs-deploy-debug.md)

**SEO:**
- [custom/jsonld-audit.md](custom/jsonld-audit.md)
- [custom/seo-page-audit.md](custom/seo-page-audit.md)

**i18n:**
- [custom/i18n-sync.md](custom/i18n-sync.md)
- [custom/i18n-extract.md](custom/i18n-extract.md)

**Analytics:**
- [custom/track-event.md](custom/track-event.md)

**Marketing:**
- [custom/shopping-feed-validate.md](custom/shopping-feed-validate.md)
- [custom/resend-template.md](custom/resend-template.md)
- [custom/klaviyo-flow-spec.md](custom/klaviyo-flow-spec.md)

**Domain (jewelry):**
- [custom/price-display.md](custom/price-display.md)
- [custom/measurement-toggle.md](custom/measurement-toggle.md)
- [custom/ring-size-picker.md](custom/ring-size-picker.md)
