# stripe (plugin)

**Priority:** P0.

## Что делает

Полный wrapper над Stripe API через MCP:
- Создание/листинг products, prices, customers
- Создание payment intents, checkout sessions
- Симуляция webhooks (нужно для отладки order state transitions)
- BNPL: Klarna/Afterpay session creation
- Test card scenarios (`4000 0000 0000 0341` — declined, etc.)

Скиллы для типичных задач: создать тестового кастомера, симулировать failed payment, проверить webhook signature.

## Установка

```bash
/plugin install stripe@claude-plugins-official --scope project
```

Auth:

```bash
# 1. Создать Restricted Key (test mode!): https://dashboard.stripe.com/test/apikeys
#    Scopes: write для products, prices, payment_intents, customers, checkout sessions, webhooks
# 2. Сохранить в keychain
security add-generic-password -a stripe-mcp-test -s claude-mcp -w "rk_test_..."

# 3. Plugin подхватит при первом использовании, либо вручную:
claude mcp add stripe \
  -e STRIPE_SECRET_KEY="$(security find-generic-password -a stripe-mcp-test -w)" \
  -- npx -y @stripe/mcp --tools=all
```

**ВАЖНО:** только test mode. Production keys никогда не давать MCP-серверу.

## Когда применять

### W4-W5 — Product → Cart

Создание тестовых продуктов (метаданные совпадают с нашими):

```
Создай в Stripe test mode продукт "Sterling Silver Moonstone Ring" с прайсами:
- USD $89.00
- EUR €82.00 (включая VAT)
- цена в Klarna split into 4 — 22.25 USD каждый
Metadata: { jewelry_category: "ring", measurement_metric: true }
```

### W6 — Stripe backend (#70, #71, #126)

- Тестировать webhook handlers: симулировать `payment_intent.succeeded`, `charge.dispute.created`, `checkout.session.completed`
- Проверять state transitions согласно docs/08
- Создавать тестовые BNPL flows

### W7+ — Refunds, partial refunds

```
Симулируй частичный refund $30 от payment_intent pi_xxx
и покажи какие webhook events будут эмитированы
```

## Интеграция с custom skill

Использовать с custom [stripe-webhook-handler.md](../custom/stripe-webhook-handler.md):
- `stripe` plugin создаёт payment intent / webhook event
- `stripe-webhook-handler` skill пишет handler-код в `apps/api/src/payments/`
- Проверка идемпотентности через таблицу `WebhookEvent`

## Что НЕ делать

- ❌ Никогда не подключать production secret key
- ❌ Не создавать live customers/charges через MCP (даже случайно)
- ❌ Не использовать MCP для refund на live charges (run только через admin UI с явным подтверждением)
- ❌ `stripe.test` keys тоже не коммитить — keychain only

## Trade-offs

- Тестовые сценарии BNPL ограничены: Klarna и Afterpay в test mode иногда расходятся с production behavior. Smoke-тест production обязателен после go-live.
- MCP не покрывает Stripe Tax (по состоянию на 2026-06). VAT-вычисления — отдельно.

## Источник

- https://code.claude.com/docs/en/discover-plugins
- https://github.com/stripe/agent-toolkit
- docs/08_ORDER_STATUS_MODEL.md — какие webhook events маппятся на какие статусы
- docs/runbooks/stripe-bnpl-setup.md — настройка BNPL
