import { getFrontendUrl } from '../../common/config/urls'
import { renderEmailFooter } from './email-footer.partial'

export interface ProductionStartedItem {
  title: string
}

export interface ProductionStartedData {
  recipientEmail: string
  orderId: string
  items: ProductionStartedItem[]
  // Human-formatted ship-by window — produced by the caller so the service
  // controls locale/timezone instead of the template.
  expectedShipByText: string | null
  orderAccessToken: string
}

export function buildProductionStartedEmail(data: ProductionStartedData): {
  subject: string
  html: string
} {
  const { orderId, items, expectedShipByText, orderAccessToken } = data
  const viewOrderUrl = `${getFrontendUrl()}/en/checkout/confirmation/${orderId}?token=${encodeURIComponent(orderAccessToken)}`

  const itemList = items
    .map(
      (item) => `
      <li style="padding: 6px 0; font-size: 14px; color: #1a1a1a;">${item.title}</li>`,
    )
    .join('')

  return {
    subject: `We've started crafting your order ✦ #${orderId.slice(-8).toUpperCase()}`,
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
          <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700;">We've started crafting your order ✦</h1>
          <p style="margin: 0 0 32px; color: #555; font-size: 15px; line-height: 1.7;">
            Your piece is made-to-order and work has now begun. Every detail is shaped by hand, so each stage takes time.
          </p>

          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888;">
            Now crafting
          </p>
          <ul style="margin: 0 0 24px; padding: 0 0 0 18px;">
            ${itemList}
          </ul>

          ${
            expectedShipByText
              ? `<div style="background: #f9f9f9; border-radius: 6px; padding: 20px; margin-bottom: 32px;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888;">
              Expected to ship by
            </p>
            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
              ${expectedShipByText}
            </p>
          </div>`
              : ''
          }

          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888;">
            Order number
          </p>
          <p style="margin: 0 0 24px; font-family: monospace; font-size: 15px;">
            #${orderId.slice(-8).toUpperCase()}
          </p>

          <a href="${viewOrderUrl}"
             style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin-bottom: 32px;">
            View your order →
          </a>

          <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.6;">
            We'll send a shipping notification with tracking the moment your piece leaves our studio. Thank you for waiting. 🙏
          </p>
        </td></tr>

        <tr><td style="padding: 16px 40px 0;">
          <p style="margin: 0; font-size: 12px; color: #aaa; text-align: center;">
            Questions? Reply to this email, we're happy to help.
          </p>
        </td></tr>

        ${renderEmailFooter({ variant: 'transactional' })}

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
