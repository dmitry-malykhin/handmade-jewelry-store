# Analytics event verification — 2026-07 (#362)

Code-audit + manual verification checklist for the analytics stack: PostHog,
GA4, Facebook Pixel, Klaviyo, Microsoft Clarity, Pinterest. Cookie-consent
gate covered too.

## Code-audit finding (P0, filed as #370)

**Only PostHog actually dispatches e-commerce events.** GA4, FB Pixel,
Klaviyo, and Pinterest have working init components (SDK loads when
consent is granted) and typed wrapper functions in `lib/analytics/*.ts`,
but **no call site invokes any of the wrappers**. Result: after "Accept
all", the SDKs load; only FB Pixel's automatic `PageView` fires;
`add_to_cart`, `view_item`, `begin_checkout`, `purchase` all silently drop.

Blocks conversion attribution for every paid channel (Google Ads, Meta
Ads) and every Klaviyo abandoned-cart flow.

Filed as **#370** — wire GA4 + FB Pixel + Klaviyo + Pinterest dispatchers.

## Cookie-consent gate — audit result ✅

Consent store: `apps/web/src/store/cookie-consent.store.ts` — Zustand
`persist` with two independent flags: `analytics` (PostHog, GA4, Clarity)
and `marketing` (FB Pixel, Klaviyo, Pinterest). `hasDecided` gates the
banner itself.

Every init component reads the appropriate flag and short-circuits when
consent isn't granted:

| Init component                                  | Gate hook               | Category    |
| ----------------------------------------------- | ----------------------- | ----------- |
| `components/analytics/posthog.tsx`              | `useAnalyticsConsent`   | analytics   |
| `components/analytics/google-analytics.tsx`     | `useAnalyticsConsent`   | analytics   |
| `components/analytics/microsoft-clarity.tsx`    | `useAnalyticsConsent`   | analytics   |
| `components/analytics/facebook-pixel.tsx`       | `useMarketingConsent`   | marketing   |
| `components/analytics/klaviyo.tsx`              | `useMarketingConsent`   | marketing   |
| `components/analytics/pinterest-tag.tsx`        | `useMarketingConsent`   | marketing   |

PostHog additionally handles **revocation**: `opt_out_capturing() + reset()`
if consent flips off in the same session (prior identified profile can't
resurface).

**No dispatch bypasses found:** every `lib/analytics/*.ts` wrapper checks
`typeof window !== 'undefined'` and `window.gtag / window.fbq / window._learnq
/ posthog.__loaded` before invoking the SDK — so a dispatch call that fires
before the SDK loads (or with consent revoked) is a clean no-op.

## Full e-commerce event taxonomy

`✅` = dispatched today. `❌` = wrapper exists but no call site invokes it
(scope of #370). `—` = intentionally not supported for this channel.

| User action        | Call site                                                                                    | PostHog                       | GA4                     | FB Pixel                    | Klaviyo                     | Pinterest                 |
| ------------------ | -------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------- | --------------------------- | --------------------------- | ------------------------- |
| Product page view  | `products/[slug]/_components/product-view-tracker.tsx`                                       | ✅ `product_viewed`           | ❌ `view_item`          | ❌ `ViewContent`            | ❌ `Viewed Product`         | —                         |
| Add to cart        | `components/features/cart/add-to-cart-button.tsx`                                            | ✅ `product_added_to_cart`    | ❌ `add_to_cart`        | ❌ `AddToCart`              | ❌ `Added to Cart`          | ❌ `AddToCart`            |
| Checkout started   | `[locale]/checkout/_components/checkout-entry.tsx`                                           | ✅ `checkout_started`         | ❌ `begin_checkout`     | ❌ `InitiateCheckout`       | ❌ `Started Checkout`       | —                         |
| Order placed       | `[locale]/checkout/confirmation/[orderId]/_components/order-placed-tracker.tsx`              | ✅ `order_placed`             | ❌ `purchase`           | ❌ `Purchase`               | ❌ `Placed Order`           | ❌ `Checkout`             |

## Server-side events (auth-verified, not affected by #370)

Fired by `apps/api/src/analytics/analytics.service.ts` from the Stripe
webhook handler and the refund flow — bypasses client tampering, so they
are the source of truth for revenue.

| Event                 | Fired from                                | Notes                                    |
| --------------------- | ----------------------------------------- | ---------------------------------------- |
| `payment_succeeded`   | `stripe/stripe-webhooks.service.ts`       | Webhook-verified Stripe event            |
| `order_refunded`      | `orders/orders-refunds.service.ts`        | Fires whether the refund is admin- or auto-triggered |

## Manual verification checklist (browser)

Run on the local prod build from the smoke sweep (#361), or on staging.

### 1. Cookie consent gate — three modes

Open DevTools → Network → filter `posthog | google-analytics | facebook |
klaviyo | clarity | pinterest`.

- [ ] **Pre-decision:** on first visit, no scripts from any of the six
  hosts appear in Network. `window.posthog`, `window.gtag`, `window.fbq`,
  `window._learnq`, `window.clarity`, `window.pintrk` — all `undefined`
  from the DevTools console.
- [ ] **Accept all:** hit the banner "Accept all". All six scripts appear
  in Network. `window.posthog?.__loaded === true` after ~2 seconds. Reload
  — same scripts load again on next visit.
- [ ] **Reject all:** localStorage → clear `cookie-consent` key, reload,
  hit "Reject all". No script requests to the six hosts. Prior sessions
  cleared (PostHog: `opt_out_capturing()` visible in `posthog._` debug).

### 2. E-commerce funnel (after Accept all)

After the fix in #370 lands, every action below should hit **all four**
channels (PostHog + GA4 + FB Pixel + Klaviyo). Until #370 lands, only the
PostHog column is expected.

- [ ] `/en/products/black-onyx-statement-pendant` → PostHog Live Events
  shows `product_viewed` with `product_id`, `product_slug`, `price_usd`.
  (After #370: GA4 `view_item`, FB `ViewContent`, Klaviyo `Viewed Product`)
- [ ] Click "Add to cart" → PostHog `product_added_to_cart` with
  `line_value_usd = price * quantity`.
  (After #370: GA4 `add_to_cart`, FB `AddToCart`, Klaviyo `Added to Cart`, Pinterest `AddToCart`)
- [ ] Navigate to `/en/checkout` with a non-empty cart → PostHog
  `checkout_started` with `cart_item_count`, `cart_total_usd`.
  (After #370: GA4 `begin_checkout`, FB `InitiateCheckout`, Klaviyo `Started Checkout`)
- [ ] Complete checkout with Stripe test card → PostHog `order_placed` with
  `order_id`, `total_usd`, `item_count`, `shipping_cost_usd`.
  (After #370: GA4 `purchase`, FB `Purchase`, Klaviyo `Placed Order`, Pinterest `Checkout`)

### 3. Klaviyo double-opt-in

- [ ] Footer newsletter subscribe with a test address → `POST` to
  `klaviyo.com/client/subscriptions/...` returns 202. Inbox: confirmation
  email arrives from the Klaviyo test list.

### 4. Server-side events

- [ ] Complete checkout → PostHog Live Events shows `payment_succeeded`
  from the API (distinct_id = user id or guest email).
- [ ] Admin issues partial refund → PostHog Live Events shows
  `order_refunded` with `is_full_refund: false`, correct `refund_amount_usd`.

### 5. Session recording (Clarity + PostHog)

- [ ] Clarity dashboard shows a session for the just-completed checkout.
- [ ] PostHog session replay masks all form inputs (product page: no; cart:
  no; checkout: masked address and card iframe).

### 6. Sanity checks

- [ ] `pnpm --filter web build` completes without the env vars set
  (analytics all default to disabled in prod when the key is empty).
- [ ] Dev-server (`pnpm --filter web dev`) does not emit real analytics
  events — verify with the same Network filter.

## Bugs found (fill in as you find them)

- **#370 (P0, filed):** GA4 / FB Pixel / Klaviyo / Pinterest have zero
  event dispatch call sites — SDKs load but only the FB Pixel auto-`PageView`
  fires. Blocks conversion attribution and Klaviyo flows.
- (add more as they surface)

## How to re-run

```bash
# 1. boot the prod stack (see docs/reports/smoke-sweep-2026-07.md)
# 2. open http://localhost:3100/en in a fresh incognito window
# 3. DevTools → Application → Storage → Clear site data (fresh consent state)
# 4. walk section 1 → 6 with DevTools → Network filter listed above
# 5. record each ☐ result inline in this file; capture any bug in "Bugs found"
```
