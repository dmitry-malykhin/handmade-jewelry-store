# Playwright e2e — local preflight

Run against a real running stack (matches CI). The default `test:e2e` script
spawns its own dev server on `:3000`, which conflicts with anything else
listening there — use the local script below instead.

## One-time setup

```
pnpm exec playwright install chromium
```

## Every run

Boot the real stack (own shells or `pnpm dev:full`):

1. `docker compose up -d` — postgres
2. `pnpm --filter api dev` — api on `:4000`
3. `pnpm --filter web build && NEXT_PUBLIC_PRIVACY_EMAIL=... pnpm --filter web exec next start -p 3100` — web on `:3100`

Then:

```
pnpm --filter web test:e2e:local
```

The script sets `PLAYWRIGHT_BASE_URL=http://localhost:3100` and pins the
`Desktop Chrome` project so it will not try to spin its own dev server.

Mobile viewports are set per spec via `test.use({ viewport })`; a dedicated
Mobile iPhone (WebKit) project was removed in #394 — every mobile assertion
still runs, it just runs on Chromium mobile-emulation instead of WebKit.

## Known skipped suites

- `checkout-flow.spec.ts`, `admin-flow.spec.ts`, `reviews-wishlist.spec.ts`,
  `theme.spec.ts`, `language.spec.ts` — realigned in follow-up #406 after the
  #393 audit split. Every skip has an inline comment; remove the skip when
  the spec is realigned.
