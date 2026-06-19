/**
 * Installment preview for BNPL (Buy Now Pay Later).
 *
 * Renders "Or 4 payments of $X with Afterpay" under the price on product
 * detail and at checkout. Drives conversion uplift for handmade jewelry
 * priced $35–$1000 (Afterpay's standard US eligibility window).
 *
 * Design choices:
 *  - 4 equal installments — Afterpay default (Klarna offers similar but with
 *    variable schedules; we settle on Afterpay's "$X × 4" as the headline
 *    because it's the more recognizable BNPL pattern in US handmade space).
 *  - Below $35 — hide the preview. Afterpay's minimum order is $35; showing
 *    "Or 4 payments of $7.50" on a $30 piece is misleading because Afterpay
 *    would reject the transaction at checkout.
 *  - Above $1000 — also hide. Afterpay's eligibility upper bound shifts but
 *    typically caps at $1000–$2000 depending on customer credit history.
 *    Better not to promise what Stripe might decline.
 *
 * Stripe Payment Element handles the actual eligibility check at checkout
 * — the preview is purely a marketing signal.
 */

const AFTERPAY_MIN_PRICE_USD = 35
const AFTERPAY_MAX_PRICE_USD = 1000
const INSTALLMENTS = 4

export interface InstallmentPreview {
  /** Per-installment amount in dollars, e.g. "37.50" */
  installmentAmount: string
  /** Number of installments (always 4 for Afterpay default) */
  installmentCount: number
}

/**
 * Calculates the per-installment amount for an order. Returns `null` when the
 * total falls outside Afterpay's eligibility window — caller should not render
 * the preview at all in that case.
 *
 * @param totalUsd  Order total in USD (whole-dollar number, e.g. 49.99)
 */
export function calculateInstallmentPreview(totalUsd: number): InstallmentPreview | null {
  if (!Number.isFinite(totalUsd) || totalUsd < AFTERPAY_MIN_PRICE_USD) return null
  if (totalUsd > AFTERPAY_MAX_PRICE_USD) return null

  const installmentAmount = (totalUsd / INSTALLMENTS).toFixed(2)
  return {
    installmentAmount,
    installmentCount: INSTALLMENTS,
  }
}
