# superpowers

**Priority:** P0 — top-1 community plugin для serious dev workflow.
**Source:** github.com/obra/superpowers (215k ★), официально включён в `claude-plugins-official` marketplace.
**Author:** Jesse Vincent (obra) — long-time maintainer, реальная активность.

## Что делает

Набор из 10+ skills, ставящих battle-tested workflow:

| Skill | Назначение |
| --- | --- |
| `test-driven-development` | Жёсткий red→green→refactor TDD цикл |
| `systematic-debugging` | Root-cause анализ (никаких "patch on top") |
| `verification-before-completion` | Прежде чем сказать "готово" — реально проверить |
| `brainstorming` | Структурированная генерация идей перед написанием кода |
| `writing-plans` | Шаблон детального плана (с verification gates) |
| `executing-plans` | Прохождение плана step-by-step с trackingом |
| `subagent-driven-development` | Декомпозиция в параллельных подагентов |
| `requesting-code-review` | Self-review перед просьбой ревью |
| `using-git-worktrees` | Параллельная работа в worktree (см. EnterWorktree) |
| `writing-skills` | Мета-skill для написания новых skills |

## Установка

```bash
/plugin install superpowers@claude-plugins-official --scope user
```

User-scope: эти skills полезны во всех проектах.

После установки — `/skills` покажет новые skill'ы вида `test-driven-development`, `systematic-debugging` и т.д.

## Использование

Skills активируются автоматически на правильных триггерах. Можно явно:

```
/test-driven-development добавить fetchProductBySlug в catalog service
```

— Claude напишет тесты СНАЧАЛА (red), потом минимальную реализацию (green), потом refactor.

```
/systematic-debugging — pnpm test падает на cart.store.spec.ts с TypeError
```

— Claude не будет лепить patches, а пойдёт корнем.

```
/writing-plans — план для W4 Issue #64 Products API
```

— получите структурированный план с verification gates.

## Пересечения с правилами проекта

Совпадает с CLAUDE.md в правилах:
- "Tests перед commit"
- "Pre-commit checklist" — `verification-before-completion` это аналог
- "Один Issue In Progress" — `executing-plans` enforces step-by-step

Дополняет:
- Memory правило `feedback_task_flow.md` (11-step flow) — `executing-plans` структурно похож

## Конфликты с правилами

- `using-git-worktrees` использует git операции. Memory правило: Claude не коммитит/не пушит. Скилл нужно использовать с осторожностью — он создаёт worktree, но коммит должен делать пользователь.

Решение — добавить в `.claude/settings.json`:

```json
{
  "permissions": {
    "deny": [
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(git tag:*)"
    ]
  }
}
```

— skill сможет создавать worktrees (`git worktree add`) но не сможет commit/push.

## Trade-offs

- Жёсткий TDD замедляет на 30-50% но снижает баги на ту же сумму. Trade-off положителен только если кодовая база растёт долго (наша — да)
- `subagent-driven-development` может выжирать токены — использовать осознанно
- Часть skills (`brainstorming`, `writing-plans`) — методологические, нет hard automation. Не для всех задач

## Когда не использовать

- Hotfixes — пропускают workflow целиком (skip TDD, не до плана)
- Спайки/research — `brainstorming` помогает, остальные мешают

## Источник

- https://github.com/obra/superpowers
- https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json — listing
