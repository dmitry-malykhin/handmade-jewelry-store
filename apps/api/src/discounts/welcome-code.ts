// Shared welcome-discount constants. The seed script creates the Discount row,
// and auth.service.verifyEmail passes these into the welcome email template so
// buyers see the same code everywhere.
//
// Shared code (not per-user) — `maxUsages` on the Discount row is left null
// (unlimited) so marketing can lift the gate at any time; order-side defence
// against abuse already lives in DiscountsService.applyOnOrderCreate.

export const WELCOME_DISCOUNT_CODE = 'WELCOME15'
export const WELCOME_DISCOUNT_PERCENT = 15
// $40 — keeps the code from being applied to a single-earring order and
// matches the sign-up discount convention most DTC jewelry brands use.
export const WELCOME_DISCOUNT_MIN_ORDER_CENTS = 4000
