# Lighthouse + CWV audit — 2026-07 (#360)

Baseline snapshot after 6 months of feature work since the previous audit
(#38, closed 2026-Q1). Prod build served from `next start`, no CDN,
mobile emulation, slow-4G throttling, Lighthouse `--preset=perf`.

## Setup

- Web build: `pnpm --filter web build` (Turbopack disabled).
- Web served: `next start -p 3100`.
- API: `pnpm --filter api dev` on :4000 with the local Postgres seed.
- Lighthouse CLI: `pnpm dlx lighthouse 13.4.0`, mobile form factor, simulated
  slow-4G throttling, headless Chromium.
- Raw JSON runs are kept under `docs/reports/lighthouse-runs/` (gitignored;
  regenerate with the commands in the "How to re-run" section).

Targets from AC:
- Performance ≥ 90 (mobile), Accessibility ≥ 95, SEO = 100 (except
  `/checkout`, which is `noindex`).
- LCP < 2.5 s · CLS < 0.1 · TTFB < 800 ms · TBT proxying INP < 200 ms.

## Baseline (before this PR)

| Page             | Perf | A11y | BP | SEO | LCP    | FCP    | TBT   | CLS   |
| ---------------- | ---- | ---- | -- | --- | ------ | ------ | ----- | ----- |
| /en              | 79   | 97   | 88 | 92  | 5381ms | 1063ms | 81ms  | 0.000 |
| /en/products/... | 77   | 94   | 88 | 92  | 6538ms | 1060ms | 99ms  | 0.000 |
| /en/checkout     | 72   | 97   | 69 | 92  | 6511ms | 909ms  | 248ms | 0.000 |
| /en/account/orders | 53 | 97   | 88 | 92  | 6246ms | 916ms  | 86ms  | 0.921 |
| /en/about        | 77   | 97   | 88 | 92  | 5841ms | 1057ms | 154ms | 0.000 |

## Fixed in this PR

Two regressions were cheap enough to fix in-scope. Everything else is filed
as a follow-up issue below (LCP / bundle work needs its own week).

### 1. CLS 0.92 → 0 on `/account/*` and `/admin/*`

`AccountAuthGuard` / `AdminAuthGuard` returned `null` before Zustand
rehydrated `accessToken` from `localStorage`. That left the footer glued
to the header on first paint; when hydration decided "authenticated" (or
kicked off a redirect) the layout jumped ~1 viewport downward.

Fix: guards now return a `min-h-screen` placeholder instead of `null`, so
the reserved space matches the eventual content and the footer stays put.

Confirmed with a fresh Lighthouse run: `/en/account/orders` CLS
`0.921 → 0.000`, Performance `53 → 79`.

### 2. `worker-src` missing in production CSP

Stripe Elements spawns a Web Worker from a `blob:` URL. The prod CSP had
no `worker-src` directive, so it fell back to `default-src 'self'` and the
worker was blocked, emitting a violation into the console — Lighthouse
counted this against Best-Practices on `/checkout` (69) and any page
served with the strict headers.

Fix: added `worker-src 'self' blob:` to `buildContentSecurityPolicy()`.
After: `/en/checkout` Best-Practices `69 → 73`, home BP `88 → 96`.

## Remaining gaps → follow-up issues

None of these are cheap in-scope fixes; each is filed as its own issue.

| Symptom                                     | Follow-up |
| ------------------------------------------- | --------- |
| LCP 5.3–6.5 s on every page (target 2.5 s)  | (see #364 — quick-win pass done, structural work still open) |
| Unused JavaScript 138–337 KiB per page      | (see #365) |
| Header/footer logo aspect-ratio mismatch    | (see #366) |
| `meta-description` reported missing by LH even though the tag is present in the SSR HTML | (see #367) |

## LCP re-audit after #364 quick-wins

Local prod build, same Lighthouse conditions as the baseline. Consent
banner not accepted (SDKs don't inject), `NEXT_PUBLIC_IMAGE_CDN_ORIGIN`
unset — so the deferred trackers and the preconnect from #364 **do not
emit in this measurement**. Numbers are within Lighthouse noise band.

| Page       | LCP baseline | LCP after-#364 | Δ       | Perf baseline | Perf after-#364 |
| ---------- | ------------ | -------------- | ------- | ------------- | --------------- |
| /en        | 5381 ms      | 6754 ms        | +1373 ms | 79            | 76              |
| /en/products/... | 6538 ms | 5812 ms       | −726 ms | 77            | 77              |
| /en/about  | 5841 ms      | 5965 ms        | +124 ms | 77            | 78              |

**Why the numbers barely moved:** the two levers #364 shipped only fire in
scenarios Lighthouse does not exercise:

1. **`strategy="lazyOnload"`** on FB Pixel / Clarity / Klaviyo / Pinterest
   only matters *after* the user accepts the cookie banner — Lighthouse
   never clicks it, so those `<Script>` tags are never emitted.
2. **`<link rel="preconnect">`** to the image CDN needs
   `NEXT_PUBLIC_IMAGE_CDN_ORIGIN` set — unset locally (seed uses
   placehold.co, no CDN in front). It'll emit on staging/prod once the R2
   host is configured.

Real-world impact will show up in field-metrics (RUM) after launch, not in
this synthetic baseline. To hit the 2.5 s LCP target we still need the
structural work in #365 (unused-JS 138–337 KiB) and dynamic-importing
Stripe/Sentry off the critical path — those stay in the follow-up queue.

## Unused-JS pass — #365 (Stripe removed from initial /checkout bundle)

Top unused-JS offender on `/checkout` in the baseline was Stripe.js at
**165 478 B (67.7% unused)** — every visitor entering `/checkout` paid the
download cost even if they abandoned before reaching the payment step.

Root cause: [checkout-entry.tsx](apps/web/src/app/[locale]/checkout/_components/checkout-entry.tsx)
statically imported `CheckoutPaymentForm`, which pulled `lib/stripe.ts` +
`@stripe/react-stripe-js` at initial parse. `stripePromise = getStripePromise()`
on module-scope then kicked off `loadStripe()` immediately.

Fix: `CheckoutPaymentForm` is now `next/dynamic({ ssr: false })`, so the
Stripe bundle and its ~165 KiB script only download when `flowState.step === 3`
(payment). Steps 1 (address) and 2 (shipping method) never touch it.

**Verified deltas on `/checkout`** (Lighthouse mobile, simulated slow-4G):

| Metric              | Before | After  | Δ         |
| ------------------- | ------ | ------ | --------- |
| Stripe.js in bundle | 165 478 B (top-1 unused-JS) | absent (0 entries) | fully removed |
| Performance         | 72     | 77     | +5        |
| Best-Practices      | 69     | 92     | +23 (CSP `worker-src` violation no longer fires at first paint) |
| LCP                 | 6511 ms | 6196 ms | −315 ms  |
| TBT                 | 248 ms | 106 ms | **−142 ms** — Stripe.js parse cost gone from critical path |
| First Load JS (build report) | 406 KB | 401 KB | −5 KB (page shell) + Stripe now async |

**Loading UX:** a two-block pulse-skeleton (identical to the one already
inside `CheckoutStripeForm`'s `isLoading` path) renders while the chunk
downloads — no layout shift, no blank frame.

**Remaining unused-JS on `/checkout`** (top items after this PR): three
shared framework chunks — 2504-*.js (~61 KiB, 48% unused), 6985-*.js
(~30 KiB, 84%), 7361-*.js (~34 KiB, 83%). These are shared vendor code
(React, Radix UI, next-intl, Sentry client) that can only be trimmed by
`next/dynamic` on tree-shake-unfriendly imports — separate pass when
Performance score reaches ≥ 85.

## How to re-run

```bash
# 1. boot the local stack
export NO_PROXY='localhost,127.0.0.1,::1'  # if you use a corp HTTP proxy
docker start jewelry_postgres              # if not already running
pnpm --filter api dev &                    # :4000
pnpm --filter web build
pnpm --filter web exec next start -p 3100 &

# 2. run Lighthouse against the five key pages
mkdir -p docs/reports/lighthouse-runs && cd docs/reports/lighthouse-runs
for pair in \
  "home:/en" \
  "product:/en/products/black-onyx-statement-pendant" \
  "checkout:/en/checkout" \
  "account-orders:/en/account/orders" \
  "about:/en/about"; do
  slug=${pair%%:*}; path=${pair##*:}
  pnpm dlx lighthouse "http://localhost:3100${path}" \
    --preset=perf --form-factor=mobile --screenEmulation.mobile=true \
    --throttling-method=simulate \
    --only-categories=performance,accessibility,best-practices,seo \
    --output=json --output-path="./${slug}.json" \
    --chrome-flags="--headless=new --no-sandbox" --quiet
done
```

## Local-run caveats

- No CDN in front, so LCP is uniformly pessimistic vs. a real Vercel deploy
  (edge cache would shave several hundred ms off cold TTFB). Treat these
  numbers as a floor for the metrics, not the ceiling.
- INP is not measured — Lighthouse reports TBT as a proxy. Real INP will
  need RUM (PostHog web-vitals or CrUX) after launch.

## Meta-description fix — #367

Baseline audit reported "Document does not have a meta description" on
home, product, checkout, and account-orders — even though `curl` showed
the tag present in the SSR HTML. Root cause turned out to be Next 15
default-enabled **streaming metadata**: async `generateMetadata` renders
`<meta>`/`<title>`/`<link canonical>` into `<body>` (React 19 auto-hoists
them client-side), but Lighthouse (and any HTML-only crawler whose UA
isn't in Next's built-in `HTML_LIMITED_BOT_UA_RE` regex) reads the raw
SSR head and sees none of it.

Fix: set the top-level `htmlLimitedBots: /.*/` regex in `next.config.ts`
so **every** request gets blocking metadata. Extra cost is one `await
getTranslations()` before the shell streams — negligible in our stack.

Verified `after-#367` (mobile, /en, /product, /checkout):

| Audit                 | Before | After |
| --------------------- | ------ | ----- |
| `meta-description`    | fail (score 0) | **pass (score 1)** |
| SEO score (home + product) | 92     | 92 (canonical fails only because local `NEXT_PUBLIC_SITE_URL=:3000` while I served on :3100 — pass on real deploys) |
| SEO score (checkout)  | 92     | 66 (is-crawlable fails intentionally — checkout is noindex) |
