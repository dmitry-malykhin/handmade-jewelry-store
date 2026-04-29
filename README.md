# Senichka — Handmade Beaded Jewelry

[![CI](https://github.com/dmitry-malykhin/handmade-jewelry-store/actions/workflows/ci.yml/badge.svg)](https://github.com/dmitry-malykhin/handmade-jewelry-store/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)

Production-ready e-commerce platform for handmade beaded jewelry.
Built with Next.js 15, NestJS, PostgreSQL, Stripe, and AWS.

<!-- TODO: Add live demo link after domain purchase -->
<!-- 🔗 **Live:** [senichka.com](https://senichka.com) -->

---

## Tech Stack

| Layer              | Technology                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Frontend**       | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Shadcn/ui, Zustand, TanStack Query |
| **Backend**        | NestJS, Prisma ORM, PostgreSQL                                                           |
| **Payments**       | Stripe (Cards, Apple Pay, Google Pay, Klarna, Afterpay)                                  |
| **Auth**           | JWT + Refresh Token Rotation, Guest Checkout                                             |
| **Email**          | Resend (transactional)                                                                   |
| **Error Tracking** | Sentry (NestJS + Next.js)                                                                |
| **Logging**        | Winston (structured JSON, correlation IDs)                                               |
| **Uptime**         | UptimeRobot + Telegram alerts                                                            |
| **CI/CD**          | GitHub Actions (lint, test, deploy)                                                      |
| **Infra**          | Docker, AWS (ECS Fargate, RDS, S3, CloudFront), Fly.io (staging)                         |
| **Monorepo**       | Turborepo + pnpm workspaces                                                              |

---

## Architecture

```
handmade-jewelry-store/
├── apps/
│   ├── api/                 # NestJS REST API
│   │   ├── src/
│   │   │   ├── auth/        # JWT login, register, refresh, password reset
│   │   │   ├── products/    # CRUD, filtering, search
│   │   │   ├── categories/  # Category management
│   │   │   ├── orders/      # Order lifecycle, status machine
│   │   │   ├── payments/    # Stripe intents, webhooks
│   │   │   ├── upload/      # S3 presigned URL generation
│   │   │   ├── admin/       # Admin dashboard API
│   │   │   ├── health/      # GET /api/health (DB check)
│   │   │   ├── logger/      # Winston structured logging
│   │   │   └── prisma/      # Prisma service + migrations
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── Dockerfile
│   │
│   └── web/                 # Next.js 15 frontend
│       ├── src/
│       │   ├── app/         # App Router pages
│       │   │   ├── [locale]/
│       │   │   │   ├── shop/        # Catalog + product pages (SSR/ISR)
│       │   │   │   ├── cart/        # Shopping cart
│       │   │   │   ├── checkout/    # 3-step checkout (guest + auth)
│       │   │   │   ├── admin/       # Admin dashboard
│       │   │   │   ├── login/       # Authentication
│       │   │   │   └── register/
│       │   │   ├── opengraph-image.tsx
│       │   │   └── global-error.tsx # Sentry error boundary
│       │   ├── components/
│       │   │   ├── ui/      # Shadcn/ui primitives
│       │   │   ├── shared/  # Header, Footer, ThemeToggle
│       │   │   └── features/# Cart, Catalog, Checkout components
│       │   ├── store/       # Zustand (cart, auth, theme)
│       │   ├── lib/         # API client, SEO, utils
│       │   └── styles/      # Senichka brand tokens
│       ├── messages/        # i18n (EN, RU, ES)
│       ├── public/          # Logos, favicons, OG images
│       └── Dockerfile
│
└── packages/
    └── shared/              # Shared TypeScript types
```

---

## Features

### Customer-facing

- Product catalog with category filtering, search, and pagination
- Product pages with image gallery, dimensions, reviews
- Shopping cart with quantity management and free shipping progress
- 3-step checkout: shipping → method → payment
- Guest checkout (no account required)
- Apple Pay / Google Pay via Stripe Payment Request Button
- Measurement toggle (imperial/metric)
- Cookie consent banner (GDPR/CCPA)
- Privacy Policy and Terms of Service pages
- 3 languages: English, Russian, Spanish
- Light/dark theme with brand color system
- Skeleton loaders and error boundaries
- SEO: sitemap.xml, robots.txt, JSON-LD, OpenGraph

### Admin

- Product management (CRUD, image upload to S3)
- Order management with status state machine
- Revenue chart with period selector
- Category management

### Infrastructure

- Sentry error tracking (API + Web)
- Winston structured logging with correlation IDs
- Health endpoint with DB check
- UptimeRobot monitoring with Telegram alerts
- CI pipeline: lint + unit tests + E2E on every PR
- Production deploy: ECR → ECS Fargate (zero downtime)
- Staging: Fly.io + Neon DB branching

---

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 16+
- Docker (optional, for production builds)

### Setup

```bash
# Clone
git clone https://github.com/dmitry-malykhin/handmade-jewelry-store.git
cd handmade-jewelry-store

# Install dependencies
pnpm install

# Setup environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Run database migrations
pnpm --filter api db:migrate

# Seed database with sample products
pnpm --filter api db:seed

# Start development
pnpm dev
```

### Dev URLs

| Service      | URL                              |
| ------------ | -------------------------------- |
| Frontend     | http://localhost:3000            |
| API          | http://localhost:4000            |
| Health check | http://localhost:4000/api/health |

---

## Scripts

```bash
# Development
pnpm dev                          # Start all apps (Turborepo)
pnpm --filter web dev             # Frontend only
pnpm --filter api dev             # Backend only

# Testing
pnpm --filter web test:run        # Vitest (587 tests)
pnpm --filter api test            # Jest (238 tests)
pnpm --filter web test:e2e        # Playwright E2E

# Linting
pnpm lint                         # ESLint (all apps)
pnpm format:check                 # Prettier check

# Database
pnpm --filter api db:migrate      # Run migrations
pnpm --filter api db:seed         # Seed sample data
pnpm --filter api db:studio       # Open Prisma Studio

# Build
pnpm build                        # Production build (all apps)
```

---

## Environment Variables

### API (`apps/api/.env`)

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/jewelry
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
SENTRY_DSN=https://...
FRONTEND_URL=http://localhost:3000
AWS_S3_BUCKET=your-bucket
AWS_REGION=us-east-1
```

### Web (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SENTRY_DSN=https://...
```

---

## Brand

**Senichka** — handmade beaded jewelry brand.

- **Fonts:** Cormorant Garamond (display) + Jost (UI)
- **Colors:** Ivory, Blush Pink, Rose Gold, Burgundy, Charcoal
- **Design tokens:** `apps/web/src/styles/senichka-tokens.css`
- **Logos:** `apps/web/public/logo-light.svg`, `logo-dark.svg`

---

## Architecture & engineering decisions

This project is documented in depth — these are the key design decisions and rationales:

- [Domain analysis](docs/07_DOMAIN_ANALYSIS.md) — entity modeling, schema design choices
- [Order status state machine](docs/08_ORDER_STATUS_MODEL.md) — allowed transitions, Stripe event mapping
- [Multi-currency strategy](docs/09_MULTI_CURRENCY.md) — USD-first storage, display-time conversion
- [Measurement systems](docs/10_MEASUREMENT_SYSTEMS.md) — metric storage, imperial display
- [SEO rules](docs/05_SEO_RULES.md) — metadata, JSON-LD, Core Web Vitals
- [Observability stack](docs/13_OBSERVABILITY_OVERVIEW.md) — logging, error tracking, uptime
- [Logging conventions](docs/14_LOGGING.md) — Winston, correlation IDs, sanitization
- [Error tracking & alerting](docs/15_ERROR_TRACKING_ALERTING.md) — Sentry setup, health endpoint

---

## License

[MIT](LICENSE) © 2026 Dmitry Malykhin
