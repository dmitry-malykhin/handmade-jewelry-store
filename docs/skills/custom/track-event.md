# track-event (custom)

**Priority:** 4 (top-5).
**Effort:** medium.
**Impact:** high — events живут в 5 системах (PostHog, GA4, FB Pixel, Pinterest, Klaviyo). Один источник правды критичен ДО включения paid ads.

## Что делает

Единая точка для analytics events:

1. Добавляет событие в taxonomy registry (`apps/web/src/lib/analytics/taxonomy.ts`)
2. Генерирует typed payload (Zod schema + TypeScript type)
3. Создаёт `trackXxx(payload)` helper
4. Fan-out в адаптеры: `posthog | gtag | fbq | pintrk | klaviyo`
5. Уважает cookie consent gate
6. Обновляет docs/16_USER_ANALYTICS.md таблицу

## Trigger

- User: `/track add_to_cart` или "добавь event purchase в analytics"
- Auto-suggest когда юзер пишет аналитический код руками

## Установка

Создать `.claude/skills/track-event/SKILL.md`:

````markdown
---
name: track-event
description: Use when user adds analytics tracking, mentions PostHog/GA4/FB Pixel/Pinterest/Klaviyo events, or types /track <event>. Adds a single event to the taxonomy registry (apps/web/src/lib/analytics/taxonomy.ts) and fans out to all configured adapters with the cookie-consent gate respected.
---

# track-event

## Inputs

1. **Event name** — snake_case (`add_to_cart`, `begin_checkout`, `purchase`, `view_item`).
2. **Payload schema** — fields and types. If not provided, infer from event semantics (GA4 Enhanced Ecommerce convention is the default for e-commerce events).
3. **Trigger location** — file path where this event will be emitted.
4. **Adapters** — which to fan out to. Default: all (`posthog`, `gtag`, `fbq`, `pintrk`, `klaviyo`).

## Single source of truth

`apps/web/src/lib/analytics/taxonomy.ts`:

```ts
import { z } from 'zod'

const ItemSchema = z.object({
  item_id: z.string(),
  item_name: z.string(),
  item_brand: z.string().default('Handmade Jewelry'),
  item_category: z.string(),
  price: z.number(),  // dollars, not cents — analytics convention
  quantity: z.number().int().min(1),
})

export const eventTaxonomy = {
  add_to_cart: {
    schema: z.object({
      currency: z.literal('USD'),
      value: z.number(),
      items: z.array(ItemSchema),
    }),
    adapters: ['posthog', 'gtag', 'fbq', 'pintrk', 'klaviyo'],
    description: 'Fired when user adds item to cart',
    gdpr: 'analytics-cookies-required',
  },
  // ...
} as const

export type EventName = keyof typeof eventTaxonomy
export type EventPayload<E extends EventName> =
  z.infer<typeof eventTaxonomy[E]['schema']>
```

## Adapter behaviour

Each adapter in `apps/web/src/lib/analytics/adapters/`:

```ts
// posthog.ts
export function trackPosthog<E extends EventName>(
  event: E,
  payload: EventPayload<E>
): void {
  if (typeof window === 'undefined') return
  if (!hasConsent('analytics')) return
  window.posthog?.capture(event, payload)
}

// gtag.ts — GA4 Enhanced Ecommerce mapping
// fbq.ts — Meta Pixel event mapping
// pintrk.ts — Pinterest Tag mapping
// klaviyo.ts — Klaviyo identify + track
```

## `trackXxx(payload)` helper

For each event, generate a typed wrapper in `apps/web/src/lib/analytics/track.ts`:

```ts
export function trackAddToCart(payload: EventPayload<'add_to_cart'>) {
  // Validate at runtime (catches bugs before they ship to 5 destinations)
  eventTaxonomy.add_to_cart.schema.parse(payload)

  trackPosthog('add_to_cart', payload)
  trackGtag('add_to_cart', payload)
  trackFbq('AddToCart', mapToMetaFormat(payload))
  trackPintrk('AddToCart', mapToPinterestFormat(payload))
  trackKlaviyo('add_to_cart', payload)
}
```

## Hard rules

1. **No `any`**. No `Object.keys(payload).forEach(window.gtag)` shortcuts.
2. **Cookie consent**. Every adapter checks `hasConsent('analytics')` first. No exceptions.
3. **No direct `window.gtag` / `window.fbq`** outside `adapters/`.
4. **Currency always USD** in payload. Display conversion is a SEPARATE concern.
5. **Wrap in try/catch** at adapter level — analytics MUST NEVER break UX.
6. **Use GA4 Enhanced Ecommerce schema** for e-commerce events (`view_item`, `add_to_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`, `refund`).
7. **Update docs/16_USER_ANALYTICS.md** taxonomy table with the new event.
8. **Update CLAUDE.md guard rails if introducing new event type** that requires special handling.

## Cookie consent map

| Event | Cookies needed |
| --- | --- |
| `page_view` | none (PostHog can run with anon ID even pre-consent if configured so) |
| `add_to_cart`, `purchase`, etc. | `analytics-cookies` granted |
| Klaviyo profile | `marketing-cookies` granted (separate consent) |
| FB Pixel / Pinterest | `marketing-cookies` granted |

Adapters MUST check the right granular consent. Don't lump all into "analytics".

## Output format

After scaffolding:

```
✓ Added event "add_to_cart" to taxonomy
✓ Generated trackAddToCart() helper in lib/analytics/track.ts
✓ Mapped to GA4 / Meta / Pinterest / PostHog / Klaviyo formats
✓ Updated docs/16_USER_ANALYTICS.md table
✓ Cookie consent gate: analytics required

Usage:
  trackAddToCart({
    currency: 'USD',
    value: 89.00,
    items: [{ item_id: 'sku-123', ... }]
  })
```
````

## Trade-offs

- Зависит от cookie consent infrastructure (Issue #107). До неё — skill можно использовать, но `hasConsent(...)` всегда возвращает `false` для marketing-cookies, события не уйдут в FB/Pinterest
- GA4 Enhanced Ecommerce schema жёсткая. Custom dimensions (jewelry-specific: material, gemstone, ring_size_us) — отдельно

## Зависимости

- Cookie consent banner — Issue #107
- `posthog-js`, `react-pixel-helper`, `react-pinterest-tag`, `react-ga4` (или ручные snippets) — все в `apps/web/package.json`
- Klaviyo Track API key

## Источник

- docs/16_USER_ANALYTICS.md
- GA4 Enhanced Ecommerce reference
