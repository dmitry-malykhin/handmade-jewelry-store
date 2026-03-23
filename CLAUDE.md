# CLAUDE.md — Project Instructions

> This file is read automatically by Claude Code at the start of every session.
> All rules below are mandatory. No exceptions.

---

## Project

**Handmade Jewelry Store** — production-ready e-commerce monorepo.
Goal: real revenue from organic SEO + Google Shopping + Pinterest + paid ads.

**Stack:** Next.js 15 App Router · TypeScript · Shadcn/ui · Tailwind CSS · Zustand · TanStack Query · NestJS · Prisma · PostgreSQL · Turborepo · pnpm · AWS

---

## MANDATORY: Read before writing any code

Before implementing **any** task, always read these first:

1. **[docs/02_ARCHITECTURE.docx](docs/02_ARCHITECTURE.docx)** — monorepo structure, folder conventions, module boundaries
2. **[docs/03_CODE_RULES.docx](docs/03_CODE_RULES.docx)** — TypeScript rules, component structure, naming conventions, NestJS rules
3. **[docs/05_SEO_RULES.md](docs/05_SEO_RULES.md)** — metadata, JSON-LD, semantic HTML, Core Web Vitals, URL structure
4. **[docs/06_ECOMMERCE_BEST_PRACTICES.md](docs/06_ECOMMERCE_BEST_PRACTICES.md)** — analytics, payments, accessibility, BNPL, trust signals

### Additional documents by task type

Read the relevant document(s) **before writing code** for that task:

| Task type                                 | Required reading                                                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Orders / Order status / Checkout flow** | [docs/08_ORDER_STATUS_MODEL.md](docs/08_ORDER_STATUS_MODEL.md) — state machine, StockType, OrderStatusHistory, Stripe events → status mapping                             |
| **Payments / Stripe integration**         | [docs/08_ORDER_STATUS_MODEL.md](docs/08_ORDER_STATUS_MODEL.md) + [docs/06_ECOMMERCE_BEST_PRACTICES.md](docs/06_ECOMMERCE_BEST_PRACTICES.md)                               |
| **Product schema / Product API**          | [docs/07_DOMAIN_ANALYSIS.md](docs/07_DOMAIN_ANALYSIS.md) + [docs/10_MEASUREMENT_SYSTEMS.md](docs/10_MEASUREMENT_SYSTEMS.md) — dimension fields, measurement storage rules |
| **Catalog / Product pages / SEO**         | [docs/05_SEO_RULES.md](docs/05_SEO_RULES.md) + [docs/07_DOMAIN_ANALYSIS.md](docs/07_DOMAIN_ANALYSIS.md)                                                                   |
| **Cart / Checkout UX**                    | [docs/11_UX_MINIMAL_FRICTION.md](docs/11_UX_MINIMAL_FRICTION.md) — guest checkout, 3-step flow, autocomplete, estimated delivery                                          |
| **Measurement system / Unit toggle**      | [docs/10_MEASUREMENT_SYSTEMS.md](docs/10_MEASUREMENT_SYSTEMS.md) — store metric, display either; ring sizes are separate                                                  |
| **Currency / Pricing display**            | [docs/09_MULTI_CURRENCY.md](docs/09_MULTI_CURRENCY.md) — store USD, convert at display, ExchangeRate-API, EU VAT rules                                                    |
| **Logging / Structured logs**             | [docs/14_LOGGING.md](docs/14_LOGGING.md) — Winston setup, correlation IDs, sanitizeForLog, CloudWatch transport                                                           |
| **Error tracking / Sentry**               | [docs/15_ERROR_TRACKING_ALERTING.md](docs/15_ERROR_TRACKING_ALERTING.md) — Sentry NestJS + Next.js setup, health endpoint, alerting                                       |
| **Analytics / Tracking events**           | [docs/16_USER_ANALYTICS.md](docs/16_USER_ANALYTICS.md) — PostHog + GA4 + Clarity + FB Pixel event taxonomy, cookie consent requirement                                    |
| **Observability stack overview**          | [docs/13_OBSERVABILITY_OVERVIEW.md](docs/13_OBSERVABILITY_OVERVIEW.md) — tool comparison, zero-budget stack decision                                                      |
| **AWS infra / Deployment / Staging**      | [docs/17_STAGING_ENVIRONMENTS.md](docs/17_STAGING_ENVIRONMENTS.md) — staging strategy, Fly.io + Neon (pre-revenue), AWS shared ALB (post-revenue)                         |
| **Email flows / Klaviyo**                 | [docs/16_USER_ANALYTICS.md](docs/16_USER_ANALYTICS.md) — Klaviyo flows priority table, event taxonomy                                                                     |
| **Any new feature** (if uncertain)        | [docs/12_PLAN_PERSONAL.md](docs/12_PLAN_PERSONAL.md) — full task order, staging decision, key risks                                                                       |

---

## Non-negotiable rules

### Git — commits and pushes

**Claude Code never runs `git commit`, `git push`, or `git tag`.**
After finishing implementation: show changed files, suggest commit message, stop.
User does all git write operations manually.

### Naming — mandatory everywhere

Every name must tell **what it stores or does** — no guessing required.

- **Components**: `ProductCard`, `CartItemRow`, `CheckoutSummary` — noun describing what it renders
- **Hooks**: `useCartTotalPrice`, `useProductsByCategory` — `use` + what it returns
- **Functions**: `formatPriceInDollars`, `fetchProductBySlug`, `calculateOrderTotal` — verb + what it does
- **Variables**: `cartItems`, `isCheckoutPending`, `productSlug` — noun or `is/has/can` boolean prefix
- **Props**: `onAddToCart`, `isOutOfStock`, `productImageUrl` — same rules as variables
- **Parameters**: `productId`, `quantity`, `locale` — never `id`, `val`, `param`, `data`
- **Event handlers**: `handleAddToCart`, `handleQuantityChange` — `handle` + event description
- **Callbacks in array methods**: use the actual domain name — `cartItem`, `product`, `order` — never `i`, `x`, `item`, `obj`
- **Zustand selectors**: always `(state) =>` — never `(s) =>`
- **Fetch responses**: `response` — never `res`
- **Catch errors**: `error` — never `e` or `err`

**Exceptions (universally understood conventions, always acceptable):**

- `t` from `useTranslations()` — universal i18n convention
- `cn()` — utility function, widely known in Shadcn ecosystem
- `sum`, `acc` in `.reduce()` — mathematical accumulators
- `prev` in `setState(prev => ...)` — React setState convention

**When editing existing code**: if you encounter a non-descriptive name in code you are touching, rename it.

### TypeScript

- `any` type is **forbidden** — ESLint will error. Use explicit types or generics.
- All props typed via `interface`. Use `type` for unions/primitives.
- Shared types go in `packages/shared/src/index.ts`.
- Zod for validation at API boundaries and forms.

### React Components

- Functional components only. No class components.
- One component = one file.
- Components never make API requests directly — use TanStack Query.
- No `useEffect` for data fetching.
- `'use client'` only when strictly necessary (state, events, browser APIs).
  Default: Server Component.

### Theming — mandatory on every component

The project has **two themes: light and dark** (via `next-themes` + Tailwind class strategy).

- **Never use raw colors** (`text-gray-900`, `bg-white`, `border-gray-200`, etc.).
  Always use semantic CSS-variable tokens: `text-foreground`, `bg-background`, `bg-card`,
  `text-muted-foreground`, `border-border`, `bg-accent`, `text-primary`, etc.
- These tokens automatically resolve to the correct value in both light and dark mode.
- If a color has no semantic token equivalent, define a new CSS variable in `globals.css`
  with values for both `:root` (light) and `.dark` — never hardcode a color for one theme only.
- Interactive states: use `hover:bg-accent hover:text-accent-foreground` (not `hover:bg-gray-100`).
- Shadows: `shadow-sm`, `shadow-md` are fine — they adapt automatically.

### i18n — mandatory on every component

The project supports **3 languages: English (EN), Russian (RU), Spanish (ES)**.

- **Never hardcode user-visible text** in a component.
  Every string must come from `useTranslations()` (Client) or `getTranslations()` (Server).
- When adding any new text to a component, immediately add translations for all 3 languages
  to the corresponding JSON files:
  - `apps/web/messages/en.json`
  - `apps/web/messages/ru.json`
  - `apps/web/messages/es.json`
- Use the closest existing namespace (`header`, `footer`, `navigation`, `home`, etc.).
  Create a new namespace only if the text clearly belongs to a new domain.
- `aria-label`, `placeholder`, `title` attributes are user-visible — translate them too.
- Translation keys use camelCase: `shopNow`, `addToCart`, `switchToDark`.

### Semantic HTML (mandatory on every component)

- `<article>` — product card
- `<ul role="list">` + `<li>` — product grids and lists
- `<nav>` — navigation, breadcrumbs
- `<main>` — one per page
- `<aside>` — filters, sidebar
- `<figure>` + `<figcaption>` — image galleries
- `<search>` or `<form role="search">` — search bar
- `<fieldset>` + `<legend>` — form groups
- `<data value="...">` — prices
- No `<div onClick>`. No `<a>` without `href`. No empty `alt=""` on product images.

### Images

- `next/image` always. Native `<img>` is forbidden.
- `alt` must be descriptive: `"Sterling silver moonstone ring — handmade"`.
- First image on page: `priority={true}` (LCP).
- Explicit `width` and `height` always (prevents CLS).

### SEO — every page component

- Unique `title` and `description` via `metadata` or `generateMetadata`.
- `canonical` URL on all dynamic pages.
- OpenGraph tags on all pages.
- Product pages: `ProductJsonLd` component with Schema.org markup.
- URLs use `slug` not `id`: `/products/silver-ring` not `/products/42`.
- Catalog and product pages must be Server Components.

### NestJS (backend)

- Each module: `module.ts`, `controller.ts`, `service.ts`, `dto/`.
- Business logic only in Service. Controller only accepts and returns.
- DTO for every request with `class-validator` decorators.
- Never return password or sensitive fields.
- All protected routes: `@UseGuards(JwtAuthGuard)`.

### Comments in code

Write comments **only when the logic is non-obvious** and another developer could not understand it by reading the code.

**Do NOT comment:**

- What the code does (readable code speaks for itself)
- Obvious operations: `// increment counter`, `// return null`
- Component structure that is clear from JSX
- Props or variables whose names already explain them

**DO comment:**

- Complex business logic that has a non-obvious reason: `// Zustand skipHydration prevents SSR/client mismatch`
- Workarounds for framework quirks or known bugs
- Magic numbers or constants that need context: `// 3600 = 1 hour ISR revalidation window`
- Non-obvious accessibility decisions

This rule applies equally to production code and test files.

### Testing

After implementing any new code, determine which tests to write before running anything:

**Decision flow — for every new piece of code ask:**

- Pure function / utility → unit test
- Custom hook → `renderHook` unit test
- React component → component test (RTL)
- User flow across pages → E2E test (Playwright)
- API endpoint → integration test with MSW

**Test execution order (mandatory):**

1. Write tests for the new code
2. Run **new tests only** first → fix any failures
3. Run **all tests** → confirm nothing regressed
4. `pnpm lint` + `pnpm format:check`

```bash
# Run only new tests by pattern:
pnpm --filter web test:run -- --testPathPattern="cart.store"

# Run all unit/component tests:
pnpm --filter web test:run

# Run E2E (only when UI was touched):
pnpm --filter web test:e2e
```

**Test code quality — same rules as production code:**

- Functions, variables, and describe/it labels must be self-describing
- `it('calls setTheme with "dark" when clicked in light mode')` — not `it('test 1')`
- Variable names: `mockSetTheme`, `cartItemWithPrice`, `renderedButton` — not `mock`, `item`, `btn`
- Comments only for non-obvious test setup (e.g. why a mock returns a specific value)

### Commits (Conventional Commits)

```
feat: add product card component #12
fix: correct cart total calculation #34
chore: setup turborepo and pnpm workspaces #2
```

Always include issue number at the end.

---

## Current roadmap state

| Phase                      | Status  | Key tasks                                                                                                             |
| -------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| W1 — Foundation            | ✅ Done | Monorepo, Docker, ESLint, Prettier, Husky, CI                                                                         |
| W2 — Frontend              | ✅ Done | Next.js, Shadcn, Layout, Zustand, TanStack Query                                                                      |
| W3 — Backend               | ✅ Done | NestJS (#4✅), Prisma (#16✅), DB Schema (#62✅, #63✅)                                                               |
| W4 — Products              | 🔄 Next | Schema additions (#116, #112) → Products API (#64, #65) → Catalog (#66, #67)                                          |
| W5 — Cart & Orders         | Planned | Cart (#25, #26), Orders API (#27), Guest checkout (#114), Checkout (#115, #28)                                        |
| W6 — Payments              | Planned | Stripe backend (#70, #71, #126), Stripe frontend (#30), Apple/Google Pay (#100)                                       |
| W7 — Auth                  | Planned | JWT (#72, #73), RBAC (#34), Login/Register (#33)                                                                      |
| W8 — SEO/UX                | Planned | SEO (#36), Skeleton loaders (#37), Lighthouse (#38), Measurement toggle (#113)                                        |
| W9 — Infra & Observability | Planned | Docker (#40), AWS (#76-#82), CI/CD (#78, #79), Sentry (#88), Logging (#121), UptimeRobot (#122), Staging (#127, #128) |
| W10 — Launch prep          | Planned | Cookie consent (#107), Privacy/ToS (#105, #106), Mobile (#39), Tests (#45), README (#46)                              |

**POST-MVP** (after first revenue): Analytics (#90, #94, #119, #120), Klaviyo (#95), Shopping (#92, #93), Multi-currency (#123), Reviews (#98), Wishlist (#97), Search (#99), AWS staging (#129), Terraform (#102)

**Rule:** one Issue In Progress at a time. Finish → merge → next.
Full ordered task list: [docs/12_PLAN_PERSONAL.md](docs/12_PLAN_PERSONAL.md)

---

## DB Schema — current state

Schema implemented in `apps/api/prisma/schema.prisma`. Completed issues:

- **#62** — User, Product, Order, Category base models (slug, sku, avgRating, reviewCount)
- **#63** — Review (`@@unique([userId, productId])`) + Wishlist (M-M with Product)

Planned schema additions:

- **#116** — Order status model: `PROCESSING`, `REFUNDED` statuses, `OrderStatusHistory`, `StockType` enum, `productionDays`
- **#112** — Product dimensions: `lengthCm`, `widthCm`, `weightGrams` (store metric, display either)

Full schema spec: [docs/07_DOMAIN_ANALYSIS.md](docs/07_DOMAIN_ANALYSIS.md)
Order status design: [docs/08_ORDER_STATUS_MODEL.md](docs/08_ORDER_STATUS_MODEL.md)

---

## Architecture decisions already made

**Frontend / Backend:**

- **pnpm** workspaces (not npm, not yarn)
- **Turbopack** for Next.js dev (`next dev --turbopack`)
- **ESLint 9 flat config** (`eslint.config.mjs`) — no `.eslintrc`
- **Prettier** — single quotes, no semicolons, 100 chars, LF
- **ISR** for catalog and product pages (`export const revalidate = 3600`)
- **Slug-based URLs** for products and categories
- **Server Components** by default, `'use client'` only when needed
- **Resend** for transactional emails
- **Klarna + Afterpay** via Stripe (BNPL)
- **Apple Pay + Google Pay** via Stripe Payment Request Button

**Data / Domain (from docs/07-11):**

- **Prices stored in USD cents** — convert to other currencies at display time, never store converted
- **Measurements stored in metric** — `lengthCm`, `widthCm`, `weightGrams`; convert to imperial at display only
- **Bead size always in mm**, ring weight always in grams — universal, never convert these
- **Ring sizes are NOT a simple conversion** — US/EU/UK/JP are separate systems, use a lookup table
- **One review per user per product** — enforced via `@@unique([userId, productId])` in Prisma
- **One wishlist per user** — `userId @unique` on Wishlist model
- **Order status state machine** — only whitelist of allowed transitions; full spec in docs/08
- **shippingAddress stored as JSON snapshot** on Order at checkout time (not FK to address)
- **Loyalty points earned at DELIVERED** — not at PAID or SHIPPED

**Observability (from docs/13-17):**

- **Error tracking:** Sentry (`@sentry/nestjs` + `@sentry/nextjs`)
- **Logging:** Winston → Grafana Cloud Loki (structured JSON, correlation IDs via AsyncLocalStorage)
- **Analytics:** PostHog (product events) + GA4 (e-commerce) + MS Clarity (session recording)
- **Uptime:** UptimeRobot (requires `/health` endpoint with DB check via `@nestjs/terminus`)
- **Analytics require cookie consent** — PostHog/GA4/FB Pixel must be behind consent gate (GDPR/CCPA)
- **Staging pre-revenue:** Fly.io (NestJS) + Neon DB branching = $0/month
- **Staging post-revenue:** AWS shared ALB with staging target group (+$3-5/month)

---

## Pre-commit checklist (verify before suggesting commit)

```
[ ] No 'any' types
[ ] pnpm lint passes
[ ] pnpm format:check passes
[ ] Semantic HTML tags used (not div soup)
[ ] All images use next/image with descriptive alt
[ ] Page has unique metadata (title, description, OG)
[ ] Dynamic pages have canonical URL
[ ] Product pages have JSON-LD
[ ] URLs use slug, not id
[ ] New page is a Server Component (no unnecessary 'use client')
[ ] No raw colors — only semantic tokens (bg-background, text-foreground, etc.)
[ ] All new text strings added to en.json + ru.json + es.json
```
