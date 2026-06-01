# prisma-migrate-safe (custom)

**Effort:** medium. **Impact:** high.

## Что делает

Guard перед `prisma migrate dev`:

1. **Запрещает drop/rename** без явного backfill-комментария
2. **Проверяет sync ENUM ↔ TypeScript constants** (например `OrderStatus` в schema.prisma должен соответствовать `order-status.transitions.ts`)
3. **Обновляет seed** после изменений
4. **Проверяет money/measurement conventions** (Int cents, Cm/Grams суффиксы)

Дополняет official `prisma` plugin — выполняется ПЕРЕД ним.

## Trigger

- Auto на любое изменение `apps/api/prisma/schema.prisma`
- User: `/prisma-migrate-safe` перед `pnpm db:migrate`

## SKILL.md

````markdown
---
name: prisma-migrate-safe
description: Use BEFORE running prisma migrate dev or db push. Validates schema.prisma changes for safety: blocks unannotated drop/rename, verifies ENUM↔TypeScript constant sync, checks money/measurement naming conventions, and ensures seed is updated.
---

# prisma-migrate-safe

## Checks

### 1. Drop/Rename guard

Block migration if diff contains:
- `DROP COLUMN` without `-- backfill: <reason>` comment in `migrations/`
- `RENAME` without explicit backward-compat note
- `DROP TABLE` without explicit user confirmation

Allow if:
- Comment includes `-- safe: never used in production` (must be true)
- Migration includes explicit data migration step

### 2. ENUM sync

For each Prisma enum, find corresponding TypeScript file:

| Prisma enum | TS file | Must be in sync |
| --- | --- | --- |
| `OrderStatus` | `apps/api/src/orders/order-status.transitions.ts` | yes |
| `StockType` | `apps/api/src/products/stock-type.ts` | yes |
| `PaymentMethod` | `apps/api/src/payments/payment-method.ts` | yes |
| `Currency` | `packages/shared/src/currency.ts` | yes |

Report if values diverge. Auto-fix by updating TS file to match Prisma (Prisma is source of truth).

### 3. Money/Measurement naming

(Same checks as `scripts/check-money-fields.mjs` hook, but interactive.)

- All price/amount fields → `Int` ending in `Cents`
- All weight fields → `Int` (grams) ending in `Grams`
- All dimension fields (length/width/height/depth) → `Int` ending in `Cm`
- Bead size always `Float` in mm
- Ring sizes — never numerical conversion (use lookup table)

### 4. Seed update

If new field added to model — check `apps/api/prisma/seed.ts`:
- New required field without default → seed must populate it
- New optional field → no action needed
- New enum value → propose seed example

### 5. Migration name

Migration name must describe WHAT changed:
- ✓ `add_production_days_to_order`
- ✓ `add_order_status_processing`
- ✓ `add_product_dimensions`
- ✗ `update_schema`
- ✗ `fix`

## Procedure

1. Run `npx prisma migrate diff --from-empty --to-schema-datamodel apps/api/prisma/schema.prisma --script` to get SQL diff.
2. Parse diff for DROP/RENAME — flag.
3. Walk through schema, check enum sync.
4. Check money/measurement conventions.
5. Check seed.
6. If all green — propose migration command:
   ```
   pnpm db:migrate --name add_order_status_processing
   ```
7. If issues — block and report.

## Hard rules

- Never bypass with `--accept-data-loss` unless explicit user confirmation
- Never run `prisma migrate reset` automatically
- Never run on production DB
````

## Trade-offs

- ENUM sync requires maintaining the mapping table — needs update when new domain entities arrive
- Manual seed updates still slow — could be auto-generated but risky

## Зависимости

- Prisma 6
- Custom mapping table inside the skill body

## Источник

- docs/07_DOMAIN_ANALYSIS.md (schema rules)
- docs/08_ORDER_STATUS_MODEL.md (ENUM rules)
- docs/09_MULTI_CURRENCY.md, docs/10_MEASUREMENT_SYSTEMS.md
