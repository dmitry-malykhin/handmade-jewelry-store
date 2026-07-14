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
- Meta-description shows as failing on `/en`, `/en/checkout`, and
  `/en/products/...` even though `<meta name="description">` is present in
  the initial HTML. Reproducibly wrong across two Lighthouse presets;
  tracking in the follow-up issue rather than trying to silence the score.
