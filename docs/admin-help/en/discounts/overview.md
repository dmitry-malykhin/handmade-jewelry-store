# Discount codes

## What this is for

Promo codes the customer enters at checkout to reduce their order total.
Two flavours: a percentage off (`10% off`) or a fixed cash amount off
(`$5 off`).

Use this page to:

- Create codes for campaigns (`WELCOME10`, `SUMMER25`, `BFCM30`)
- Enable / disable codes (toggle)
- See usage stats — how often each code has been redeemed
- Soft-delete codes that should no longer be valid

## Fields & controls

### Code
- **Purpose**: The string customers type into the checkout discount field.
- **How to fill**: 3–30 characters. Letters, digits, `_` and `-` only.
  Case-insensitive on redemption (`welcome10` works for `WELCOME10`).
- **Consequences**: This is the user-facing identifier. Once shared with
  customers, treat as immutable.
- **Recommended default**: ALL_CAPS, short, memorable. e.g. `WELCOME10`,
  `THANKS5`, `VIP15`.

### Type
- **Purpose**: How the discount is calculated.
- **Values**:
  - `PERCENTAGE` — `value` is a percent (1–100)
  - `FIXED_AMOUNT` — `value` is cents off (e.g. `500` = $5.00 off)

### Value
- **Purpose**: The discount magnitude.
- **How to fill**:
  - For `PERCENTAGE`: a whole number 1–100 (validated client-side)
  - For `FIXED_AMOUNT`: cents (e.g. `500` for $5)
- **Consequences**: Capped to the order subtotal at checkout — you can't
  go negative.
- **Recommended default**: 10–15% for first-time-buyer codes; $5–10 fixed
  for loyalty rewards.

### Minimum order (cents)
- **Purpose**: Discount only valid if `orderSubtotalCents >= minOrderCents`.
- **How to fill**: cents (e.g. `5000` = $50 minimum).
- **Consequences**: Prevents 10% codes from being burned on $10 orders.
- **Recommended default**: 3–5x the discount value (so a 10% off code
  needs at least $50 order).

### Max usages (optional)
- **Purpose**: Total redemption cap. After N successful checkouts the
  code stops working for everyone.
- **How to fill**: Integer ≥ 1, or leave blank for unlimited.
- **Consequences**: Useful for limited-time promos and influencer codes.

### Expires at (optional)
- **Purpose**: Date after which the code is invalid.
- **How to fill**: Date picker. UTC midnight.
- **Consequences**: Past the date the code returns "expired" error at
  checkout.

### Active toggle (per row, table)
- **Purpose**: Temporarily disable without deleting.
- **Consequences**: Inactive codes return "invalid" at checkout. Toggle
  back on to reinstate.

### Delete (per row)
- **Purpose**: Soft-delete — sets `deletedAt`, removes the code from the
  list, but preserves historical orders that used it.
- **Consequences**: Order history stays intact (you can still see the
  applied discount on past orders). The code can't be re-used. There's
  no undo through the UI — you'd need DB access.

## Common scenarios

**Newsletter welcome offer**
Code: `WELCOME10` | type `PERCENTAGE` | value `10` | min order `5000` ($50)
| no expiry | no max usages. Active.

**Black Friday — limited stock, 30% off, first 100 customers**
Code: `BFCM30` | `PERCENTAGE` 30 | min order `0` | max usages `100`
| expires Nov 30. Active.

**Influencer collab — $20 off any order, 500 redemptions**
Code: `JANE20` | `FIXED_AMOUNT` 2000 | min order `0` | max usages `500`
| expires in 3 months. Active.

## Edge cases & gotchas

- **Percentage value > 100 is rejected** by the form. (Client + server.)
- **Negative order total is clamped to zero** — a `$50 off` code on a $30
  order makes the order free, never negative.
- **Codes are case-insensitive on redemption** but stored as you typed
  them. Use ALL_CAPS for readability.
- **Soft delete preserves order history.** A deleted code still shows up
  on past orders' "applied discount" line.
- **Checkout integration is deferred** — this page lets you manage codes,
  but applying them at checkout is a separate issue still in the backlog
  (#…). Pending that, codes won't actually reduce real customer totals.
- **No per-customer limit** — same customer can use the same code many
  times until max usages is hit.

## Related

- [Orders overview](../orders/overview.md) — see which orders used which code
- [Settings — general](../settings/general.md)
