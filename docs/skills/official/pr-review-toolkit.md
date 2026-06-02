# pr-review-toolkit

**Priority:** P2.

## Что делает

Набор skills для PR review:
- Чтение PR diff
- Анализ комментов от ревьюеров
- Группировка findings
- Suggested fixes inline
- Reply на review-комменты в context'e

Альтернатива `code-review` / `coderabbit`, заточенная под GitHub PR workflow.

## Установка

```bash
/plugin install pr-review-toolkit@claude-plugins-official --scope project
```

Требует `github` plugin (или MCP) для доступа к PR API.

## Когда применять

Не очень нужен пока не начнётся командная работа. Сейчас — solo dev, и `code-review` + `simplify` покрывают потребность.

После W10, если в команду придёт второй человек:
- Авто-генерация PR description из diff
- Reply на review comments (но **никогда** auto-merge — это нарушение правила "Claude не пушит")
- Группировка комментов: "5 findings about i18n, 3 about types, 2 about a11y"

## Trade-offs

- Дублирует функционал `coderabbit` + `code-review`. Выбрать одно
- `coderabbit` лучше для CI (run on PR open), `pr-review-toolkit` — для интерактивной работы

## Источник

- https://code.claude.com/docs/en/discover-plugins
