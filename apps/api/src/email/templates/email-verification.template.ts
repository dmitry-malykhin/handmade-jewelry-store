import { renderEmailFooter } from './email-footer.partial'

export interface EmailVerificationData {
  recipientEmail: string
  verificationToken: string
  frontendUrl: string
}

export function buildEmailVerificationEmail(data: EmailVerificationData): {
  subject: string
  html: string
} {
  const verifyUrl = `${data.frontendUrl}/en/verify-email?token=${data.verificationToken}`

  return {
    subject: '✦ Jewelry: Verify your email',
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
          <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700;">Confirm your email address</h1>
          <p style="margin: 0 0 24px; color: #555; font-size: 15px; line-height: 1.7;">
            Welcome to Jewelry. Please confirm this is your email so you can sign in.
            This link expires in <strong>24 hours</strong>.
          </p>
          <a href="${verifyUrl}"
             style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px;">
            Verify email →
          </a>
          <p style="margin: 24px 0 0; color: #888; font-size: 13px; line-height: 1.6;">
            If you didn't create an account, you can safely ignore this email. No account was created without confirming this address.
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
