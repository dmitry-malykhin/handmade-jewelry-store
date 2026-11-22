import { getFrontendUrl } from '../../common/config/urls'
import { getStoreIdentity } from '../../common/config/store-identity'
import { renderEmailFooter } from './email-footer.partial'

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
  orderAccessToken: string
  // CRD Art. 6(1)(g): the trader must give the consumer an expected delivery
  // date. Caller computes a window from max(productionDays over items) + carrier
  // transit; passes it as an already-formatted ISO date range so the template
  // stays presentation-only.
  estimatedDeliveryText?: string
  // VAT amount already collected on this order. 0 for US-only sellers until
  // VAT handling lands (#561). Shown as a dedicated line regardless, because
  // CRD Art. 6(1)(e) requires the price breakdown to call out tax explicitly.
  vatAmount?: number
  // Gift / handwritten note the buyer left at checkout (#521). Echoed back so
  // the buyer sees it was received and we have a record in their inbox too.
  orderNote?: string | null
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function buildOrderConfirmationEmail(data: OrderConfirmationData): {
  subject: string
  html: string
} {
  const {
    orderId,
    items,
    subtotal,
    shippingCost,
    total,
    shippingAddress,
    orderAccessToken,
    estimatedDeliveryText,
    vatAmount = 0,
    orderNote,
  } = data

  const trimmedOrderNote = orderNote?.trim() ?? ''
  const escapedOrderNote = trimmedOrderNote.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return map[char] ?? char
  })
  const frontendUrl = getFrontendUrl()
  const viewOrderUrl = `${frontendUrl}/en/checkout/confirmation/${orderId}?token=${encodeURIComponent(orderAccessToken)}`
  const refundPolicyUrl = `${frontendUrl}/en/refund-policy`
  const impressumUrl = `${frontendUrl}/en/impressum`
  const trader = getStoreIdentity()
  const traderAddressLines = [
    trader.addressLine1,
    trader.addressLine2,
    `${trader.postalCode} ${trader.city}`,
    trader.country,
  ]
    .filter(Boolean)
    .join('<br>')

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
    subject: `Order confirmed: #${orderId.slice(-8).toUpperCase()}`,
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

        <!-- Trader identity (CRD Art. 6(1)(b)-(c) + Art. 8(7) durable-medium confirmation) -->
        <tr><td style="padding: 20px 40px 0; background: #ffffff;">
          <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888;">
            Sold by
          </p>
          <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #555;">
            <strong style="color: #1a1a1a;">${trader.legalName}</strong><br>${traderAddressLines}<br>
            <a href="mailto:${trader.contactEmail}" style="color: #555; text-decoration: underline;">${trader.contactEmail}</a>
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding: 32px 40px 40px;">
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

          <!-- Items + totals with explicit VAT line (CRD Art. 6(1)(e)) -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
            ${itemRows}
            <tr>
              <td style="padding: 8px 0; color: #888; font-size: 14px;">Subtotal</td>
              <td style="padding: 8px 0; text-align: right; font-size: 14px;">${formatUsd(subtotal)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #888; font-size: 14px;">VAT / Tax</td>
              <td style="padding: 8px 0; text-align: right; font-size: 14px;">${
                vatAmount > 0 ? formatUsd(vatAmount) : 'Included where applicable'
              }</td>
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

          <a href="${viewOrderUrl}"
             style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin-bottom: 32px;">
            View your order →
          </a>

          ${
            trimmedOrderNote
              ? `
          <!-- Buyer's gift / handwritten note (#521) -->
          <div style="background: #f9f9f9; border-left: 3px solid #1a1a1a; border-radius: 4px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888;">
              Your note to us
            </p>
            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #1a1a1a; white-space: pre-line;">${escapedOrderNote}</p>
          </div>`
              : ''
          }

          <!-- Shipping address + estimated delivery (CRD Art. 6(1)(g)) -->
          <div style="background: #f9f9f9; border-radius: 6px; padding: 20px; margin-bottom: 32px;">
            <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888;">
              Shipping to
            </p>
            <p style="margin: 0 0 ${estimatedDeliveryText ? '16px' : '0'}; font-size: 14px; line-height: 1.6; color: #1a1a1a;">
              <strong>${shippingAddress.fullName}</strong><br>${addressLine}
            </p>
            ${
              estimatedDeliveryText
                ? `
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888;">
              Expected delivery
            </p>
            <p style="margin: 0; font-size: 14px; color: #1a1a1a;">${estimatedDeliveryText}</p>`
                : ''
            }
          </div>

          <!-- Right of withdrawal (EU CRD Art. 6(1)(h) + Art. 8(7) + Annex I) -->
          <div style="border: 1px solid #e5e5e5; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #1a1a1a;">
              Your right of withdrawal (EU)
            </h2>
            <p style="margin: 0 0 8px; font-size: 13px; line-height: 1.6; color: #555;">
              If you live in the EU, you have 14 days from the day you receive your order to
              withdraw from this contract without giving any reason. Custom or personalised
              pieces are exempt from this right under CRD Art. 16(c).
            </p>
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #555;">
              Full details and the standard EU withdrawal form are available at
              <a href="${refundPolicyUrl}" style="color: #1a1a1a; text-decoration: underline;">${refundPolicyUrl}</a>.
            </p>
          </div>

          <!-- Complaint handling (CRD Art. 6(1)(c)) -->
          <p style="margin: 0 0 24px; font-size: 13px; color: #555; line-height: 1.6;">
            Questions, problems or complaints: reply to this email or write to
            <a href="mailto:${trader.contactEmail}" style="color: #1a1a1a; text-decoration: underline;">${trader.contactEmail}</a>.
            Full trader details at
            <a href="${impressumUrl}" style="color: #1a1a1a; text-decoration: underline;">${impressumUrl}</a>.
            EU buyers may also use the European Commission ODR platform at
            <a href="https://ec.europa.eu/consumers/odr/" style="color: #1a1a1a; text-decoration: underline;">ec.europa.eu/consumers/odr/</a>.
          </p>

          <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.6;">
            We'll send you a shipping notification with tracking details once your order is on its way.
            Each piece is handmade with care, thank you for your patience. 🙏
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
