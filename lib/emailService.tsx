import { Resend } from "resend"

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is required")
}

if (!process.env.FROM_EMAIL) {
  throw new Error("FROM_EMAIL environment variable is required")
}

const resend = new Resend(process.env.RESEND_API_KEY)
const siteTitle = "Okinawa Kobudo Library"

function sanitizeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
}

interface SendInvitationEmailParams {
  recipientEmail: string
  inviterName: string
  invitationToken: string
}

interface SendNotificationEmailParams {
  recipientEmail: string
  recipientName: string
  senderName: string
  message: string
}

export async function sendInvitationEmail({ recipientEmail, inviterName, invitationToken }: SendInvitationEmailParams) {
  const signUpUrl = `${process.env.NEXT_PUBLIC_FULL_SITE_URL || "http://localhost:3000"}/auth/sign-up`

  const { data, error } = await resend.emails.send({
    from: `OKL Admin <${process.env.FROM_EMAIL}>`,
    to: recipientEmail,
    subject: `Invitation to Join the ${siteTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
            You're Invited!
          </h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
            Join the ${siteTitle}
          </p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hello! <strong>${sanitizeHtml(inviterName)}</strong> has invited you to join the ${siteTitle}, an exclusive resource for Matayoshi/Okinawa Kobudo Australia students.
          </p>
          
          <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0;">
            This library provides access to instructional videos, techniques, and resources to support your martial arts journey.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signUpUrl}" 
               style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
                      color: white; 
                      text-decoration: none; 
                      padding: 14px 28px; 
                      border-radius: 8px; 
                      font-weight: 600; 
                      font-size: 16px; 
                      display: inline-block;
                      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">
              Accept Invitation
            </a>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #475569; margin: 0 0 10px 0; font-size: 16px;">What you'll get access to:</h3>
            <ul style="color: #64748b; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Instructional video library</li>
              <li>Technique demonstrations and tutorials</li>
              <li>Training resources and materials</li>
              <li>Community of fellow practitioners</li>
            </ul>
          </div>
          
          <!-- Removed validity text as functionality is not implemented -->
          <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; text-align: center;">
            If you have any questions, please contact your instructor.
          </p>
        </div>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send invitation email: ${error.message}`)
  }

  return data
}

export async function sendNotificationEmail({
  recipientEmail,
  recipientName,
  senderName,
  message,
}: SendNotificationEmailParams) {
  const libraryUrl = `${process.env.NEXT_PUBLIC_FULL_SITE_URL || "http://localhost:3000"}`

  const { data, error } = await resend.emails.send({
    from: `OKL Admin <${process.env.FROM_EMAIL}>`,
    to: recipientEmail,
    subject: `New Message from the ${siteTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Updated to use consistent purple branding instead of red -->
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">
            New Message
          </h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
            ${siteTitle}
          </p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hello ${sanitizeHtml(recipientName)},
          </p>
          
          <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
            You have received a new message from <strong>${sanitizeHtml(senderName)}</strong>:
          </p>
          
          <!-- Updated border color to match purple theme -->
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #7c3aed; margin: 20px 0;">
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0;">
              ${sanitizeHtml(message)}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <!-- Updated button colors to match purple theme -->
            <a href="${libraryUrl}" 
               style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); 
                      color: white; 
                      text-decoration: none; 
                      padding: 14px 28px; 
                      border-radius: 8px; 
                      font-weight: 600; 
                      font-size: 16px; 
                      display: inline-block;
                      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">
              View Message
            </a>
          </div>
          
          <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; text-align: center;">
            This message was sent through the ${siteTitle} notification system.
          </p>
        </div>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Failed to send notification email: ${error.message}`)
  }

  return data
}
