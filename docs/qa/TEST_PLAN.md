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

Test results are surfaced in the PR via `dorny/test-reporter` reading the `junit.xml` from both runs — failures appear inline on the PR check page, not just as overall green/red.

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

- **Allure Report on GitHub Pages** — historical test stability dashboard. Higher upfront cost (annotating all existing tests) vs marginal day-to-day value over `dorny/test-reporter`. Tracked separately.
- **MailSlurp E2E for emails** — actually receive the email in a test inbox and assert content. Today we trust the template unit tests + Resend dashboard.
- **Visual regression** — Percy or Chromatic for product / checkout / email rendering.
- **Coverage badges** — only after the TC inventory is more complete; otherwise badges encourage padding low-value tests.
