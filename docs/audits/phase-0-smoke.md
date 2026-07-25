# Phase 0 — Automated smoke

**Goal**: prove every part of the stack still boots and every existing test
still passes, on a freshly-cloned tree, before we look at anything qualitative
in the later phases. Zero manual clicking — everything is scripted or curl'd.

**Estimated effort**: 1-2 hours.

**Definition of done**: every checkbox below is either ticked or has a linked
finding-issue explaining why it failed.

---

## 0.1 Environment boots

- [ ] `docker compose up -d` — postgres container reports `healthy`
- [ ] `pnpm --filter api exec prisma migrate deploy` — no pending / failed
      migrations
- [ ] `pnpm --filter api exec prisma db seed` — completes, seed data visible in
      Prisma Studio (spot-check: at least one Category, one Product, one User)
- [ ] `pnpm --filter api dev` boots on :4000, `/api/health` returns 200 with
      `{status: "ok"}` and DB check `up`
- [ ] `pnpm --filter web build` completes, no ENOSPC / OOM / TS errors
- [ ] `pnpm --filter web exec next start -p 3100` boots, `/en` returns 200

## 0.2 Backend — API route survey

For each REST route registered by the running Nest app:

- [ ] Enumerate every route (`GET /api/products`, etc.) via `nest info` or by
      grepping `@Controller` + `@Get/@Post/@Patch/@Put/@Delete` in
      `apps/api/src/**/*.controller.ts`.
- [ ] For each **public** route (no `@UseGuards`): curl once, expect 2xx or 4xx
      (never 5xx). Note any 5xx as a bug.
- [ ] For each **protected** route: curl without token → expect 401. Curl with
      seeded user JWT → expect 2xx.
- [ ] For each **admin** route: curl with USER token → expect 403. With ADMIN
      token → expect 2xx.
- [ ] For each Stripe webhook route: verify it rejects unsigned requests (400)
      and accepts a signature stub (via `stripe listen --forward-to`).

## 0.3 Frontend — every public page returns 200

For every `apps/web/src/app/[locale]/**/page.tsx` (~40 pages):

- [ ] Compute the runtime URL per locale (en/ru/es).
- [ ] For dynamic segments (`[slug]`, `[orderId]`, `[categorySlug]`): substitute
      a real value from the seeded DB.
- [ ] Curl each — expect 200 (or intentional 3xx redirect). Note:
  - Any 4xx / 5xx → finding-issue.
  - Any 200 with error boundary content in body (search for "Something went
    wrong", `<div role="alert">`, empty `<main>`) → finding-issue.
- [ ] Same sweep per locale: `/en/...`, `/ru/...`, `/es/...`. Bug if only one
      locale breaks.

## 0.4 Frontend — every admin page returns 200

Same sweep as 0.3 for `apps/web/src/app/[locale]/admin/**/page.tsx` (~16 pages),
authenticated as the seeded ADMIN user.

- [ ] Non-admin session → each admin page returns 401/403 or redirects to
      `/login`. Never 500, never blank 200.
- [ ] Admin session → each page returns 200 with expected data (spot-check the
      "list" pages have at least one row; the "detail" pages resolve their
      dynamic segment).

## 0.5 All automated tests pass

- [ ] `pnpm --filter api test` — 626+ tests pass
- [ ] `pnpm --filter api test:e2e` — passes (if e2e config exists)
- [ ] `pnpm --filter web test:run` — 1227+ tests pass
- [ ] `pnpm --filter web test:e2e` (Playwright) — all specs pass (needs web
      server running on :3100 with test env vars)
- [ ] Any flaky test (fails once, passes on retry) → finding-issue as `fix:
      flaky test <name>`, not "just re-run".

## 0.6 Static integrity

- [ ] `pnpm --filter web exec tsc --noEmit` — 0 errors
- [ ] `pnpm --filter api exec tsc --noEmit` — 0 errors
- [ ] `pnpm lint` — 0 errors, 0 warnings
- [ ] `pnpm format:check` — clean
- [ ] `pnpm audit --prod` — 0 critical / 0 high / 0 moderate (after #383 this
      should still hold; if not, immediate finding-issue).

## 0.7 Build artefacts

- [ ] `apps/api` build produces `dist/main.js` runnable via `node dist/main.js`
      (start with real env, hit `/api/health` — 200).
- [ ] `apps/web` production build starts via `next start -p 3100`, first-load
      JS on `/en` ≤ baseline from `docs/reports/lighthouse-2026-07.md`.
- [ ] No new `console.warn` from either process at startup that wasn't
      already accepted (compare against startup log stored in phase parent).

---

## Deliverables at end of Phase 0

1. Every box above ticked, OR every unticked box has a linked finding-issue.
2. Phase 0 parent issue closed only after every finding-issue is closed
   (bug fixed, PR merged), per audit rules.
3. Startup log + full API-route enumeration + full pages-enumeration attached
   to the parent issue as a comment (proof of coverage — nothing was silently
   skipped).
