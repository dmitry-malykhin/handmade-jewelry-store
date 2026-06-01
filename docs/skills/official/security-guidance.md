# security-guidance

**Priority:** P1 — должен быть включён прежде чем мы вынесем endpoint'ы Stripe и Auth в публичный доступ.

## Что делает

Ревью каждого Edit/Write на наличие vulnerability patterns:
- SQL injection
- XSS / unsafe innerHTML
- Hardcoded secrets
- Path traversal
- Insecure cookies
- Missing CSRF protection
- Insecure deserialization
- Weak crypto

Запускается как PostToolUse hook автоматически после каждой правки.

## Установка

```bash
/plugin install security-guidance@claude-plugins-official --scope project
```

## Что особенно важно для нашего проекта

| Зона | Что может пройти мимо | Что найдёт security-guidance |
| --- | --- | --- |
| Stripe webhook | пропущенная signature verification | `req.body` без проверки `stripe.webhooks.constructEvent` |
| Auth | JWT в localStorage | `localStorage.setItem('token', ...)` |
| User input | Prisma raw queries | `prisma.$queryRawUnsafe(userInput)` |
| File uploads (W10) | unrestricted file types | `multer` без fileFilter |
| Cookies | missing httpOnly | `res.cookie(..., { httpOnly: false })` |
| CSRF | mutation endpoint без CSRF | POST endpoint без CSRF middleware |
| CORS | wildcard origin | `Access-Control-Allow-Origin: *` |
| Secrets | committed `.env` | hardcoded `sk_*`, `re_*`, `AWS_SECRET_*` |

## Пересечения

- **`code-review`** — общий обзор, security — часть. `security-guidance` — заточен только под security
- **`security-review` (bundled)** — manual command, security-guidance — automatic. Использовать оба
- **GitHub Actions secret scanning** — catches credentials в коммитах. security-guidance — на этапе Edit, до коммита (быстрее feedback)

## Конфигурация

После установки можно настроить severity в `.claude/skills/security-guidance/config.json`:

```json
{
  "minSeverity": "medium",
  "blockOn": "high",
  "ignorePaths": ["**/test/**", "**/*.spec.ts"]
}
```

- `blockOn: "high"` — high-severity findings блокируют Edit. Опасно для productivity, использовать только в финальной части W10
- Для разработки — `blockOn: "never"`, finding выводится в контекст Claude

## Trade-offs

- False positives на тестовых файлах (hardcoded test secrets, mock JWT). Решение: `ignorePaths`
- Не заменяет `security-review` command или внешние tools (Snyk, Dependabot)
- Не покрывает supply chain (см. [security.md](../security.md) про 3rd-party skills)

## Источник

- https://code.claude.com/docs/en/discover-plugins
