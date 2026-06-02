# Security Policy — 3rd-party Skills

**Прочитать перед установкой любого community-скилла.**

---

## Почему это важно

Skill — это markdown-файл, который Claude **исполняет** как инструкцию агенту с правами:
- читать любой файл в проекте (включая `.env`, secrets, ключи)
- писать файлы
- запускать `bash` команды (если в allowlist `Bash`)
- делать HTTP-запросы

Установка незнакомого скилла = `curl | bash`. Тот же уровень доверия.

### Известные инциденты (по состоянию на 2026)

1. **Malware-кампания "leaked Claude Code Pro"** (Feb 2026 → ongoing).
   Trend Micro, Zscaler, The Register отчитались о массовых GitHub-репах вида `claude-code-pro-free`, `claude-skills-leaked`, etc. — содержат Vidar stealer + GhostSocks. Пользователи устанавливают, теряют криптокошельки и SSH-ключи.

2. **PoC компрометации через malicious skill** (May 2026, reversec.com).
   Опубликован white-paper "Skill Issues: Compromising Claude Code with Malicious Skills". Скилл маскируется под "linter", но при первом вызове читает `~/.aws/credentials` и `~/.ssh/` → exfiltrates через webhook.

3. **Sales / Productivity plugins в официальном marketplace** (Apr 2026, buildtolaunch review).
   Не malware, но 7 из 11 протестированных плагинов выдают вредную/неточную информацию. Качество ≠ безопасность, но обе угрозы реальны.

---

## Whitelist — что МОЖНО ставить

1. **Официальный marketplace `claude-plugins-official`** — Anthropic-кьюрейтед.
   Исключения: `sales`, `productivity` (низкое качество).

2. **Vendor-owned organizations:**
   - `vercel-labs/*`
   - `cloudflare/*`
   - `coderabbitai/*`
   - `datadog/*`
   - `sentry/*`
   - `stripe/*` (для будущих скиллов)
   - `prisma/*`

3. **Известные авторы с долгой историей:**
   - `obra/*` (superpowers)
   - `AgricIDaniel/*` (claude-seo)
   - `coreyhaines31/*` (marketingskills) — проверить, если ещё не сделано

4. **Community marketplace** `anthropics/claude-plugins-community` — submission-reviewed.

---

## Blacklist — что НЕ ставить

| Категория | Примеры | Почему |
| --- | --- | --- |
| "Leaked Pro" репо | `claude-code-pro-free`, `claude-code-cracked`, `claude-skills-leaked` | Malware (Vidar / GhostSocks) |
| Грабли "1400+ skills" | `awesome-claude-skills-mega`, `everything-claude-code` | 99% auto-generated junk, иногда — лазейки |
| Random "AI fork" | репо <100 stars, последний коммит >6 мес назад | Нет ревью, нет maintainer |
| Anonymous authors | `user1234/claude-skills-best` | Невозможно отследить ответственность |
| Auto-generated catalogues | `Chat2AnyLLM/awesome-claude-plugins` | Списки без качественного фильтра — использовать только как discovery, не для установки |
| `sales` plugin (officialmarket) | — | Низкое качество, генерит inaccurate data |
| `productivity` plugin | — | Дублирует TodoWrite, добавляет шум |

---

## Pre-install checklist

Перед каждой установкой 3rd-party скилла:

1. **Источник.** Репо ≥ 1k stars **или** входит в whitelist выше.
2. **Активность.** Последний коммит ≤ 3 месяца назад. Открытые issues отвечаются maintainer'ом.
3. **Авторство.** Maintainer имеет публичный профиль (имя, другие проекты, GitHub-история ≥1 год).
4. **Прочитать SKILL.md.** Открыть в браузере и пробежать глазами:
   - Есть ли `Bash:` или `bash` команды? Что они делают?
   - Читает ли скилл `.env`, `.aws/`, `.ssh/`, `.gnupg/`?
   - Делает ли HTTP к незнакомым доменам?
   - Запрашивает ли credentials в открытом виде?
5. **Сравнить с альтернативой.** Если есть аналог в `claude-plugins-official` — выбрать его.
6. **Pin commit hash.** Где возможно — фиксировать конкретный коммит, не `main`:
   ```bash
   /plugin install obra/superpowers#v5.1.0
   ```
   (vs `obra/superpowers` который тянет `main` HEAD)
7. **Scope.** Сначала ставить `--scope user` на тестовом проекте, не сразу на этом.

---

## Permissions hygiene

В `.claude/settings.json` ограничить что 3rd-party скилл может делать:

```json
{
  "permissions": {
    "deny": [
      "Read(/Users/dmitrii_malykhin/.aws/**)",
      "Read(/Users/dmitrii_malykhin/.ssh/**)",
      "Read(/Users/dmitrii_malykhin/.gnupg/**)",
      "Read(**/.env)",
      "Read(**/.env.*)",
      "Read(**/secrets/**)",
      "Bash(curl http://*)",
      "Bash(curl https://*)"
    ]
  }
}
```

`deny` всегда побеждает `allow`. Этот snippet прерывает обращение к credentials и outbound HTTP-вызовы из bash (которые иногда добавляют скиллы для "analytics").

**Исключения для outbound HTTP** делать явно через allow только для нужных доменов (`api.stripe.com`, `api.github.com`, etc.).

---

## Audit log

Раз в месяц проверять, что Claude фактически запускал:

```bash
# Anthropic CLI пишет telemetry в ~/.claude/telemetry/
ls -la ~/.claude/telemetry/
ls -la ~/.claude/projects/<this-project>/sessions/
```

Подозрительные вещи:
- Чтения из `.aws/`, `.ssh/`, `.gnupg/`
- Bash-команды с outbound `curl` к незнакомым доменам
- Чтения `.env` файлов

---

## Что делать при подозрении на компрометацию

1. **Сразу:** удалить подозрительный плагин — `/plugin uninstall <name>`.
2. Очистить кэш: `rm -rf ~/.claude/plugins/<name>` и `rm -rf ~/.claude/cache/`.
3. Ротировать credentials:
   - `git config --global --list` — проверить URL remotes
   - AWS: `aws iam list-access-keys && aws iam delete-access-key ...`
   - GitHub PAT
   - Stripe API keys
   - `.env` файлы — все секреты
4. Проверить shell history: `history | grep -i 'claude\|curl\|wget'`
5. Сообщить:
   - Anthropic security: security@anthropic.com (если был официальный плагин)
   - GitHub Trust & Safety (если репо)

---

## Резюме одной строкой

**Default deny.** Любой плагин, не входящий в whitelist, рассматривается как malicious пока не доказано обратное.
