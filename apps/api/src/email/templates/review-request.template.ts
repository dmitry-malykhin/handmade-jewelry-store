export interface ReviewRequestItem {
  productSlug: string
  title: string
}

export interface ReviewRequestData {
  recipientEmail: string
  orderId: string
  items: ReviewRequestItem[]
  frontendUrl: string
}

export function buildReviewRequestEmail(data: ReviewRequestData): {
  subject: string
  html: string
} {
  const { orderId, items, frontendUrl } = data
  const orderShortId = orderId.slice(-8).toUpperCase()

  const itemRows = items
    .map(
      (item) => `
        <tr><td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
          <p style="margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #1a1a1a;">
            ${escapeHtml(item.title)}
          </p>
          <a href="${frontendUrl}/en/products/${encodeURIComponent(item.productSlug)}#reviews"
             style="display: inline-block; font-size: 13px; font-weight: 600; color: #1a1a1a; text-decoration: underline;">
            Rate this piece →
          </a>
        </td></tr>`,
    )
    .join('')

  return {
    subject: `How's your piece? ✨ — Share a quick review`,
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
          <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700;">How's your piece? ✨</h1>
          <p style="margin: 0 0 32px; color: #555; font-size: 15px; line-height: 1.7;">
            Your order was delivered. A one-line review helps other shoppers pick with confidence — and helps me improve.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
            ${itemRows}
          </table>

          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888;">
            Order number
          </p>
          <p style="margin: 0; font-family: monospace; font-size: 15px;">#${orderShortId}</p>
        </td></tr>

        <tr><td style="padding: 24px 40px; border-top: 1px solid #f0f0f0;">
          <p style="margin: 0; font-size: 12px; color: #aaa; text-align: center;">
            Not into reviews? Just reply — I read every message.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
