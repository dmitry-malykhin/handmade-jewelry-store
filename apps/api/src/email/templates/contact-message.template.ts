export interface ContactMessageEmailData {
  senderName: string
  senderEmail: string
  subject: string
  message: string
}

export function buildContactMessageEmail(data: ContactMessageEmailData): {
  subject: string
  html: string
} {
  const escapedMessage = data.message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  return {
    subject: `[Contact Form] ${data.subject}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f9f9f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9f9f9; padding: 32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 8px; overflow: hidden; max-width: 600px; width: 100%;">

        <tr><td style="background: #1a1a1a; padding: 28px 40px;">
          <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 0.05em;">✦ Jewelry — New Message</p>
        </td></tr>

        <tr><td style="padding: 40px;">
          <h1 style="margin: 0 0 24px; font-size: 20px; font-weight: 700;">New contact form submission</h1>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; width: 100px; font-size: 13px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">From</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #1a1a1a;">${data.senderName} &lt;${data.senderEmail}&gt;</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-size: 13px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Subject</td>
              <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${data.subject}</td>
            </tr>
          </table>

          <div style="background: #f9f9f9; border-radius: 6px; padding: 20px; font-size: 14px; line-height: 1.7; color: #333;">
            ${escapedMessage}
          </div>

          <p style="margin: 24px 0 0; font-size: 13px; color: #888;">
            Reply directly to this email to respond to ${data.senderName}.
          </p>
        </td></tr>

        <tr><td style="padding: 24px 40px; border-top: 1px solid #f0f0f0;">
          <p style="margin: 0; font-size: 12px; color: #aaa; text-align: center;">
            Sent via the contact form at ✦ Jewelry
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
