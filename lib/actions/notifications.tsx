"use server"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { sanitizeHtml, siteTitle } from "../utils/helpers"
import { sendEmail } from "./email"

export async function fetchNotificationsWithSenders(userId: string) {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data, error } = await serviceSupabase
      .from("notifications")
      .select(
        `id, sender_id, message, is_read, created_at, sender:users!sender_id (full_name, email, profile_image_url)`,
      )
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
  recipientId?: string
  message: string
  isBroadcast: boolean
  broadcastRole?: "all" | "Head Teacher" | "Teacher" | "Student"
}) {
  const { message, recipientId, isBroadcast, broadcastRole } = params

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

    // Fetch the sender's profile information
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: senderProfile } = await serviceSupabase
      .from("users")
      .select("full_name")
      .eq("id", currentUser.user.id)
      .single()

    if (isBroadcast) {
      let query = serviceSupabase.from("users").select("id, email, full_name").eq("is_approved", true)

      // Filter by role if specified and not "all"
      if (broadcastRole && broadcastRole !== "all") {
        query = query.eq("role", broadcastRole)
      }

      const { data: users } = await query

      if (users && users.length > 0) {
        for (const user of users) {
          await serviceSupabase.from("notifications").insert({
            sender_id: currentUser.user.id,
            recipient_id: user.id,
            message,
          })
        }

        const allEmails = users.map((user) => user.email)
        await sendEmail(
          process.env.ADMIN_EMAIL!,
          `New notification from the ${siteTitle}`,
          `New notification from ${sanitizeHtml(senderProfile?.full_name)}`,
          `
            <p style="font-size: 16px; color: #374151; margin-bottom: 12px;">
              ${sanitizeHtml(message)}
            </p>
          `,
          allEmails,
        )
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

      await sendEmail(
        recipient.email,
        `New notification from the ${siteTitle}`,
        `New notification from ${sanitizeHtml(senderProfile?.full_name)}`,
        `
          <p style="font-size: 16px; color: #374151; margin-bottom: 12px;">
            ${sanitizeHtml(message)}
          </p>
        `,
      )
    }

    return { success: "Notification sent successfully" }
  } catch (error) {
    console.error("Error sending notification:", error)
    return { error: "Failed to send notification" }
  }
}
