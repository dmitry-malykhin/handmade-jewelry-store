# Phase 1 — Technical audit

**Goal**: find engineering rot before it becomes a bug in production. Dead code
that hides real logic, missing tests on money-flow paths, oversized components
that hide bugs, security regressions since last sweep.

**Prerequisite**: Phase 0 fully closed. Do not start until every Phase 0
finding-issue is resolved.

**Estimated effort**: half a day.

**Definition of done**: every checkbox below is either ticked or has a linked
finding-issue.

---

## 1.1 Dead code & unused deps

- [ ] Install `knip` (dev-dep) or `ts-prune`; run against `apps/web` and
      `apps/api`. Every reported unused export → decide `remove` or `document
      why kept` in a finding-issue.
- [ ] `depcheck` (or manual scan) for unused dependencies in each
      `package.json`. Any dep imported nowhere → remove issue.
- [ ] Grep for orphan components: any `.tsx` in `apps/web/src/components/**`
      whose default/named export is never imported → remove issue.

## 1.2 TypeScript strictness

- [ ] `apps/web/tsconfig.json` and `apps/api/tsconfig.json` both have `strict:
      true` and `noUncheckedIndexedAccess: true`. If not, plan bump.
- [ ] `grep -rn ': any\b\| as any\b' apps/*/src --include="*.ts" --include="*.tsx"`
      minus tests → each hit is a finding.
- [ ] `grep -rn '@ts-expect-error\|@ts-ignore' apps/*/src` → each must have
      inline comment explaining why; missing rationale = finding.

## 1.3 Test coverage — critical paths

Coverage-gap sweep (open finding-issue per missing test suite):

- [ ] **Auth**: login, register, password reset, JWT refresh, logout, RBAC
      guard (USER vs ADMIN).
- [ ] **Checkout**: guest path (steps 1→2→3), auth path, Stripe redirect
      success, Stripe redirect cancel, webhook handler for `payment_succeeded`,
      `payment_failed`, `refund.created`.
- [ ] **Orders**: state machine transitions (see
      [docs/08_ORDER_STATUS_MODEL.md](../08_ORDER_STATUS_MODEL.md)); each
      allowed transition + at least one forbidden transition.
- [ ] **Admin CRUD**: create/update/delete for Product, Category, Order,
      User, Review — happy path + validation errors.
- [ ] **Currency conversion + measurement conversion** — cover metric ↔
      imperial + USD ↔ each supported currency at the display layer.
- [ ] **Analytics dispatchers** (already covered by #370, re-verify still
      green).

## 1.4 Performance re-audit

- [ ] Re-run Lighthouse mobile on `/en`, `/en/products/[first-slug]`,
      `/en/checkout` — compare to
      [docs/reports/lighthouse-2026-07.md](../reports/lighthouse-2026-07.md).
      Any regression > 5 points on Performance / SEO / BP / A11y → finding.
- [ ] `pnpm --filter web build` size report — First Load JS per route ≤
      previous baseline; any route jumped > 20 KB without a shipping feature
      that justifies it → finding.
- [ ] Bundle-analyzer sweep for new unused-JS offenders introduced since
      #365 (Stripe dynamic-import already fixed).

## 1.5 Security

- [ ] `pnpm audit --prod` — 0/0/0/0. Any new vulnerability since #383 →
      immediate finding + fix in same phase.
- [ ] `apps/web/src/lib/security-headers.ts` — CSP, X-Frame-Options,
      Referrer-Policy, Permissions-Policy still applied. Curl a page, inspect
      response headers, confirm none dropped.
- [ ] Secrets scan: `git log -p` on last 20 commits, grep for `sk_live_`,
      `sk_test_`, `.env` diffs. Nothing leaked → tick; anything → rotate + issue.
- [ ] Rate-limit smoke: hammer `/api/auth/login` and `/api/contact` — expect
      429 after N requests. Missing → finding.

## 1.6 Accessibility

- [ ] Full-repo `eslint --rule 'jsx-a11y/recommended'` — 0 warnings.
- [ ] Axe DevTools (or `@axe-core/playwright`) on 5 key pages: home, product
      detail, cart, checkout step 1, admin product edit. Each critical/serious
      violation → finding.

## 1.7 Refactor opportunities

- [ ] List all `.tsx` files > 300 lines in `apps/web/src/**` (grep + `wc -l`).
      Each → either open a `refactor:` finding-issue with proposed split, or
      justify keeping in a comment.
- [ ] Duplicate logic scan: `similarity-ts` or manual grep on 3-line+ blocks
      copy-pasted between components. Each pattern → refactor issue.
- [ ] "God controllers" in api: any `.controller.ts` > 250 lines → split issue.

---

## Deliverables at end of Phase 1

1. Every box ticked or linked to a finding-issue.
2. Parent issue closed only after every finding-issue is closed.
3. Coverage report + Lighthouse deltas + audit output attached as comments.
