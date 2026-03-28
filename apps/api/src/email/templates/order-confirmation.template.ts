export interface OrderConfirmationData {
  orderId: string
  recipientEmail: string
  items: Array<{
    title: string
    quantity: number
    price: number
  }>
  subtotal: number
  shippingCost: number
  total: number
  shippingAddress: {
    fullName: string
    addressLine1: string
    addressLine2?: string
    city: string
    state?: string
    postalCode: string
    country: string
  }
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function buildOrderConfirmationEmail(data: OrderConfirmationData): {
  subject: string
  html: string
} {
  const { orderId, items, subtotal, shippingCost, total, shippingAddress } = data

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
          <span style="font-weight: 500;">${item.title}</span>
          <span style="color: #888; margin-left: 8px;">× ${item.quantity}</span>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: right; white-space: nowrap;">
          ${formatUsd(item.price * item.quantity)}
        </td>
      </tr>`,
    )
    .join('')

  const addressLine = [
    shippingAddress.addressLine1,
    shippingAddress.addressLine2,
    `${shippingAddress.city}${shippingAddress.state ? `, ${shippingAddress.state}` : ''} ${shippingAddress.postalCode}`,
    shippingAddress.country,
  ]
    .filter(Boolean)
    .join('<br>')

  return {
    subject: `Order confirmed — #${orderId.slice(-8).toUpperCase()}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f9f9f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9; padding: 32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden; max-width: 600px; width: 100%;">

        <!-- Header -->
        <tr><td style="background: #1a1a1a; padding: 28px 40px;">
          <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 0.05em;">✦ Jewelry</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding: 40px;">
          <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700;">Your order is confirmed ✓</h1>
          <p style="margin: 0 0 32px; color: #555; font-size: 15px;">
            Thank you for your purchase. Your handmade piece is being carefully prepared.
          </p>

          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888;">
            Order number
          </p>
          <p style="margin: 0 0 32px; font-family: monospace; font-size: 15px; color: #1a1a1a;">
            #${orderId.slice(-8).toUpperCase()}
          </p>

          <!-- Items -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
            ${itemRows}
            <tr>
              <td style="padding: 8px 0; color: #888; font-size: 14px;">Subtotal</td>
              <td style="padding: 8px 0; text-align: right; font-size: 14px;">${formatUsd(subtotal)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888; font-size: 14px;">Shipping</td>
              <td style="padding: 8px 0; text-align: right; font-size: 14px; color: ${shippingCost === 0 ? '#22a722' : '#1a1a1a'};">
                ${shippingCost === 0 ? 'FREE' : formatUsd(shippingCost)}
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0 0; font-weight: 700; border-top: 2px solid #1a1a1a; font-size: 16px;">Total</td>
              <td style="padding: 12px 0 0; text-align: right; font-weight: 700; border-top: 2px solid #1a1a1a; font-size: 16px;">
                ${formatUsd(total)}
              </td>
            </tr>
          </table>

          <!-- Shipping address -->
          <div style="background: #f9f9f9; border-radius: 6px; padding: 20px; margin-bottom: 32px;">
            <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888;">
              Shipping to
            </p>
            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1a1a1a;">
              <strong>${shippingAddress.fullName}</strong><br>${addressLine}
            </p>
          </div>

          <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.6;">
            We'll send you a shipping notification with tracking details once your order is on its way.
            Each piece is handmade with care — thank you for your patience. 🙏
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding: 24px 40px; border-top: 1px solid #f0f0f0;">
          <p style="margin: 0; font-size: 12px; color: #aaa; text-align: center;">
            Questions? Reply to this email or contact us anytime.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
