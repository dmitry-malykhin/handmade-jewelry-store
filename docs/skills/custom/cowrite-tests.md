# cowrite-tests (custom)

**Effort:** medium. **Impact:** high.

## Что делает

По созданному файлу автоматически решает тип теста и создаёт скелет:

| Файл | Тест |
| --- | --- |
| Pure function / utility | unit test (Vitest) |
| Custom hook | `renderHook` unit test |
| React component | component test (RTL) |
| User flow across pages | E2E (Playwright) |
| NestJS service | `Test.createTestingModule` |
| NestJS controller | supertest |

Скелет включает осмысленные `describe/it` labels (per CLAUDE.md: "calls setTheme with 'dark' when clicked in light mode" — not "test 1").

## Trigger

- Auto на любой `Write` нового файла `src/**/*.ts(x)` без соседнего `.spec.`
- User: `/cowrite-tests <file>`

## SKILL.md

````markdown
---
name: cowrite-tests
description: Use after creating a new file in apps/web/src/ or apps/api/src/. Determines test type (unit/component/E2E/integration) from file content and scaffolds a Vitest or Playwright spec with self-describing labels per CLAUDE.md test rules.
---

# cowrite-tests

## Decision flow

1. Read target file.
2. Classify:
   - Pure function (exports function, no React/Nest imports) → **unit test** (Vitest)
   - Custom hook (filename starts with `use`, exports function returning hook value) → **renderHook test**
   - React component (exports function returning JSX) → **component test** (RTL + Vitest)
   - NestJS service (`@Injectable()`) → **service test** (NestJS testing module)
   - NestJS controller (`@Controller()`) → **controller test** (supertest)
   - User flow page (under `app/[locale]/.../page.tsx`) → **E2E test** (Playwright) IF representing critical flow
3. Generate spec file alongside.

## Naming conventions (from CLAUDE.md)

- `it('formats $89.00 as "$89.00" in en-US locale')` ✓
- `it('returns null when product is out of stock')` ✓
- `it('test 1')` ✗
- `it('works')` ✗

Variables:
- `mockSetTheme`, `cartItemWithPrice`, `renderedButton` ✓
- `mock`, `item`, `btn` ✗

## Templates

### Pure function (Vitest unit)

```ts
import { describe, it, expect } from 'vitest'
import { formatPriceInDollars } from './pricing-constants'

describe('formatPriceInDollars', () => {
  it('formats 8900 cents as "$89.00" in en-US with USD', () => {
    expect(formatPriceInDollars(8900, 'en-US', 'USD')).toBe('$89.00')
  })

  it('formats 8900 cents as "8 900,00 ₽" in ru-RU with RUB after exchange', () => {
    // rate from USD to RUB = 90
    expect(formatPriceInDollars(8900, 'ru-RU', 'RUB', 90)).toBe('8 900,00 ₽')
  })

  it('returns "Free" when cents is 0', () => {
    expect(formatPriceInDollars(0, 'en-US', 'USD')).toBe('Free')
  })
})
```

### React component (RTL)

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ProductCard } from './ProductCard'
import { NextIntlClientProvider } from 'next-intl'
import messagesEn from '@/messages/en.json'

const renderWithIntl = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={messagesEn}>
      {ui}
    </NextIntlClientProvider>
  )

describe('ProductCard', () => {
  const productSilverRing = {
    id: '1',
    slug: 'silver-ring',
    name: 'Sterling Silver Ring',
    priceCents: 8900,
    imageUrl: '/images/silver-ring.jpg',
  }

  it('renders product name and price', () => {
    renderWithIntl(<ProductCard product={productSilverRing} />)
    expect(screen.getByText('Sterling Silver Ring')).toBeInTheDocument()
    expect(screen.getByText(/89.00/)).toBeInTheDocument()
  })

  it('calls onAddToCart with productId when Add to Cart button is clicked', async () => {
    const mockOnAddToCart = vi.fn()
    renderWithIntl(<ProductCard product={productSilverRing} onAddToCart={mockOnAddToCart} />)

    await userEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(mockOnAddToCart).toHaveBeenCalledWith('1')
  })

  it('shows InstallmentPreview when price is >= $50', () => {
    renderWithIntl(<ProductCard product={productSilverRing} />)
    expect(screen.getByText(/Klarna/i)).toBeInTheDocument()
  })
})
```

### Custom hook (renderHook)

```ts
import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useCartTotalPrice } from './useCartTotalPrice'

describe('useCartTotalPrice', () => {
  it('returns 0 when cart is empty', () => {
    const { result } = renderHook(() => useCartTotalPrice([]))
    expect(result.current).toBe(0)
  })

  it('sums priceCents * quantity for all items', () => {
    const cartItems = [
      { productId: '1', priceCents: 8900, quantity: 2 },
      { productId: '2', priceCents: 3500, quantity: 1 },
    ]
    const { result } = renderHook(() => useCartTotalPrice(cartItems))
    expect(result.current).toBe(21300) // 8900*2 + 3500
  })
})
```

### NestJS service test

```ts
import { Test } from '@nestjs/testing'
import { describe, it, expect, beforeEach } from 'vitest'
import { ProductsService } from './products.service'
import { PrismaService } from '../prisma/prisma.service'

describe('ProductsService', () => {
  let service: ProductsService
  let prisma: PrismaService

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: { product: { findUnique: vi.fn() } } },
      ],
    }).compile()
    service = moduleRef.get(ProductsService)
    prisma = moduleRef.get(PrismaService)
  })

  it('returns product when slug exists', async () => {
    const productSilverRing = { id: '1', slug: 'silver-ring', name: '...' }
    vi.mocked(prisma.product.findUnique).mockResolvedValue(productSilverRing)

    const result = await service.findBySlug('silver-ring')

    expect(result).toEqual(productSilverRing)
    expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { slug: 'silver-ring' } })
  })

  it('throws NotFoundException when slug does not exist', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null)
    await expect(service.findBySlug('missing')).rejects.toThrow('Product not found')
  })
})
```

## Hard rules

1. **Self-describing labels** — `it('X when Y')` format
2. **Domain names for variables** — `productSilverRing`, not `product` or `item`
3. **`vi.mocked()` typed** — no `as any`
4. **Each test independent** — `beforeEach` resets state
5. **No `console.log` in tests**
6. **One assertion per test ideally** — multiple OK if they're checking aspects of same behavior

## Procedure

1. Read target file
2. Classify per decision flow
3. Generate spec file
4. Insert minimum 3 tests: happy path, edge case, error case
5. Report generated file + test count
6. Suggest user runs: `pnpm --filter <web|api> test:run -- --testPathPattern="<filename>"`
````

## Зависимости

- Vitest 1.x+
- `@testing-library/react`, `@testing-library/user-event`
- NestJS testing module
- next-intl provider for component tests

## Источник

- CLAUDE.md → раздел "Testing"
- docs/05_SEO_RULES.md (i18n tests must cover locales)
