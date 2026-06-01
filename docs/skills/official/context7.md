# context7

**Priority:** P0.

## Что делает

Library docs lookup с **версионной привязкой**. Решает главную беду Claude на свежем стеке: галлюцинации старых API.

Без context7 Claude часто:
- использует Pages Router синтаксис в App Router проекте
- путает Prisma 5 и Prisma 6 API
- предлагает `useEffect` для fetching (Next.js docs до App Router)
- использует deprecated `getStaticProps`

С context7 — Claude получает свежие доки конкретно для указанной версии библиотеки.

## Установка

```bash
/plugin install context7@claude-plugins-official --scope project
```

В проектный scope — потому что версии в `package.json` коммитятся, и хочется чтобы конфиг context7 был частью репо.

## Использование

Context7 экспонирует MCP-инструмент `resolve-library-id` + `get-library-docs`. Claude использует их **автоматически** когда формулирует ответ про библиотеку.

Можно явно подсказать в промпте:

```
Use context7 to verify the Next.js 15 App Router metadata API for the generateMetadata function.
```

## Покрытие стека

| Библиотека | Версия | Доступно в context7 |
| --- | --- | --- |
| Next.js | 15 | yes |
| React | 19 | yes |
| TypeScript | 5.7 | yes |
| NestJS | 11 | yes |
| Prisma | 6 | yes |
| TanStack Query | 5 | yes |
| Zustand | 5 | yes |
| Shadcn/ui | latest | yes |
| Tailwind | 4 | yes |
| Stripe | 2026-06 API | yes |
| next-intl | 4 | yes |
| Sentry SDK | 9 | yes |
| Playwright | 1.50 | yes |

(Список покрытия context7 расширяется — проверять `mcp list-resources context7`.)

## Когда особенно полезен

- Любой новый API из недавнего релиза библиотеки
- Когда Claude уверенно пишет код, который компилируется но deprecated
- При апгрейдах: "Что изменилось в Prisma 6 vs 5?"

## Trade-offs

- Каждый lookup — это HTTP к context7 servers. На медленном интернете заметно
- Не покрывает приватные либы (наш `packages/shared` — нет)
- Не заменяет понимание архитектуры — даёт фактические API, не паттерны

## Источник

- https://code.claude.com/docs/en/discover-plugins
- context7 — Upstash open-source проект, используется Anthropic в официальном marketplace
