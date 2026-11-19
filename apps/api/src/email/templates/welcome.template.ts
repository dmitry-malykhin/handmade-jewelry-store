import { getFrontendUrl } from '../../common/config/urls'
import { renderEmailFooter } from './email-footer.partial'

export interface WelcomeEmailData {
  recipientEmail: string
  unsubscribeUrl: string
  // #525: first-order discount surfaced in a monospace copy block. Both
  // fields must be set to render the block; leaving them undefined keeps the
  // legacy "just welcome" email intact.
  welcomeCode?: string
  discountPercent?: number
}

export function buildWelcomeEmail(data: WelcomeEmailData): { subject: string; html: string } {
  const frontendUrl = getFrontendUrl()
  const hasWelcomeDiscount =
    typeof data.welcomeCode === 'string' &&
    data.welcomeCode.length > 0 &&
    typeof data.discountPercent === 'number' &&
    data.discountPercent > 0

  const welcomeDiscountBlock = hasWelcomeDiscount
    ? `
          <div style="background: #f9f9f9; border: 1px dashed #1a1a1a; border-radius: 8px; padding: 24px; margin: 0 0 24px; text-align: center;">
            <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #888;">
              ${data.discountPercent}% off your first order
            </p>
            <p style="margin: 0 0 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 24px; font-weight: 700; letter-spacing: 0.15em; color: #1a1a1a;">
              ${data.welcomeCode}
            </p>
            <p style="margin: 0; font-size: 12px; color: #666;">
              Tap the code to copy, then apply it at checkout.
            </p>
          </div>`
    : ''

  const subject = hasWelcomeDiscount
    ? `Welcome to ✦ Jewelry — ${data.discountPercent}% off your first order inside`
    : 'Welcome to ✦ Jewelry, handmade with love'

  return {
    subject,
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
          <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700;">Welcome! 🎉</h1>
          <p style="margin: 0 0 24px; color: #555; font-size: 15px; line-height: 1.7;">
            Your account is ready. Explore our collection of handmade jewelry crafted with ethically sourced materials.
          </p>
          ${welcomeDiscountBlock}
          <a href="${frontendUrl}/"
             style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px;">
            Explore the collection →
          </a>
        </td></tr>

        <tr><td style="padding: 16px 40px 0;">
          <p style="margin: 0; font-size: 12px; color: #aaa; text-align: center;">
            You're receiving this because you created an account at ✦ Jewelry.
          </p>
        </td></tr>

        ${renderEmailFooter({ variant: 'marketing', unsubscribeUrl: data.unsubscribeUrl })}

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
