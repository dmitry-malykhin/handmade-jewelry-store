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

Before implementing any task, read these documents in order:

1. **[docs/02_ARCHITECTURE.docx](docs/02_ARCHITECTURE.docx)** — monorepo structure, folder conventions, module boundaries
2. **[docs/03_CODE_RULES.docx](docs/03_CODE_RULES.docx)** — TypeScript rules, component structure, naming conventions, NestJS rules
3. **[docs/05_SEO_RULES.md](docs/05_SEO_RULES.md)** — metadata, JSON-LD, semantic HTML, Core Web Vitals, URL structure
4. **[docs/06_ECOMMERCE_BEST_PRACTICES.md](docs/06_ECOMMERCE_BEST_PRACTICES.md)** — analytics, payments, accessibility, BNPL, trust signals

---

## Non-negotiable rules

### Git — commits and pushes

**Claude Code never runs `git commit`, `git push`, or `git tag`.**
After finishing implementation: show changed files, suggest commit message, stop.
User does all git write operations manually.

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

### Commits (Conventional Commits)

```
feat: add product card component #12
fix: correct cart total calculation #34
chore: setup turborepo and pnpm workspaces #2
```

Always include issue number at the end.

---

## Current roadmap state

| Week            | Status         | Key tasks                                                                       |
| --------------- | -------------- | ------------------------------------------------------------------------------- |
| W1 — Foundation | ✅ Done        | Monorepo, Docker, ESLint, Prettier, Husky, CI                                   |
| W2 — Frontend   | 🔄 In Progress | Next.js (#3✅), Shadcn (#12), Layout (#13), Zustand (#14), TanStack Query (#15) |
| W3 — Backend    | Planned        | NestJS (#4), Prisma (#16), DB Schema (#17)                                      |
| W4 — Products   | Planned        | Products API (#20), Catalog page (#22), Product detail (#23)                    |
| W5 — Cart       | Planned        | Cart (#25), Orders (#27), Checkout (#28)                                        |
| W6 — Payments   | Planned        | Stripe (#29, #30) + Apple Pay + Klarna                                          |
| W7 — Auth       | Planned        | JWT (#32), RBAC (#34), Login/Register (#33)                                     |
| W8 — SEO/UX     | Planned        | SEO (#36), Skeleton loaders (#37), Lighthouse (#38)                             |
| W9 — Infra      | Planned        | Docker (#40), AWS (#41), CI/CD (#42), GA4, FB Pixel                             |
| W10 — Polish    | Planned        | Tests (#44, #45), README (#46)                                                  |

**Rule:** one Issue In Progress at a time. Finish → merge → next.

---

## DB Schema — additions required in Issue #17

Beyond the base schema in architecture docs, add:

```prisma
model Product {
  // ... base fields
  slug        String   @unique   // mandatory for SEO URLs
  sku         String?            // for Google Shopping
  weight      Float?             // grams, for shipping calculation
  material    String?            // "Sterling Silver 925"
  avgRating   Float    @default(0)
  reviewCount Int      @default(0)
}

model Review {
  id        String   @id @default(cuid())
  rating    Int
  comment   String?
  userId    String
  productId String
  createdAt DateTime @default(now())
  @@unique([userId, productId])
}

model Wishlist {
  id       String    @id @default(cuid())
  userId   String    @unique
  products Product[]
}

model Category {
  slug String @unique  // mandatory for SEO URLs
}
```

---

## Architecture decisions already made

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
