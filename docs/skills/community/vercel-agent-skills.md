# vercel-labs/agent-skills

**Priority:** P0.
**Source:** github.com/vercel-labs/agent-skills (27.4k ★).
**Author:** Vercel Labs — vendor-owned org, доверенный.

## Что делает

Подборка skills под Next.js / React workflows:

| Skill | Покрытие |
| --- | --- |
| `react-best-practices` | 40+ perf-правил: avoiding waterfalls, RSC, bundle size, Suspense boundaries |
| `web-design-guidelines` | 100+ a11y/UX rules: focus states, touch targets, contrast, motion |
| `composition-patterns` | Compound components, render props, slot patterns |
| `nextjs-app-router` | App Router specifics: layouts, parallel routes, streaming |
| `server-components-rules` | RSC do's/don'ts (client-only modules, hydration mismatch) |

## Установка

```bash
npx skills add vercel-labs/agent-skills --scope project
```

Или manually:

```bash
git clone https://github.com/vercel-labs/agent-skills /tmp/vercel-skills
cp -r /tmp/vercel-skills/skills/* .claude/skills/
```

После — перезапустить Claude сессию.

## Совпадение с правилами CLAUDE.md

| Наше правило | Vercel skill |
| --- | --- |
| `'use client'` only when needed | `server-components-rules` |
| `next/image` always | `react-best-practices` |
| First image `priority` | `react-best-practices` (LCP) |
| `useEffect` not for fetching | `react-best-practices` |
| Semantic HTML | `web-design-guidelines` |
| Explicit width/height | `web-design-guidelines` (CLS) |
| One component per file | `composition-patterns` |

Skills усиливают правила — Claude получает дополнительный контекст при правке React-кода и предлагает рефакторинги.

## Использование

Skills активируются автоматически на правках `.tsx` в `apps/web/`. Можно явно:

```
/react-best-practices — проверь ProductCard на perf-anti-patterns
```

```
/web-design-guidelines — проверь форму checkout на a11y
```

```
/composition-patterns — отрефакторь Modal в compound component
```

## Конфликты

Иногда советы Vercel skills конфликтуют с нашими правилами (Vercel пропагандирует `next/dynamic` шире, чем мы хотели бы, а мы предпочитаем явный `_client.tsx` split). В таких случаях — приоритет у CLAUDE.md, а skill используем как "second opinion".

## Trade-offs

- 40+ правил — много контекста. Skills сами выбирают релевантные, но иногда выводят шумно
- React 19 / Next 15 — самый свежий стек, не всё ещё покрыто на 100%. Часть правил из эры 14.x
- Часть skills (`server-components-rules`) overlaps с `context7` для App Router — нет конфликта, дополняют

## Источник

- https://github.com/vercel-labs/agent-skills
- (репо имеет 27.4k звёзд — топ-3 в категории community React skills)
