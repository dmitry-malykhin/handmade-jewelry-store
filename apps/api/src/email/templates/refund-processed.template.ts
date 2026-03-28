export interface RefundProcessedData {
  recipientEmail: string
  orderId: string
  refundAmount: number
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function buildRefundProcessedEmail(data: RefundProcessedData): {
  subject: string
  html: string
} {
  const { orderId, refundAmount } = data

  return {
    subject: `Refund processed — #${orderId.slice(-8).toUpperCase()}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f9f9f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9; padding: 32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden; max-width: 600px; width: 100%;">

        <tr><td style="background: #1a1a1a; padding: 28px 40px;">
          <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 0.05em;">✦ Jewelry</p>
        </td></tr>

        <tr><td style="padding: 40px;">
          <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700;">Refund processed ✓</h1>
          <p style="margin: 0 0 32px; color: #555; font-size: 15px; line-height: 1.7;">
            Your refund has been processed. The amount will appear on your statement within 5–10 business days.
          </p>

          <div style="background: #f9f9f9; border-radius: 6px; padding: 20px; margin-bottom: 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size: 14px; color: #888;">Order</td>
                <td style="font-size: 14px; text-align: right; font-family: monospace;">
                  #${orderId.slice(-8).toUpperCase()}
                </td>
              </tr>
              <tr>
                <td style="font-size: 16px; font-weight: 700; padding-top: 8px;">Refund amount</td>
                <td style="font-size: 16px; font-weight: 700; text-align: right; padding-top: 8px; color: #22a722;">
                  ${formatUsd(refundAmount)}
                </td>
              </tr>
            </table>
          </div>

          <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.6;">
            We're sorry the order didn't work out. If you have any questions, please don't hesitate to reach out.
          </p>
        </td></tr>

        <tr><td style="padding: 24px 40px; border-top: 1px solid #f0f0f0;">
          <p style="margin: 0; font-size: 12px; color: #aaa; text-align: center;">
            Questions? Reply to this email — we're happy to help.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
