"use server"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { sanitizeHtml, siteTitle } from "../utils/helpers"

export async function fetchNotificationsWithSenders(userId: string) {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data, error } = await serviceSupabase
      .from("notifications")
      .select(`
        id,
        sender_id,
        message,
        is_read,
        created_at,
        sender:users!sender_id (
          full_name,
          email,
          profile_image_url
        )
      `)
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching notifications with senders:", error)
      return { error: "Failed to fetch notifications", data: [] }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error("Error in fetchNotificationsWithSenders:", error)
    return { error: "Failed to fetch notifications", data: [] }
  }
}

export async function sendNotificationWithEmail(params: {
  recipientId: string
  message: string
  isBroadcast: boolean
}) {
  const { message, recipientId, isBroadcast } = params

  if (!message) {
    return { error: "Message is required" }
  }

  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      },
    )

    const { data: currentUser } = await supabase.auth.getUser()
    if (!currentUser.user) {
      return { error: "Not authenticated" }
    }

    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const resend = new Resend(process.env.RESEND_API_KEY)

    if (isBroadcast) {
      const { data: users } = await serviceSupabase.from("users").select("id, email, full_name").eq("is_approved", true)

      if (users) {
        for (const user of users) {
          await serviceSupabase.from("notifications").insert({
            sender_id: currentUser.user.id,
            recipient_id: user.id,
            message,
          })

          await resend.emails.send({
            from: `OKL Admin <${process.env.FROM_EMAIL}>`,
            to: user.email,
            subject: `New notification from the ${siteTitle}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #1f2937; padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0;">${siteTitle}</h1>
                </div>
                <div style="background: #f9fafb; padding: 30px;">
                  <p style="font-size: 16px; color: #374151;">Hi ${sanitizeHtml(user.full_name)},</p>
                  <p style="font-size: 16px; color: #374151;">${sanitizeHtml(message)}</p>
                </div>
              </div>
            `,
          })
        }
      }
    } else {
      let actualRecipientId = recipientId

      if (recipientId === "admin") {
        const { data: adminUser } = await serviceSupabase.from("users").select("id").eq("role", "Admin").single()

        if (!adminUser) {
          return { error: "Admin user not found" }
        }
        actualRecipientId = adminUser.id
      }

      const { data: recipient } = await serviceSupabase
        .from("users")
        .select("email, full_name")
        .eq("id", actualRecipientId)
        .single()

      if (!recipient) {
        return { error: "Recipient not found" }
      }

      await serviceSupabase.from("notifications").insert({
        sender_id: currentUser.user.id,
        recipient_id: actualRecipientId,
        message,
      })

      await resend.emails.send({
        from: `OKL Admin <${process.env.FROM_EMAIL}>`,
        to: recipient.email,
        subject: `New notification from the ${siteTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1f2937; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">${siteTitle}</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px;">
              <p style="font-size: 16px; color: #374151;">Hi ${sanitizeHtml(recipient.full_name)},</p>
              <p style="font-size: 16px; color: #374151;">${sanitizeHtml(message)}</p>
            </div>
          </div>
        `,
      })
    }

    return { success: "Notification sent successfully" }
  } catch (error) {
    console.error("Error sending notification:", error)
    return { error: "Failed to send notification" }
  }
}
