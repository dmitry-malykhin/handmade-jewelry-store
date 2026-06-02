# tanstack-query-hook (custom)

**Effort:** low. **Impact:** high.

## Что делает

Создаёт `useXxxQuery` / `useXxxMutation` в `apps/web/src/hooks/queries/<domain>/` со:
- Zod-схема ответа
- Типы из `packages/shared`
- Иерархические `queryKey` (`['products', { categoryId, page }]`)
- Invalidation на mutate
- Optimistic updates где уместно

## Trigger

- User: `/query-hook fetchProductBySlug` или "создай query hook"
- Auto-suggest когда юзер пробует `useEffect + fetch` (нарушение CLAUDE.md)

## SKILL.md

````markdown
---
name: tanstack-query-hook
description: Use when creating data-fetching hooks (TanStack Query). Generates hooks under apps/web/src/hooks/queries/<domain>/ with Zod response schema, types from packages/shared, hierarchical queryKey, mutation invalidation, and optional optimistic updates.
---

# tanstack-query-hook

## Inputs

1. **Hook name** — camelCase starting with `use`, `useProductBySlug`, `useCartItems`.
2. **Type** — `query` (read) or `mutation` (write).
3. **Endpoint** — full path or NestJS controller method.
4. **Domain** — for folder placement.

## Files created

```
apps/web/src/hooks/queries/<domain>/
└── <useHook>.ts
```

## Template (query)

```ts
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import type { Product } from '@handmade/shared'

const ProductResponseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  priceCents: z.number().int(),
  // ...
}) satisfies z.ZodType<Product>

async function fetchProductBySlug(slug: string): Promise<Product> {
  const response = await fetch(`/api/products/${slug}`)
  if (!response.ok) throw new Error('Failed to fetch product')
  const data = await response.json()
  return ProductResponseSchema.parse(data)
}

export function useProductBySlug(slug: string) {
  return useQuery({
    queryKey: ['products', 'by-slug', slug] as const,
    queryFn: () => fetchProductBySlug(slug),
    staleTime: 1000 * 60 * 5, // 5 min
  })
}
```

## Template (mutation)

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

const AddToCartInputSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
})

type AddToCartInput = z.infer<typeof AddToCartInputSchema>

async function addToCart(input: AddToCartInput) {
  const response = await fetch('/api/cart/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error('Failed to add to cart')
  return response.json()
}

export function useAddToCartMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addToCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}
```

## queryKey hierarchy convention

- `['products']` — list root
- `['products', 'by-slug', slug]` — single by slug
- `['products', 'by-category', categoryId]` — list by category
- `['cart']` — current user's cart
- `['cart', 'items']` — items in cart
- `['orders', 'by-user', userId]` — user's orders

Invalidations cascade by prefix: `invalidateQueries({ queryKey: ['cart'] })` invalidates `cart` + `cart.items`.

## Hard rules

1. **No `any`**. All inputs/outputs typed.
2. **Validate response with Zod** — catches schema drift between API and frontend.
3. **`packages/shared` types** for entities (Product, Order, etc.).
4. **No `useEffect` for fetching** — this skill replaces that pattern.
5. **Mutation invalidates relevant queries** — never leave stale data.
6. **`staleTime` set explicitly** — default 0 spams API.
7. **Server Components don't use these** — they use direct `fetch` with `cache: ...`. Hooks are for Client Components only.

## Post-scaffold

- Add hook to `index.ts` barrel in domain folder.
- Add test for happy path: `<useHook>.spec.ts` using `renderHook` + MSW mock.
````

## Зависимости

- TanStack Query 5
- Zod
- `packages/shared` для types

## Источник

- CLAUDE.md → "Components never make API requests directly — use TanStack Query"
- CLAUDE.md → "No `useEffect` for data fetching"
