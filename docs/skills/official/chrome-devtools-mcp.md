# chrome-devtools-mcp

**Priority:** P1 — для Core Web Vitals.

## Что делает

MCP-обёртка над Chrome DevTools Protocol:
- Performance profiling: LCP, CLS, INP, TTFB
- Lighthouse-style audits
- Network waterfall
- Coverage (unused CSS/JS)
- Heap snapshots

Альтернатива manual Lighthouse audits — Claude может сам запустить и проинтерпретировать.

## Установка

```bash
/plugin install chrome-devtools-mcp@claude-plugins-official --scope project
```

Требует Chrome/Chromium в `$PATH`.

## Когда применять

### W4 — после первого product page

Проверка дефолтных Core Web Vitals:

```
Открой http://localhost:3100/products/silver-moonstone-ring и сделай Lighthouse audit. Покажи LCP, CLS, FID. Если LCP > 2.5s — найди что блокирует.
```

### W8 — Issue #38 (Lighthouse)

Закрывает задачу — вместо manual прогона:

```
Прогон Lighthouse audit для топ-10 product страниц + home + categories. Создай отчёт с целевыми метриками: LCP < 2.5s, CLS < 0.1, INP < 200ms.
```

### W10 — Pre-launch

Регрессионный прогон. Если CWV деградировали — `code-review` поможет найти причину.

## Что покрывает наш стек

| Метрика | Где может пострадать | Что увидит chrome-devtools-mcp |
| --- | --- | --- |
| LCP | First image на product page не `priority` | `<img>` без `fetchpriority="high"` |
| CLS | `next/image` без явных width/height | Layout shifts в timeline |
| INP | Heavy client component в `_client.tsx` | Long tasks (>50ms) на main thread |
| TTFB | Server Component с медленной БД query | Slow `apps/api` response |

Каждое из этих — мапится на правило в CLAUDE.md ("первое изображение `priority={true}`", "explicit width/height для prevention CLS"). Плагин подсказывает где правило нарушено.

## Trade-offs

- Lighthouse score ≠ production score (lab vs field data). Для field data нужны Web Vitals из GA4 / PostHog
- Performance профилирование heavyweight — не запускать на каждый PR

## Источник

- https://code.claude.com/docs/en/discover-plugins
- https://github.com/ChromeDevTools/chrome-devtools-mcp
