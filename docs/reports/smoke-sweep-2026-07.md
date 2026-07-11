# Pre-launch smoke sweep — 2026-07 (#361)

Automated pass is fresh; the manual checklist is unchecked and waiting for a
real human hand to run through the browser (Stripe test cards, inboxes,
Sentry dashboard — nothing here can be verified from a CLI).

## Environment used for this pass

- API: `pnpm --filter api dev` on :4000 with the local Postgres seed.
- Web: `pnpm --filter web build` + `next start -p 3100` (production build).
- E2E: Playwright with `PLAYWRIGHT_BASE_URL=http://localhost:3100` — the
  config now skips its built-in `webServer` when the env var is set, so
  tests hit the same prod build a human would exercise.

## Automated results (this run)

| Check                                                     | Result |
| --------------------------------------------------------- | ------ |
| Web `pnpm --filter web build` (production, prod CSP)      | ✅     |
| API `/api/health` responds 200                            | ✅     |
| Playwright — Desktop Chrome, all suites                   | **38 / 38 passed** |
| Playwright — Mobile iPhone (chromium device profile)      | 39 passed, 16 intentionally skipped (admin panel + reviews are desktop-only in MVP scope) |
| Prod build renders the 5 audited pages (home, product, checkout, /account/orders, about) with 200 OK | ✅ |

The Playwright suite covers: homepage locales, header/footer nav, mobile
sidebar, language switch (en/ru/es), theme toggle + persistence, wishlist
CRUD, reviews CTA gates by auth+eligibility, admin login → dashboard →
products list → orders detail + status transitions, add-to-cart → cart →
checkout gateway → guest address form validation → order summary sidebar.

## Manual checklist — customer path

Use `http://localhost:3100` locally, or point at your staging URL. Stripe
test card: `4242 4242 4242 4242`, any future expiry, any CVC.

- [ ] Home (`/en`) loads, hero visible, product grid renders 6 seeded items
- [ ] Click a product → PDP renders images, price in USD, "Add to cart" enabled
- [ ] Click "Add to cart" → cart badge updates, mini-cart drawer confirms item
- [ ] `/en/cart` — quantity `+/−` works, `Remove` clears the row, subtotal recalculates
- [ ] Click "Proceed to checkout" → guest/sign-in gateway appears (unless already signed in)
- [ ] Guest checkout — address form validates required fields (name, address, city, postcode, country, phone, email)
- [ ] Estimated delivery date shows the production + shipping breakdown lines
- [ ] Shipping method step — Standard vs Express prices differ; Free-shipping banner triggers over the threshold
- [ ] Payment step — Stripe Elements loads (no CSP `worker-src` error in console — fixed in #360)
- [ ] Enter `4242 4242 4242 4242`, submit → redirect to `/checkout/confirmation/:orderId`
- [ ] Confirmation page shows order id, order status, delivery estimate
- [ ] **Inbox check** — order confirmation email arrived from Resend (subject + order id + items table)
- [ ] Newsletter footer subscribe → Klaviyo double-opt-in confirmation email arrives
- [ ] Cookie banner appears on first visit; "Reject" disables PostHog/GA4/FB Pixel (checked with DevTools Network filter on `posthog.com`, `google-analytics`, `facebook.com/tr` — no requests)

## Manual checklist — admin path

Admin credentials come from `apps/api/prisma/seed.ts`. Log in at `/en/login`
then navigate.

- [ ] `/en/admin` — stats cards render numbers, no red error banner
- [ ] Open the newly-created order in `/en/admin/orders/:id`
- [ ] Timeline shows `PENDING → PAID` (webhook wrote it), address block matches customer input
- [ ] Change status `PAID → PROCESSING` → the timeline gets a new entry, button set updates
- [ ] `Purchase label` (dry-run mock) → tracking number appears on the order
- [ ] Change status → `SHIPPED` → **inbox check** — customer got shipping notification email with tracking number
- [ ] `Refund` → pick "Item damaged" reason, partial amount → confirmation, refund row appears in `/en/admin/orders/refunds`
- [ ] **Inbox check** — customer got refund-processed email
- [ ] **Stripe test dashboard** — refund visible under Payments → the PaymentIntent's Refunds tab
- [ ] `/en/admin/analytics` — revenue chart draws, order status breakdown pie shows non-zero slices, top products table populated
- [ ] `/en/admin/orders/production` — MTO items appear with the ETA countdown

## Manual checklist — cross-cutting

- [ ] Theme toggle in the header — 5 different pages don't have any raw color that stays fixed in dark mode (no white/gray-200 elements)
- [ ] Locale switch on the same 5 pages — no hardcoded English strings visible under RU or ES
- [ ] Mobile viewport 375px (iPhone SE) — checkout flow doesn't overflow horizontally, sticky bottom CTA visible
- [ ] Sentry `/en` with `?throwtest=1` (or hitting any known error path) — event lands under Issues in Sentry dashboard, tagged with app version + release
- [ ] Sentry API — trigger `/api/orders/invalid` → server-side error captured with correlation id
- [ ] Cookie consent — after `Accept all`, PostHog Live Events shows `product_viewed`, `add_to_cart`, `checkout_started`, `order_placed` (this overlaps with #362 — do the deep event verification there)

## What you cannot check with a local stack

- **Real Stripe test dashboard** requires a real Stripe test account with a working webhook secret. If your `.env.local` uses the shared team key, the events show up there; otherwise the Payment succeeds locally but there's no dashboard to look at.
- **CDN cache invalidation** — Vercel edge cache doesn't exist locally. Sanity check must happen on a staging or preview deploy before launch.
- **Real email deliverability** — Resend's local dev key emits to a test inbox, not to the customer's real address. On staging you can point Resend at your own inbox for verification.
- **Klaviyo double-opt-in** — Klaviyo test lists show the profile but the confirmation email goes to whatever email you subscribed with; check that inbox, not the API response.

## Bugs found (fill in as you find them)

None yet — leave a bullet for each P0/P1 found and either fix in a small PR
or file an issue with the reproduction steps.

- (empty)

## How to re-run

```bash
# 1. boot the stack (kill anything else on :3100/:4000 first if needed)
export NO_PROXY='localhost,127.0.0.1,::1'
pnpm --filter api dev &
pnpm --filter web build
pnpm --filter web exec next start -p 3100 &

# 2. run E2E against the prod build
PLAYWRIGHT_BASE_URL=http://localhost:3100 \
  pnpm --filter web exec playwright test --project="Desktop Chrome"

# 3. open the app in a real browser at http://localhost:3100 and walk the
#    manual checklist above. Check each box; capture any bug in the "Bugs
#    found" section with a one-line repro.
```
