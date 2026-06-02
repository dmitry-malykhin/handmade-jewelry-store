# klaviyo-flow-spec (custom)

**Effort:** low. **Impact:** medium.

## Что делает

Генерит спецификацию Klaviyo flow:
- Trigger event (matches наш analytics taxonomy)
- Шаги (delay, send, condition)
- Сегменты
- Email templates (ссылки на `resend-template` если cross-use)
- Заводит соответствующие `track-event` если их ещё нет

## Trigger

- User: `/klaviyo-flow abandoned-cart` или "сделай welcome flow в Klaviyo"

## SKILL.md

````markdown
---
name: klaviyo-flow-spec
description: Use when designing a Klaviyo marketing flow (welcome, abandoned cart, post-purchase, win-back). Generates a full spec with trigger event (from our analytics taxonomy), step-by-step flow, segments, email templates, and ensures the trigger event is registered via /track-event.
---

# klaviyo-flow-spec

## Inputs

1. **Flow name** — `welcome`, `abandoned-cart`, `post-purchase`, `win-back`, `birthday`, `back-in-stock`.
2. **Trigger event** — from our taxonomy (`signup`, `add_to_cart`, `purchase`, etc.).
3. **Duration** — total flow length (e.g. abandoned-cart: 24h-72h).

## Output: spec file

`docs/klaviyo-flows/<flow-name>.md`:

```markdown
# Klaviyo Flow: Abandoned Cart Recovery

## Trigger
**Event:** `add_to_cart`
**Condition:** Customer hasn't completed `purchase` within 1 hour after `add_to_cart`

## Audience filter
- Subscribed to email marketing (consent given)
- Hasn't purchased in last 24h
- Cart value >= $20

## Steps

### Step 1 — Wait 1 hour
Then check: has customer purchased? If yes — exit flow.

### Step 2 — Send "Forgot something?" email
**Subject:** "Forgot something? Your cart is waiting"
**Template:** `abandoned-cart-1` (R.Email + Resend OR Klaviyo native template)
**Content:** Cart items + image + CTA "Complete purchase"
**Locale:** based on `$language` profile attribute

### Step 3 — Wait 24 hours
Check: purchased? If yes — exit.

### Step 4 — Send "Last chance" email + 10% discount
**Subject:** "Save 10% on the pieces you loved"
**Template:** `abandoned-cart-2`
**Content:** Cart items + discount code (unique per customer, valid 48h)
**CTA:** "Use code SAVE10"

### Step 5 — Wait 48 hours
Check: used discount? If yes — exit.

### Step 6 — Send "We saved your cart" final
**Subject:** "Your cart will expire soon"
**Template:** `abandoned-cart-3`
**Content:** Cart items + "Your items will be released for other customers in 24h"

### Step 7 — Exit
Tag profile with `abandoned-cart-completed` for analytics.

## Conversion event
`purchase` event with same `cart_id` as `add_to_cart` event.

## Reporting
- Track open rate, click-through rate, conversion rate per email
- A/B test subject lines after first 200 sends

## Compliance
- Unsubscribe link in every email
- CAN-SPAM physical address in footer
- GDPR: discontinue if customer unsubscribes
- Cooling period: don't send to same profile more than once per 7 days
```

## Hard rules

1. **Every flow has clear exit conditions** — don't trap customers
2. **Trigger event must be in `apps/web/src/lib/analytics/taxonomy.ts`** — if missing, invoke `/track-event` first
3. **Cooling period** between flows (don't bombard)
4. **Localized** per profile `$language`
5. **Compliance footer** mandatory
6. **Conversion tracking** linked to specific event with attribution window
7. **A/B test plan** included from start

## Priority flows (per docs/16)

1. **Welcome** — sign-up → 3 emails over 5 days (intro brand, story, first purchase incentive)
2. **Abandoned cart** — add_to_cart no purchase → 3 emails over 72h (above)
3. **Post-purchase** — purchase → confirmation + shipping updates + 30d follow-up
4. **Win-back** — last_purchase > 60 days → 2 emails over 14 days
5. **Birthday** — birthday date → 1 email + 15% off
6. **Back-in-stock** — out_of_stock product becomes in_stock + customer signed up → 1 email
````

## Зависимости

- Klaviyo account
- Events emitted via `/track-event` skill in production
- Email templates via `/resend-template` или Klaviyo native

## Источник

- docs/16_USER_ANALYTICS.md (Klaviyo flows priority table)
- Klaviyo flows documentation
