import { renderEmailFooter } from './email-footer.partial'

export interface NewsletterConfirmationData {
  recipientEmail: string
  confirmationToken: string
  frontendUrl: string
}

export function buildNewsletterConfirmationEmail(data: NewsletterConfirmationData): {
  subject: string
  html: string
} {
  const encodedEmail = encodeURIComponent(data.recipientEmail)
  const confirmUrl = `${data.frontendUrl}/en/newsletter/confirm?token=${data.confirmationToken}&email=${encodedEmail}`

  return {
    subject: '✦ Jewelry: Confirm your newsletter subscription',
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
          <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700;">Confirm your subscription</h1>
          <p style="margin: 0 0 24px; color: #555; font-size: 15px; line-height: 1.7;">
            You asked to receive our newsletter. Please confirm this is your email so we can send
            you handmade jewelry news, restocks and exclusive offers. This link expires in
            <strong>7 days</strong>.
          </p>
          <a href="${confirmUrl}"
             style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px;">
            Confirm subscription →
          </a>
          <p style="margin: 24px 0 0; color: #888; font-size: 13px; line-height: 1.6;">
            If you didn't request this, you can safely ignore this email. You will not be added to
            the list without confirming here.
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
