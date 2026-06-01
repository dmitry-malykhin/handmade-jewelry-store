# Hooks — конфигурация

Hooks — shell-команды, которые harness Claude Code запускает в ответ на события (PostToolUse, Stop, UserPromptSubmit и т.д.). Это единственный способ "автоматически делать X при Y" — memory или CLAUDE.md код не запускают.

---

## Поддерживаемые события

| Событие | Когда стреляет | Зачем нужно |
| --- | --- | --- |
| `PostToolUse` | После каждого вызова tool (Edit, Write, Bash, ...) | Lint, format, validation |
| `PreToolUse` | До вызова tool (можно блокировать) | Pre-commit guards, danger checks |
| `Stop` | Когда Claude закончил turn | Final checks: typecheck, i18n parity |
| `UserPromptSubmit` | После того как юзер послал сообщение | Контекст: branch, dirty files |
| `Notification` | Когда Claude хочет уведомить юзера | Кастомные звуки/desktop notifications |
| `SubagentStop` | Когда подагент закончил | Сбор результата |

---

## Рекомендованный набор для этого проекта

Полный `.claude/settings.json` (мерджить с существующим `permissions`):

```json
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(gh:*)",
      "Bash(pnpm:*)",
      "Bash(npx:*)",
      "Bash(curl:*)",
      "Bash(pkill:*)",
      "Bash(ls:*)",
      "Bash(python3:*)",
      "Bash(cat:*)",
      "Bash(grep:*)",
      "Bash(echo:*)",
      "Bash(mkdir:*)",
      "Bash(cp:*)",
      "Bash(mv:*)",
      "Bash(touch:*)",
      "Bash(cd:*)",
      "Bash(terraform:*)",
      "Bash(aws:*)",
      "Bash(stripe:*)",
      "Bash(docker:*)",
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep",
      "WebFetch",
      "WebSearch"
    ],
    "deny": [
      "Read(/Users/dmitrii_malykhin/.aws/credentials)",
      "Read(/Users/dmitrii_malykhin/.ssh/**)",
      "Read(/Users/dmitrii_malykhin/.gnupg/**)",
      "Read(**/.env)",
      "Read(**/.env.*)",
      "Read(**/secrets/**)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "FILE=\"$CLAUDE_FILE_PATHS\"; case \"$FILE\" in *.ts|*.tsx) cd \"$CLAUDE_PROJECT_DIR\" && pnpm exec eslint --fix \"$FILE\" 2>&1 | tail -20 ;; esac",
            "description": "ESLint --fix on every TS/TSX edit"
          },
          {
            "type": "command",
            "command": "case \"$CLAUDE_FILE_PATHS\" in *messages/*.json) cd \"$CLAUDE_PROJECT_DIR\" && node scripts/check-i18n-parity.mjs ;; esac",
            "description": "i18n parity check when messages/*.json changes"
          },
          {
            "type": "command",
            "command": "case \"$CLAUDE_FILE_PATHS\" in *schema.prisma) cd \"$CLAUDE_PROJECT_DIR\" && node scripts/check-money-fields.mjs ;; esac",
            "description": "Prisma money/measurement field convention check"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cd \"$CLAUDE_PROJECT_DIR\" && pnpm --filter web exec tsc --noEmit 2>&1 | tail -30 || true",
            "description": "Type-check at end of turn (non-blocking)"
          },
          {
            "type": "command",
            "command": "cd \"$CLAUDE_PROJECT_DIR\" && node scripts/check-i18n-parity.mjs --quiet || true",
            "description": "Final i18n completeness check"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cd \"$CLAUDE_PROJECT_DIR\" && BRANCH=$(git rev-parse --abbrev-ref HEAD) DIRTY=$(git status --porcelain | wc -l | tr -d ' ') && echo \"Branch: $BRANCH | Dirty files: $DIRTY\"",
            "description": "Show current branch context"
          }
        ]
      }
    ]
  }
}
```

---

## Helper-скрипты

### `scripts/check-i18n-parity.mjs`

```js
#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const MESSAGES_DIR = resolve('apps/web/messages')
const LOCALES = ['en', 'ru', 'es']
const quiet = process.argv.includes('--quiet')

const flatten = (obj, prefix = '') =>
  Object.entries(obj).reduce((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object') Object.assign(acc, flatten(value, path))
    else acc[path] = value
    return acc
  }, {})

const loaded = LOCALES.map((locale) => ({
  locale,
  keys: flatten(JSON.parse(readFileSync(`${MESSAGES_DIR}/${locale}.json`, 'utf8'))),
}))

const allKeys = new Set(loaded.flatMap(({ keys }) => Object.keys(keys)))
const missing = []
for (const key of allKeys) {
  const absentIn = loaded.filter(({ keys }) => !(key in keys)).map(({ locale }) => locale)
  if (absentIn.length > 0) missing.push({ key, absentIn })
}

if (missing.length === 0) {
  if (!quiet) console.log('i18n parity: OK')
  process.exit(0)
}

console.error('i18n parity FAILED:')
for (const { key, absentIn } of missing) console.error(`  ${key} — missing in: ${absentIn.join(', ')}`)
process.exit(1)
```

### `scripts/check-money-fields.mjs`

```js
#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const schemaPath = resolve('apps/api/prisma/schema.prisma')
const content = readFileSync(schemaPath, 'utf8')

const errors = []

const priceFieldRegex = /^\s*(\w*price\w*|\w*amount\w*|\w*total\w*|\w*subtotal\w*|\w*tax\w*|\w*discount\w*|\w*fee\w*)\s+(\w+)/gim
let match
while ((match = priceFieldRegex.exec(content)) !== null) {
  const [, name, type] = match
  if (!name.toLowerCase().endsWith('cents') && type === 'Int') {
    errors.push(`Money field "${name}" must end with "Cents" suffix (got: ${name}: ${type})`)
  }
  if (type === 'Float' || type === 'Decimal') {
    errors.push(`Money field "${name}" must be Int (cents), not ${type}`)
  }
}

const measurementFieldRegex = /^\s*(\w*length\w*|\w*width\w*|\w*height\w*|\w*depth\w*|\w*weight\w*)\s+(\w+)/gim
while ((match = measurementFieldRegex.exec(content)) !== null) {
  const [, name] = match
  const lower = name.toLowerCase()
  if (lower.includes('weight') && !lower.endsWith('grams')) {
    errors.push(`Weight field "${name}" must end with "Grams"`)
  }
  if ((lower.includes('length') || lower.includes('width') || lower.includes('height') || lower.includes('depth')) && !lower.endsWith('cm')) {
    errors.push(`Dimension field "${name}" must end with "Cm" (store metric)`)
  }
}

if (errors.length === 0) {
  console.log('Prisma money/measurement: OK')
  process.exit(0)
}

console.error('Prisma schema FAILED:')
errors.forEach((e) => console.error(`  ${e}`))
process.exit(1)
```

Сделать исполняемым:

```bash
chmod +x scripts/check-i18n-parity.mjs scripts/check-money-fields.mjs
```

---

## Переменные окружения, доступные в hook-командах

- `$CLAUDE_PROJECT_DIR` — корень проекта (где `.claude/`)
- `$CLAUDE_FILE_PATHS` — пути к файлам, изменённым в этом tool-вызове (через пробел)
- `$CLAUDE_SESSION_ID` — id текущей сессии
- `$CLAUDE_USER_MESSAGE` — последнее сообщение юзера (только в UserPromptSubmit)

Подробности — https://code.claude.com/docs/en/hooks

---

## Blocking vs non-blocking

- **Exit 0** — hook прошёл, всё ок.
- **Exit non-zero в PreToolUse** — БЛОКИРУЕТ tool-вызов. Используйте с осторожностью.
- **Exit non-zero в PostToolUse / Stop** — ВЫВОДИТСЯ в контекст Claude (он увидит ошибку и сможет починить).
- Все hooks из примера выше — non-blocking (`|| true` в конце).

---

## Debugging

```bash
# Логи последней сессии
tail -f ~/.claude/projects/<project>/sessions/<session-id>.jsonl | grep hook

# Запустить hook-команду вручную:
CLAUDE_FILE_PATHS="apps/web/messages/en.json" CLAUDE_PROJECT_DIR=$PWD bash -c '<команда из settings.json>'
```

---

## Что НЕ делать в hooks

- ❌ Запускать heavy-задачи (`pnpm build`, `pnpm test`) на каждый Edit — будут лагать
- ❌ Делать commits/pushes в hook (это нарушение правила "Claude не коммитит")
- ❌ Без `|| true` для non-critical проверок (заблокирует Claude)
- ❌ Без `cd "$CLAUDE_PROJECT_DIR"` (harness иногда стартует hook из другой cwd)
- ❌ Чувствительные данные в hook-команде (попадают в логи)
