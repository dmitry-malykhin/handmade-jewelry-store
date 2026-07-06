export interface DisputeAlertData {
  disputeId: string
  chargeId: string
  orderId: string
  amountUsd: number
  reason: string | null
  adminUrl: string
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

// Recipient is the store owner (STORE_OWNER_EMAIL). Plain, terse layout —
// this is an ops alert, not a marketing email. Loud subject prefix so the
// alert is unmissable in a busy inbox.
export function buildDisputeAlertEmail(data: DisputeAlertData): {
  subject: string
  html: string
} {
  const { disputeId, chargeId, orderId, amountUsd, reason, adminUrl } = data
  const shortOrderId = orderId.slice(-8).toUpperCase()

  return {
    subject: `[ACTION REQUIRED] Chargeback dispute on order #${shortOrderId} — ${formatUsd(amountUsd)}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#fff;">
  <h1 style="margin:0 0 12px;font-size:20px;color:#c53030;">Chargeback dispute filed</h1>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
    Order <strong>#${shortOrderId}</strong> has been flagged by Stripe. The order is now in
    <strong>ON_HOLD</strong> status and shipping is paused until resolved.
  </p>
  <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px;margin-bottom:16px;">
    <tr><td style="color:#888;">Order</td><td style="font-family:monospace;">${orderId}</td></tr>
    <tr><td style="color:#888;">Amount</td><td><strong>${formatUsd(amountUsd)}</strong></td></tr>
    <tr><td style="color:#888;">Stripe charge</td><td style="font-family:monospace;">${chargeId}</td></tr>
    <tr><td style="color:#888;">Stripe dispute</td><td style="font-family:monospace;">${disputeId}</td></tr>
    <tr><td style="color:#888;">Reason</td><td>${reason ?? 'unspecified'}</td></tr>
  </table>
  <p style="margin:0 0 12px;font-size:14px;">
    <a href="${adminUrl}" style="display:inline-block;padding:10px 16px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:4px;">
      Review order in admin
    </a>
  </p>
  <p style="margin:16px 0 0;font-size:12px;color:#888;line-height:1.5;">
    Respond in the Stripe Dashboard before the dispute deadline (usually 7–21 days) or the funds
    will be forfeited automatically.
  </p>
</body>
</html>`,
  }
}
