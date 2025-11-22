"use server"

import { Resend } from "resend"

export async function sendEmail(
  recipient: string | undefined,
  subject: string,
  title: string,
  body: string,
  bcc?: string[],
): Promise<void> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: `OKL Admin <${process.env.FROM_EMAIL}>`,
      to: recipient || process.env.FROM_EMAIL!,
      bcc: bcc,
      subject: subject,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px; text-align: center; border-bottom: 3px solid #dc2626;">
              <h1 style="color: #dc2626; margin: 0; font-size: 28px; font-weight: bold;">Okinawa Kobudo Library</h1>
              <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">Matayoshi/Okinawa Kobudo Australia Video Library</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">${title}</h2>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #eee;">
              <p style="color: #999; margin: 0; font-size: 12px;">
                This email was sent from the <a href="${process.env.NEXT_PUBLIC_FULL_SITE_URL}">Okinawa Kobudo Library</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    })

    if (error) {
      console.error("Error sending email:", error)
      throw new Error("Failed to send email")
    }
  } catch (error) {
    console.error("Email sending failed:", error)
    throw error
  }
}
