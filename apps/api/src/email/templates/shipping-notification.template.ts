import { getFrontendUrl } from '../../common/config/urls'
import { renderEmailFooter } from './email-footer.partial'

export interface ShippingNotificationData {
  recipientEmail: string
  orderId: string
  trackingNumber?: string
  shippingCarrier?: string
  orderAccessToken: string
}

const CARRIER_TRACKING_URL: Record<string, (trackingNumber: string) => string> = {
  usps: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n)}`,
  fedex: (n) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}`,
  ups: (n) => `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}`,
  dhl: (n) =>
    `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${encodeURIComponent(n)}`,
  usps_tracking: (n) =>
    `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n)}`,
}

export function buildTrackingUrl(
  trackingNumber: string | undefined,
  shippingCarrier: string | undefined,
): string | null {
  if (!trackingNumber || !shippingCarrier) return null
  const lookup = CARRIER_TRACKING_URL[shippingCarrier.toLowerCase()]
  return lookup ? lookup(trackingNumber) : null
}

export function buildShippingNotificationEmail(data: ShippingNotificationData): {
  subject: string
  html: string
} {
  const { orderId, trackingNumber, shippingCarrier, orderAccessToken } = data
  const trackingUrl = buildTrackingUrl(trackingNumber, shippingCarrier)
  const viewOrderUrl = `${getFrontendUrl()}/en/checkout/confirmation/${orderId}?token=${encodeURIComponent(orderAccessToken)}`

  return {
    subject: `Your order is on its way! 📦 #${orderId.slice(-8).toUpperCase()}`,
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
          <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700;">Your order is on its way! 📦</h1>
          <p style="margin: 0 0 32px; color: #555; font-size: 15px; line-height: 1.7;">
            Your handmade piece has been carefully packaged and shipped. It's heading to you now!
          </p>

          ${
            trackingNumber
              ? `<div style="background: #f9f9f9; border-radius: 6px; padding: 20px; margin-bottom: ${trackingUrl ? '20px' : '32px'};">
                ${
                  shippingCarrier
                    ? `<p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888;">
                  Carrier
                </p>
                <p style="margin: 0 0 12px; font-size: 15px; color: #1a1a1a;">${shippingCarrier.toUpperCase()}</p>`
                    : ''
                }
                <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888;">
                  Tracking number
                </p>
                <p style="margin: 0; font-family: monospace; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                  ${trackingNumber}
                </p>
              </div>`
              : ''
          }
          ${
            trackingUrl
              ? `<a href="${trackingUrl}"
             style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin-bottom: 32px;">
            Track your package →
          </a>`
              : ''
          }

          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888;">
            Order number
          </p>
          <p style="margin: 0 0 24px; font-family: monospace; font-size: 15px;">
            #${orderId.slice(-8).toUpperCase()}
          </p>

          <a href="${viewOrderUrl}"
             style="display: inline-block; background: #ffffff; color: #1a1a1a; text-decoration: none; padding: 12px 28px; border: 1px solid #1a1a1a; border-radius: 6px; font-weight: 600; font-size: 14px; margin-bottom: 32px;">
            View your order
          </a>

          <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.6;">
            Thank you for choosing handmade. We hope you love your new piece! 💫
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
