"use server"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { sanitizeHtml, siteTitle } from "../utils/helpers"
import { sendEmail } from "./email"

// Helper function to create service client
function getServiceClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Helper to build notification email HTML
function buildNotificationEmailHtml(message: string): string {
  return `
    <p style="font-size: 16px; color: #374151; margin-bottom: 12px;">
      ${sanitizeHtml(message)}
    </p>
  `
}

// Helper to send broadcast notifications
async function sendBroadcastNotification(
  serviceSupabase: SupabaseClient,
  senderId: string,
  senderName: string | null,
  message: string,
  broadcastRole?: "all" | "Head Teacher" | "Teacher" | "Student",
) {
  let query = serviceSupabase.from("users").select("id, email, full_name").eq("is_approved", true)

  // Filter by role if specified and not "all"
  if (broadcastRole && broadcastRole !== "all") {
    query = query.eq("role", broadcastRole)
  }

  const { data: users } = await query

  if (!users || users.length === 0) {
    return
  }

  // Insert notifications for all users
  for (const user of users) {
    await serviceSupabase.from("notifications").insert({
      sender_id: senderId,
      recipient_id: user.id,
      message,
    })
  }

  // Send email to all users
  const allEmails = users.map((user) => user.email)
  await sendEmail(
    process.env.ADMIN_EMAIL!,
    `New notification from the ${siteTitle}`,
    `New notification from ${sanitizeHtml(senderName)}`,
    buildNotificationEmailHtml(message),
    allEmails,
  )
}

// Helper to resolve recipient ID (handles "admin" special case)
async function resolveRecipientId(
  serviceSupabase: SupabaseClient,
  recipientId: string | undefined,
): Promise<{ id: string | null; error: string | null }> {
  if (recipientId !== "admin") {
    return { id: recipientId || null, error: null }
  }

  const { data: adminUser } = await serviceSupabase.from("users").select("id").eq("role", "Admin").single()

  if (!adminUser) {
    return { id: null, error: "Admin user not found" }
  }

  return { id: adminUser.id, error: null }
}

// Helper to send single recipient notification
async function sendSingleNotification(
  serviceSupabase: SupabaseClient,
  senderId: string,
  senderName: string | null,
  recipientId: string | undefined,
  message: string,
): Promise<{ error: string | null }> {
  // Resolve recipient ID (handles "admin" case)
  const { id: actualRecipientId, error: resolveError } = await resolveRecipientId(serviceSupabase, recipientId)

  if (resolveError) {
    return { error: resolveError }
  }

  // Fetch recipient details
  const { data: recipient } = await serviceSupabase
    .from("users")
    .select("email, full_name")
    .eq("id", actualRecipientId)
    .single()

  if (!recipient) {
    return { error: "Recipient not found" }
  }

  // Insert notification
  await serviceSupabase.from("notifications").insert({
    sender_id: senderId,
    recipient_id: actualRecipientId,
    message,
  })

  // Send email
  await sendEmail(
    recipient.email,
    `New notification from the ${siteTitle}`,
    `New notification from ${sanitizeHtml(senderName)}`,
    buildNotificationEmailHtml(message),
  )

  return { error: null }
}

export async function fetchNotificationsWithSenders(userId: string) {
  try {
    const serviceSupabase = getServiceClient()

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
    const cookieStore = await cookies()
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

    const serviceSupabase = getServiceClient()

    // Fetch the sender's profile information
    const { data: senderProfile } = await serviceSupabase
      .from("users")
      .select("full_name")
      .eq("id", currentUser.user.id)
      .single()

    const senderName = senderProfile?.full_name || null

    if (isBroadcast) {
      await sendBroadcastNotification(serviceSupabase, currentUser.user.id, senderName, message, broadcastRole)
    } else {
      const result = await sendSingleNotification(serviceSupabase, currentUser.user.id, senderName, recipientId, message)
      if (result.error) {
        return { error: result.error }
      }
    }

    return { success: "Notification sent successfully" }
  } catch (error) {
    console.error("Error sending notification:", error)
    return { error: "Failed to send notification" }
  }
}
