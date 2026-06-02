# coderabbit

**Priority:** P2.

## Что делает

AI PR review с 40+ static analyzers под капотом (ESLint, Bandit, Semgrep, ...). Запускается в GitHub Actions при открытии/обновлении PR.

В Claude Code skill — wrapper для просмотра CodeRabbit findings локально перед push'ем.

## Установка

```bash
/plugin install coderabbit@claude-plugins-official --scope project
```

Auth (если планируется CI integration):

1. https://app.coderabbit.ai/ → connect GitHub repo
2. Скоупы: read PR, write comments

Если только локально (без CI) — auth не нужен.

## Использование

Локально перед push:

```
Прогон coderabbit-чек на текущий diff. Что бы CodeRabbit прокомментировал?
```

В CI: автоматически на каждый PR (если включена интеграция).

## Когда подключать к CI

После W10 launch. До этого — ESLint в pre-commit hook + `code-review medium` дают достаточно сигнала.

## Пересечения

- **`code-review`** — Claude-native review. `coderabbit` — больше static analysis, меньше LLM-like
- **`security-guidance`** — pure security. `coderabbit` — больше про корректность/стиль

## Trade-offs

- Free tier ограничен по количеству PR/месяц. Pet-проект влезет, но если будет много PRs — платный план
- Findings часто шумные (стилевые мелочи). Отключать через `.coderabbit.yml`:

```yaml
reviews:
  auto_review:
    enabled: true
  path_filters:
    - "!**/*.spec.ts"
    - "!**/*.test.ts"
language_specific:
  typescript:
    enabled: true
    style: "strict"
```

## Источник

- https://code.claude.com/docs/en/discover-plugins
- https://docs.coderabbit.ai/
