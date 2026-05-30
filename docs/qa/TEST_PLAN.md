# Test Plan — Senichka Handmade Jewelry Store

> Living document. Update alongside features, not after. Last revised: 2026-05-13 for issue #147.

## 1. Purpose

This plan documents **what we test, how we test it, and where the gaps are**. It exists so that:

- Anyone joining the project can see which scenarios are covered without reading every test file.
- When a regression escapes to production, we can trace it to a missing or insufficient test case.
- The QA strategy is reviewable as code — every change to test coverage goes through PR review.

## 2. Scope

### In scope
- **Backend (`apps/api`)** — NestJS services, controllers, DTOs, Prisma logic, Stripe webhook handlers, email templates.
- **Frontend (`apps/web`)** — React components, Zustand stores, custom hooks, lib helpers, Next.js routes.
- **E2E flows** — guest checkout, registered checkout, payment redirect, order confirmation.
- **Email rendering** — HTML output of all transactional templates.

### Out of scope
- **Third-party dashboards** — Resend, Stripe, PostHog, Clarity, Klaviyo configuration. We trust their UIs.
- **Visual regression** — pixel diff is deferred; we test structure and content of UI, not exact rendering.
- **Load testing** — pre-launch traffic is bounded; performance audits are tracked separately (Lighthouse, #38).

## 3. Test types

| Type | Tool | Location | Run by |
|---|---|---|---|
| **Unit (api)** | Jest | `apps/api/src/**/*.spec.ts` | CI on every push + locally |
| **Unit/Component (web)** | Vitest + RTL | `apps/web/src/**/__tests__/*.{test,spec}.{ts,tsx}` | CI on every push + locally |
| **Integration (api)** | Jest + Prisma test DB | `apps/api/src/**/*integration*.spec.ts` | CI on every push |
| **E2E** | Playwright | `apps/web/tests/e2e/` | CI on push to main only (PR runs skip E2E to stay fast) |
| **Manual** | TC-*.md walkthroughs | `docs/qa/**/*.md` | Pre-release smoke runs |

## 4. Risk areas (where regressions hurt most)

Ordered by customer / business impact:

1. **Payment flow** — Stripe webhook handling, idempotency, order status transitions. A broken `payment_intent.succeeded` = revenue captured but order stuck PENDING.
2. **Transactional emails** — order confirmation, shipping notification, refund. Silent email failures destroy trust.
3. **Cart persistence** — Zustand → localStorage round-trip. Lost cart on refresh = lost order.
4. **Address validation** — guest checkout. Bad address = undelivered order + chargeback.
5. **Auth tokens** — JWT refresh, RBAC enforcement. Broken auth = users locked out OR admin endpoints exposed.
6. **Catalog filtering** — server-side filter + URL params. Empty filter result with no fallback = user thinks store is empty.

Each risk area should have **at least one TC per failure mode** documented in `docs/qa/<area>/`.

## 5. CI quality gates (PR check)

A PR cannot merge without **all** of:

- `pnpm lint` — ESLint, zero warnings allowed in our code (Shadcn vendor code excluded).
- `pnpm format:check` — Prettier code style.
- `pnpm --filter web test:run` — Vitest passes 100%.
- `pnpm --filter api test` — Jest passes 100%.
- Build succeeds (`pnpm build`).

Each test job's overall status (`CI / Unit Tests (api)`, `CI / Unit & Component Tests (web)`) appears in the PR check list. JUnit XML is still produced under `apps/{api,web}/reports/junit.xml` for future tooling (artifact upload, Allure, etc.) but is no longer surfaced as a separate PR check — see "Future work" for rationale.

E2E (Playwright) runs only on push to `main`. PR authors should run `pnpm --filter web test:e2e` locally if they touch checkout / payment / auth flows.

## 6. Coverage policy

We do not enforce a coverage percentage. Coverage numbers reward writing tests of trivial code while ignoring critical paths.

Instead:
- **Critical paths must have explicit TC files** in `docs/qa/`.
- **New features must add tests** for the failure modes they introduce, listed in the PR description.
- **Bug fixes must add a regression test** that fails on the old code and passes on the new.

## 7. Test case naming convention

```
TC-<AREA>-<NNN>
```

- `<AREA>` — short uppercase tag: `EMAIL`, `CHECKOUT`, `AUTH`, `CATALOG`, `ADMIN`, `WEBHOOK`.
- `<NNN>` — three-digit zero-padded sequence within the area.

Example: `TC-EMAIL-001`, `TC-CHECKOUT-014`.

Each TC file follows the structure documented in [`docs/qa/email/TC-EMAIL-001.md`](email/TC-EMAIL-001.md) as the reference template.

## 8. Current TC inventory

| Area | Range | Count | Status |
|---|---|---|---|
| Email notifications | TC-EMAIL-001..013 | 13 | ✅ Documented (#147) |
| Checkout | TC-CHECKOUT-*** | — | ⏳ Pending |
| Auth | TC-AUTH-*** | — | ⏳ Pending |
| Catalog | TC-CATALOG-*** | — | ⏳ Pending |
| Stripe webhooks | TC-WEBHOOK-*** | — | ⏳ Pending |

## 9. Manual smoke checklist (pre-release)

Run before every production deploy with a real Stripe test card:

- [ ] Guest checkout, ready-to-ship product, $0 shipping → email arrives within 30s.
- [ ] Guest checkout, made-to-order product → email shows production days.
- [ ] Registered user checkout with saved address → address pre-fills correctly.
- [ ] Klarna payment flow → redirect back lands on `/checkout/confirmation/[orderId]` with PAID status.
- [ ] Refund via Stripe dashboard → refund email arrives, order moves to REFUNDED.
- [ ] Logged-in user views `/account/orders` → list shows their order history.
- [ ] Cookie banner: reject all → no PostHog/Clarity requests in DevTools Network.
- [ ] Cookie banner: accept analytics → PostHog and Clarity events fire on next page view.

## 10. Future work (not in #147)

- **Allure Report on GitHub Pages** — ✅ delivered in #252 (Phase 2). Every test file emits Allure metadata (`suite`, `subSuite`, `severity`) via a top-of-file `beforeEach`. CI uploads `allure-results/` from web/api/e2e jobs; the `allure-publish` job merges them, generates HTML and pushes to `gh-pages`. See section 11 below for ops.
- **PR-inline test failure details** — previously surfaced via `dorny/test-reporter`; removed because dorny v1 mis-attributes its check runs to whatever workflow first touched the commit (`auto-pr.yml` in our case), producing visually inconsistent check names in the PR. The job's own pass/fail status is enough for now; if we need per-test failure visibility later, upload `junit.xml` as a workflow artifact or migrate to GitHub's job summary API.
- **MailSlurp E2E for emails** — actually receive the email in a test inbox and assert content. Today we trust the template unit tests + Resend dashboard.
- **Visual regression** — Percy or Chromatic for product / checkout / email rendering.
- **Coverage badges** — only after the TC inventory is more complete; otherwise badges encourage padding low-value tests.

## 11. Allure dashboard ops

**Live URL:** `https://<owner>.github.io/handmade-jewelry-store/` (configured under repo Settings → Pages: source = `gh-pages` branch, root).

**Refresh trigger:** Pushes to `main`. PR builds do not regenerate the dashboard.

**What lives where:**

| Package    | Reporter             | Output dir              |
| ---------- | -------------------- | ----------------------- |
| apps/api   | jest-allure2-reporter | `apps/api/allure-results` |
| apps/web   | allure-vitest        | `apps/web/allure-results` |
| apps/web (e2e) | allure-playwright | `apps/web/allure-results` (same dir; merged in CI) |

The `allure-publish` job in `.github/workflows/ci.yml`:
1. Downloads `allure-results-{web,api,e2e}` artifacts into a single `allure-results/`.
2. Restores `history/` from the existing `gh-pages` branch (preserves trend data — first run has none).
3. Runs `allure-commandline generate` to build HTML.
4. Pushes the HTML to `gh-pages` via `peaceiris/actions-gh-pages`.

**Local rebuild (when you want to preview without pushing):**

```bash
# 1. Run tests with CI=1 to enable the allure reporters
CI=1 pnpm --filter web test:run
CI=1 pnpm --filter api test
# (e2e optional — needs Playwright browsers installed)
CI=1 pnpm --filter web test:e2e

# 2. Merge results into one folder and generate HTML
mkdir -p allure-results
cp -r apps/web/allure-results/* allure-results/ 2>/dev/null || true
cp -r apps/api/allure-results/* allure-results/ 2>/dev/null || true
npx allure-commandline generate allure-results --clean -o allure-report

# 3. Open the report in a browser
npx allure-commandline open allure-report
```

**Annotation pattern (every test file):**

```ts
import { suite as $allureSuite, subSuite as $allureSubSuite, severity as $allureSeverity } from 'allure-js-commons'

beforeEach(async () => {
  await $allureSuite('api/orders')
  await $allureSubSuite('orders.service')
  await $allureSeverity('normal')
})
```

Playwright tests use `test.beforeEach` instead of the global `beforeEach`. The codemod that originally added these is in `scripts/annotate-tests-for-allure.mjs` — re-run it after adding new test files (it's idempotent).
