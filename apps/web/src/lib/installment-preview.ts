// Marketing-only preview. The real eligibility check happens server-side in
// Stripe's Payment Element — never trust this number for billing.
//
// Boundaries come from Afterpay's US window: under $35 the merchant declines,
// over $1000 the customer is often declined. Showing "4 × $7.50" on a $30
// piece would just promise something Stripe is about to reject.

const AFTERPAY_MIN_PRICE_USD = 35
const AFTERPAY_MAX_PRICE_USD = 1000
const INSTALLMENTS = 4

export interface InstallmentPreview {
  installmentAmount: string
  installmentCount: number
}

// Returns null outside Afterpay's eligibility window — caller should hide the
// preview entirely rather than render a misleading value.
export function calculateInstallmentPreview(totalUsd: number): InstallmentPreview | null {
  if (!Number.isFinite(totalUsd) || totalUsd < AFTERPAY_MIN_PRICE_USD) return null
  if (totalUsd > AFTERPAY_MAX_PRICE_USD) return null

  const installmentAmount = (totalUsd / INSTALLMENTS).toFixed(2)
  return {
    installmentAmount,
    installmentCount: INSTALLMENTS,
  }
}
