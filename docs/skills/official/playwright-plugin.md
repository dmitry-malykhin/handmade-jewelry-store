# playwright (plugin)

**Priority:** P1.

## Что делает

Browser automation MCP (Microsoft-built):
- Открывает реальный браузер (Chromium/Firefox/WebKit)
- Снимает скриншоты
- Выполняет user flow: type, click, navigate
- Извлекает текст / DOM
- Trace recording (для отладки)

## Установка

```bash
/plugin install playwright@claude-plugins-official --scope project
```

Требует `@playwright/test` установлен в проекте (у нас он уже есть для E2E).

## Когда применять

### W4-W7 — Разработка UI

Альтернатива `/verify`:

```
Открой http://localhost:3100/products/silver-moonstone-ring, проверь что цена отображается, кнопка "Add to cart" работает, и сделай скриншот для PR
```

### W8 — SEO QA

```
Проверь что на http://localhost:3100/ru/products/silver-ring:
- title содержит "Серебряное кольцо"
- meta description заполнен
- canonical указывает на /ru/products/silver-ring
- JSON-LD валиден
```

### W10 — Pre-launch регрессии

Прогнать критичные user flows: signup → add to cart → checkout → payment.

## Пересечения

- **`/verify` (bundled)** — простой `run + open browser`. Playwright MCP — для сценариев с user input
- **`chrome-devtools-mcp`** — заточен под perf (Core Web Vitals). Playwright — под user flows
- **`apps/web/tests/e2e/`** — E2E тесты на Playwright. MCP не заменяет тесты, дополняет: тесты в CI, MCP — для ad-hoc QA во время разработки

## Trade-offs

- Browser binary занимает ~300 МБ диска
- Headless mode по умолчанию — Claude не показывает реальное окно. Для headed: `PWDEBUG=1`
- Не годится для нагрузочных тестов (это не Locust/k6)

## Источник

- https://code.claude.com/docs/en/discover-plugins
- https://github.com/microsoft/playwright-mcp
