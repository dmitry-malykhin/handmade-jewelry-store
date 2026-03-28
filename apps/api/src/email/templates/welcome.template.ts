export interface WelcomeEmailData {
  recipientEmail: string
}

export function buildWelcomeEmail(_data: WelcomeEmailData): { subject: string; html: string } {
  return {
    subject: 'Welcome to ✦ Jewelry — handmade with love',
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
          <a href="${process.env['FRONTEND_URL'] ?? 'http://localhost:3001'}/shop"
             style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px;">
            Explore the collection →
          </a>
        </td></tr>

        <tr><td style="padding: 24px 40px; border-top: 1px solid #f0f0f0;">
          <p style="margin: 0; font-size: 12px; color: #aaa; text-align: center;">
            You're receiving this because you created an account at ✦ Jewelry.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
