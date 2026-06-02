# allure-annotate (custom)

**Effort:** low. **Impact:** medium.

## Что делает

Расставляет `allure.epic / feature / story / severity` по новому тесту, исходя из пути файла:

| Путь | Epic | Feature |
| --- | --- | --- |
| `apps/web/tests/e2e/checkout/` | E-commerce | Checkout |
| `apps/web/tests/e2e/auth/` | Account | Authentication |
| `apps/api/test/orders/` | Backend | Orders |
| `apps/web/src/.../cart.spec.ts` | E-commerce | Cart |

## Trigger

- Auto на создание `*.spec.ts` / `*.e2e.ts`
- User: `/allure-annotate <file>`

## SKILL.md

````markdown
---
name: allure-annotate
description: Use after a new spec/e2e test file is created. Adds Allure epic/feature/story/severity annotations based on the file path (orders/ → epic=Backend, feature=Orders; checkout/ → epic=E-commerce, feature=Checkout).
---

# allure-annotate

## Path → annotation mapping

| Path pattern | Epic | Feature | Default severity |
| --- | --- | --- | --- |
| `apps/web/tests/e2e/checkout/` | E-commerce | Checkout | critical |
| `apps/web/tests/e2e/auth/` | Account | Authentication | critical |
| `apps/web/tests/e2e/products/` | Catalog | Product Browsing | normal |
| `apps/web/tests/e2e/cart/` | E-commerce | Cart | critical |
| `apps/web/tests/e2e/account/` | Account | Profile | normal |
| `apps/api/test/orders/` | Backend | Orders API | critical |
| `apps/api/test/payments/` | Backend | Payments API | critical |
| `apps/api/test/auth/` | Backend | Auth API | critical |
| `apps/api/test/products/` | Backend | Products API | normal |
| `apps/web/src/components/features/seo/` | SEO | Structured Data | normal |
| `apps/web/src/lib/pricing-constants` | Domain | Pricing | critical |
| `apps/web/src/lib/measurement` | Domain | Measurement | normal |

## Template (Playwright + Allure)

```ts
import { test, expect } from '@playwright/test'
import * as allure from 'allure-playwright'

test.describe('Checkout flow', () => {
  test.beforeEach(async () => {
    await allure.epic('E-commerce')
    await allure.feature('Checkout')
    await allure.story('Guest checkout with Stripe')
    await allure.severity(allure.Severity.CRITICAL)
  })

  test('user can complete checkout as guest with valid card', async ({ page }) => {
    // ...
  })
})
```

## Template (Vitest + Allure)

```ts
import { describe, it } from 'vitest'
import { epic, feature, story, severity, Severity } from 'allure-vitest'

describe('OrderService.transitionToPaid', () => {
  epic('Backend')
  feature('Orders API')
  story('Status state machine')
  severity(Severity.CRITICAL)

  it('transitions PROCESSING → PAID on valid payment intent', async () => {
    // ...
  })
})
```

## Procedure

1. Read target test file
2. Determine mapping from path
3. Inject annotations at top of `describe` block (Vitest) or `beforeEach` (Playwright)
4. If mapping unclear — ask user explicitly
5. Don't override existing annotations — skip if already present

## Hard rules

- One epic per describe
- Feature within epic
- Story optional but recommended
- Severity: critical (money/auth), normal (UX), minor (cosmetic)
- Don't add labels Allure doesn't support
````

## Зависимости

- Allure 2.42 (already in devDependencies)
- `allure-playwright` или `allure-vitest`

## Источник

- Allure 2 docs
- Существующая структура `apps/web/tests/`, `apps/api/test/`
