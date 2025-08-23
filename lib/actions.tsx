"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"

export async function signIn(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

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

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    })

    if (error) {
      return { error: error.message }
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return { error: "Failed to establish session" }
    }

    redirect("/")
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred" }
  }
}

export async function signUp(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")
  const fullName = formData.get("fullName")
  const teacher = formData.get("teacher")
  const school = formData.get("school")

  if (!email || !password || !fullName || !teacher || !school) {
    return { error: "All fields are required" }
  }

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

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
        data: {
          full_name: fullName.toString(),
        },
      },
    })

    if (error) {
      return { error: error.message }
    }

    if (data.user) {
      const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const profileData = {
        id: data.user.id,
        email: data.user.email,
        full_name: fullName.toString(),
        teacher: teacher.toString(),
        school: school.toString(),
        role: "Student",
        is_approved: false,
      }

      const { error: profileError } = await serviceSupabase.from("users").insert(profileData)

      if (profileError) {
        console.error("Profile creation error:", profileError)
        return { error: "Failed to create user profile. Please try again." }
      }

      try {
        await sendNewUserNotification({
          userEmail: email.toString(),
          fullName: fullName.toString(),
          teacher: teacher.toString(),
          school: school.toString(),
        })
      } catch (emailError) {
        console.error("Email notification failed:", emailError)
        // Don't fail the signup if email fails
      }
    }

    return {
      success: "Check your email to confirm your account, then you can sign in.",
    }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signOut() {
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

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error("Sign out error:", error.message)
  } else {
    try {
      cookieStore.set("sb-access-token", "", {
        expires: new Date(0),
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      })
      cookieStore.set("sb-refresh-token", "", {
        expires: new Date(0),
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      })
    } catch (cookieError) {
      // Cookie clearing completed
    }
  }

  redirect("/auth/login")
}

export async function approveUser(userId: string) {
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

  try {
    const { data: currentUser } = await supabase.auth.getUser()

    if (!currentUser.user) {
      return { error: "Not authenticated" }
    }

    const { data: adminCheck } = await supabase
      .from("users")
      .select("email, is_approved")
      .eq("id", currentUser.user.id)
      .single()

    if (!adminCheck?.is_approved || adminCheck.email !== "acmyma@gmail.com") {
      return { error: "Not authorized" }
    }

    const { error } = await supabase
      .from("users")
      .update({
        is_approved: true,
        approved_by: currentUser.user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (error) {
      return { error: error.message }
    }

    return { success: "User approved successfully" }
  } catch (error) {
    console.error("Approve user error:", error)
    return { error: "An unexpected error occurred" }
  }
}

export async function createAdminUser() {
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

  try {
    const { data, error } = await supabase.auth.signUp({
      email: "acmyma@gmail.com",
      password: "admin123",
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000",
        data: {
          email_confirm: true,
        },
      },
    })

    if (error) {
      return { error: error.message }
    }

    if (data.user) {
      const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const { error: profileError } = await serviceSupabase.from("users").insert({
        id: data.user.id,
        email: data.user.email,
        full_name: "Administrator",
        is_approved: true,
        approved_by: data.user.id,
        approved_at: new Date().toISOString(),
      })

      if (profileError) {
        console.error("Admin profile creation error:", profileError)
        return { error: "Failed to create admin profile" }
      }
    }

    return { success: "Admin user created! You can now sign in with acmyma@gmail.com / admin123" }
  } catch (error) {
    console.error("Create admin user error:", error)
    return { error: "An unexpected error occurred" }
  }
}

export async function updateProfile(data: {
  userId: string
  email: string
  fullName: string | null
  profileImageUrl: string | null
  teacher?: string | null
  school?: string | null
}) {
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
    if (!currentUser.user || currentUser.user.id !== data.userId) {
      return { error: "Not authorized" }
    }

    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const updateData: any = {
      full_name: data.fullName,
      profile_image_url: data.profileImageUrl,
    }

    if (data.teacher !== undefined) updateData.teacher = data.teacher
    if (data.school !== undefined) updateData.school = data.school

    const { error } = await serviceSupabase.from("users").update(updateData).eq("id", data.userId)

    if (error) {
      return { error: error.message }
    }

    return { success: "Profile updated successfully" }
  } catch (error) {
    console.error("Profile update error:", error)
    return { error: "An unexpected error occurred" }
  }
}

export async function deleteUserCompletely(userId: string, userEmail: string) {
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

    // Verify admin authorization
    const { data: currentUser } = await supabase.auth.getUser()
    if (!currentUser.user) {
      return { error: "Not authenticated" }
    }

    const { data: adminCheck } = await supabase
      .from("users")
      .select("email, is_approved")
      .eq("id", currentUser.user.id)
      .single()

    if (!adminCheck?.is_approved || adminCheck.email !== "acmyma@gmail.com") {
      return { error: "Not authorized" }
    }

    // Use service role client for complete deletion
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Delete from database first
    const { error: dbError } = await serviceSupabase.from("users").delete().eq("id", userId)

    if (dbError) {
      console.error("Database deletion error:", dbError)
      return { error: "Failed to delete user from database" }
    }

    // Delete from Supabase auth
    const { error: authError } = await serviceSupabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.error("Auth deletion error:", authError)
      // Note: Database record is already deleted, but auth user remains
      return { error: "User database record deleted, but auth user deletion failed" }
    }

    return { success: "User completely deleted from both database and authentication" }
  } catch (error) {
    console.error("Complete user deletion error:", error)
    return { error: "An unexpected error occurred during deletion" }
  }
}

export async function rejectUser(userId: string) {
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

    // Verify admin authorization
    const { data: currentUser } = await supabase.auth.getUser()
    if (!currentUser.user) {
      return { error: "Not authenticated" }
    }

    const { data: adminCheck } = await supabase
      .from("users")
      .select("email, is_approved")
      .eq("id", currentUser.user.id)
      .single()

    if (!adminCheck?.is_approved || adminCheck.email !== "acmyma@gmail.com") {
      return { error: "Not authorized" }
    }

    // Use service role client for deletion
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Delete from database first
    const { error: dbError } = await serviceSupabase.from("users").delete().eq("id", userId)

    if (dbError) {
      console.error("Database deletion error:", dbError)
      return { error: "Failed to reject user" }
    }

    // Delete from Supabase auth
    const { error: authError } = await serviceSupabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.error("Auth deletion error:", authError)
      // Database record is already deleted, but auth user remains
    }

    return { success: "User rejected and removed successfully" }
  } catch (error) {
    console.error("Reject user error:", error)
    return { error: "An unexpected error occurred during rejection" }
  }
}

export async function fetchPendingUsers() {
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

    // Verify admin authorization
    const { data: currentUser } = await supabase.auth.getUser()
    if (!currentUser.user) {
      return { error: "Not authenticated", data: [] }
    }

    const { data: adminCheck } = await supabase
      .from("users")
      .select("email, is_approved")
      .eq("id", currentUser.user.id)
      .single()

    if (!adminCheck?.is_approved || adminCheck.email !== "acmyma@gmail.com") {
      return { error: "Not authorized", data: [] }
    }

    // Fetch pending users
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, teacher, school, created_at")
      .eq("is_approved", false)
      .order("created_at", { ascending: false })

    if (error) {
      return { error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Fetch pending users error:", error)
    return { error: "An unexpected error occurred", data: [] }
  }
}

export async function fetchNotificationsWithSenders(userId: string) {
  try {
    if (!userId || userId === "undefined" || userId.trim() === "") {
      console.error("[v0] Invalid userId provided to fetchNotificationsWithSenders:", userId)
      return { error: "Invalid user ID", data: [] }
    }

    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Fetch notifications for the user
    const { data: notifications, error: notificationsError } = await serviceSupabase
      .from("notifications")
      .select("id, sender_id, message, is_read, created_at, is_broadcast")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(10)

    if (notificationsError) {
      console.error("[v0] Error fetching notifications:", notificationsError)
      return { error: "Failed to fetch notifications", data: [] }
    }

    if (!notifications || notifications.length === 0) {
      return { success: true, data: [] }
    }

    // Get unique sender IDs
    const senderIds = [...new Set(notifications.map((n) => n.sender_id).filter(Boolean))]

    // Fetch sender information using service role client (bypasses RLS)
    const { data: senders, error: sendersError } = await serviceSupabase
      .from("users")
      .select("id, full_name, email, profile_image_url")
      .in("id", senderIds)

    if (sendersError) {
      console.error("[v0] Error fetching senders:", sendersError)
      return { error: "Failed to fetch sender information", data: [] }
    }

    // Create sender lookup map
    const sendersMap = (senders || []).reduce(
      (acc, sender) => {
        acc[sender.id] = sender
        return acc
      },
      {} as Record<string, any>,
    )

    // Combine notifications with sender info
    const notificationsWithSenders = notifications.map((notification) => ({
      ...notification,
      sender: sendersMap[notification.sender_id] || null,
    }))

    return { success: true, data: notificationsWithSenders }
  } catch (error) {
    console.error("[v0] Error in fetchNotificationsWithSenders:", error)
    return { error: "An unexpected error occurred", data: [] }
  }
}

export async function sendNotificationWithEmail({
  recipientId,
  message,
  isBroadcast = false,
}: {
  recipientId?: string
  message: string
  isBroadcast?: boolean
}) {
  try {
    console.log("[v0] sendNotificationWithEmail called with:", { recipientId, message, isBroadcast })

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

    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Get current user (sender)
    const { data: currentUser } = await supabase.auth.getUser()
    if (!currentUser.user) {
      console.log("[v0] No authenticated user found")
      return { error: "Not authenticated" }
    }
    console.log("[v0] Current user found:", currentUser.user.id)

    // Get sender info using service role client
    const { data: senderInfo } = await serviceSupabase
      .from("users")
      .select("full_name, email")
      .eq("id", currentUser.user.id)
      .single()
    console.log("[v0] Sender info:", senderInfo)

    if (isBroadcast) {
      // Get all approved users for broadcast using service role client
      const { data: users } = await serviceSupabase
        .from("users")
        .select("id, email, full_name")
        .eq("is_approved", true)
        .neq("id", currentUser.user.id) // Don't send to sender

      if (!users || users.length === 0) {
        return { error: "No users to send broadcast to" }
      }

      // Create notifications for all users using service role client
      const notifications = users.map((user) => ({
        sender_id: currentUser.user!.id,
        recipient_id: user.id,
        message: message.trim(),
        is_read: false,
        is_broadcast: true,
      }))

      const { error: notificationError } = await serviceSupabase.from("notifications").insert(notifications)

      if (notificationError) {
        return { error: "Failed to send broadcast notifications" }
      }

      // Send emails to all users
      const emailPromises = users.map((user) =>
        sendBroadcastNotificationEmail({
          recipientEmail: user.email,
          recipientName: user.full_name,
          message: message.trim(),
        }).catch((error) => {
          console.error(`Failed to send email to ${user.email}:`, error)
        }),
      )

      await Promise.allSettled(emailPromises)

      return { success: `Broadcast sent to ${users.length} users` }
    } else {
      // Individual message
      if (!recipientId) {
        console.log("[v0] No recipient ID provided")
        return { error: "Recipient ID required for individual message" }
      }

      let actualRecipientId = recipientId
      if (recipientId === "admin") {
        console.log("[v0] Looking for admin user")
        const { data: adminUser, error: adminError } = await serviceSupabase
          .from("users")
          .select("id, email")
          .or("role.eq.admin,email.eq.acmyma@gmail.com")
          .eq("is_approved", true)
          .limit(1)
          .single()

        console.log("[v0] Admin lookup result:", { adminUser, adminError })

        if (!adminUser) {
          console.log("[v0] No admin user found")
          return { error: "No admin user found. Please ensure an admin user exists." }
        }
        actualRecipientId = adminUser.id
        console.log("[v0] Using admin user ID:", actualRecipientId)
      }

      // Get recipient info using the actual recipient ID and service role client
      console.log("[v0] Looking up recipient info for ID:", actualRecipientId)
      const { data: recipientInfo, error: recipientError } = await serviceSupabase
        .from("users")
        .select("email, full_name")
        .eq("id", actualRecipientId)
        .single()

      console.log("[v0] Recipient lookup result:", { recipientInfo, recipientError })

      if (!recipientInfo) {
        console.log("[v0] Recipient not found")
        return { error: "Recipient not found" }
      }

      console.log("[v0] Creating notification in database")
      const { error: notificationError } = await serviceSupabase.from("notifications").insert({
        sender_id: currentUser.user.id,
        recipient_id: actualRecipientId,
        message: message.trim(),
        is_read: false,
        is_broadcast: false,
      })

      console.log("[v0] Notification creation result:", { notificationError })

      if (notificationError) {
        console.log("[v0] Failed to create notification:", notificationError.message)
        return { error: "Failed to send notification" }
      }

      // Send email
      console.log("[v0] Attempting to send email")
      try {
        await sendNotificationEmail({
          recipientEmail: recipientInfo.email,
          recipientName: recipientInfo.full_name,
          senderName: senderInfo?.full_name || null,
          message: message.trim(),
          isFromAdmin: senderInfo?.email === "acmyma@gmail.com",
        })
        console.log("[v0] Email sent successfully")
      } catch (emailError) {
        console.error("[v0] Failed to send notification email:", emailError)
        console.error("[v0] Email error details:", {
          message: emailError.message,
          recipientEmail: recipientInfo.email,
          isFromAdmin: senderInfo?.email === "acmyma@gmail.com",
        })
        // Don't fail the notification if email fails
      }

      console.log("[v0] Message sent successfully")
      return { success: "Message sent successfully" }
    }
  } catch (error) {
    console.error("[v0] Error in sendNotificationWithEmail:", error)
    return { error: "An unexpected error occurred" }
  }
}

export async function changePassword(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const currentPassword = formData.get("currentPassword")
  const newPassword = formData.get("newPassword")
  const confirmPassword = formData.get("confirmPassword")

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All password fields are required" }
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match" }
  }

  if (newPassword.toString().length < 6) {
    return { error: "New password must be at least 6 characters long" }
  }

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

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { error: "Auth session missing!" }
    }

    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Update password using admin API (server-side, no BroadcastChannel issues)
    const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(user.id, {
      password: newPassword.toString(),
    })

    if (updateError) {
      return { error: updateError.message || "Failed to update password" }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: newPassword.toString(),
    })

    if (signInError) {
      // Password was updated but session refresh failed - user will need to login manually
      return { error: "Password updated but session refresh failed. Please log in again." }
    }

    return { success: "Password updated successfully" }
  } catch (error) {
    console.error("Change password error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function inviteUser(email: string) {
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

    // Verify user is authenticated
    const { data: currentUser } = await supabase.auth.getUser()
    if (!currentUser.user) {
      return { error: "Not authenticated" }
    }

    // Use service role client for admin operations
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    try {
      const { data: existingUser, error: checkError } = await serviceSupabase
        .from("users")
        .select("id, email, is_approved")
        .eq("email", email.toLowerCase())
        .not("is_approved", "is", null) // Only users who have completed registration
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking existing user:", checkError)
        return { error: "Failed to validate user" }
      }

      if (existingUser) {
        return { error: "This user is already registered. No invitation needed." }
      }

      const { data: authUsers, error: authError } = await serviceSupabase.auth.admin.listUsers()

      if (authError) {
        console.error("Error checking auth users:", authError)
        return { error: "Failed to validate user" }
      }

      const existingAuthUser = authUsers.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())

      if (existingAuthUser) {
        const { error: deleteError } = await serviceSupabase.auth.admin.deleteUser(existingAuthUser.id)

        if (deleteError) {
          console.error("Error deleting existing auth user:", deleteError)
          return { error: "Failed to resend invitation" }
        }
      }

      const { data, error } = await serviceSupabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
      })

      if (error) {
        console.error("Supabase invite error:", error.message)
        return { error: "Failed to send invitation: " + error.message }
      }

      const successMessage = existingAuthUser ? "Invitation resent successfully" : "Invitation sent successfully"

      return { success: successMessage, data }
    } catch (inviteError: any) {
      console.error("Invite process error:", inviteError.message)
      return { error: "Failed to send invitation" }
    }
  } catch (error: any) {
    console.error("General invite error:", error.message)
    return { error: "Failed to send invitation" }
  }
}

export async function saveVideo(videoData: any) {
  console.log("[v0] saveVideo called with data:", JSON.stringify(videoData, null, 2))

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
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      console.log("[v0] saveVideo - No authenticated user:", userError)
      return { error: "Not authenticated" }
    }

    console.log("[v0] saveVideo - User info:", {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role,
      app_metadata: user.app_metadata,
    })

    // Get user profile for additional context
    const { data: userProfile, error: profileError } = await serviceSupabase
      .from("users")
      .select("role, is_approved, full_name")
      .eq("id", user.id)
      .single()

    console.log("[v0] saveVideo - User profile:", userProfile, "Profile error:", profileError)

    let videoId = videoData.id

    if (videoId) {
      console.log("[v0] saveVideo - Updating existing video:", videoId)
      // Update existing video
      const { error: updateError } = await serviceSupabase
        .from("videos")
        .update({
          title: videoData.title,
          description: videoData.description,
          video_url: videoData.video_url,
          thumbnail_url: videoData.thumbnail_url,
          duration_seconds: videoData.duration_seconds,
          is_published: videoData.is_published,
          recorded: videoData.recorded,
          updated_at: new Date().toISOString(),
        })
        .eq("id", videoId)

      if (updateError) {
        console.error("[v0] saveVideo - Video update error:", updateError)
        return { error: "Failed to update video" }
      }
    } else {
      console.log("[v0] saveVideo - Creating new video")
      // Create new video
      const { data: newVideo, error: insertError } = await serviceSupabase
        .from("videos")
        .insert({
          title: videoData.title,
          description: videoData.description,
          video_url: videoData.video_url,
          thumbnail_url: videoData.thumbnail_url,
          duration_seconds: videoData.duration_seconds,
          is_published: videoData.is_published,
          recorded: videoData.recorded,
          created_by: user.id,
        })
        .select()
        .single()

      if (insertError || !newVideo) {
        console.error("[v0] saveVideo - Video insert error:", insertError)
        return { error: "Failed to create video" }
      }

      videoId = newVideo.id
      console.log("[v0] saveVideo - Created new video with ID:", videoId)
    }

    // Update video categories
    console.log("[v0] saveVideo - Processing categories:", videoData.category_ids)
    if (videoData.category_ids.length > 0) {
      // Delete existing categories
      const { error: deleteCategoriesError } = await serviceSupabase
        .from("video_categories")
        .delete()
        .eq("video_id", videoId)

      if (deleteCategoriesError) {
        console.error("[v0] saveVideo - Delete categories error:", deleteCategoriesError)
      }

      // Insert new categories
      const categoryInserts = videoData.category_ids.map((categoryId: string) => ({
        video_id: videoId,
        category_id: categoryId,
      }))

      console.log("[v0] saveVideo - Inserting categories:", categoryInserts)
      const { error: categoryError } = await serviceSupabase.from("video_categories").insert(categoryInserts)

      if (categoryError) {
        console.error("[v0] saveVideo - Category assignment error:", categoryError)
        return { error: "Failed to assign categories" }
      }
    }

    // Update video performers
    console.log("[v0] saveVideo - Processing performers:", videoData.performer_ids)
    if (videoData.performer_ids.length > 0) {
      // Delete existing performers
      console.log("[v0] saveVideo - Deleting existing performers for video:", videoId)
      const { error: deletePerformersError } = await serviceSupabase
        .from("video_performers")
        .delete()
        .eq("video_id", videoId)

      if (deletePerformersError) {
        console.error("[v0] saveVideo - Delete performers error:", deletePerformersError)
      }

      // Insert new performers
      const performerInserts = videoData.performer_ids.map((performerId: string) => ({
        video_id: videoId,
        performer_id: performerId,
      }))

      console.log("[v0] saveVideo - Inserting performers:", performerInserts)
      const { error: performerError } = await serviceSupabase.from("video_performers").insert(performerInserts)

      if (performerError) {
        console.error("[v0] saveVideo - Performer assignment error:", performerError)
        console.log("[v0] saveVideo - Failed performer data:", {
          videoId,
          performerInserts,
          userInfo: { id: user.id, email: user.email },
          userProfile,
        })
        return { error: "Failed to assign performers" }
      }
    }

    console.log("[v0] saveVideo - Successfully completed for video:", videoId)
    return { success: true, videoId }
  } catch (error) {
    console.error("[v0] saveVideo - Unexpected error:", error)
    return { error: "An unexpected error occurred" }
  }
}

export async function incrementVideoViews(videoId: string) {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase
      .from("videos")
      .update({
        views: serviceSupabase.raw("views + 1"),
      })
      .eq("id", videoId)

    if (error) {
      console.error("[v0] incrementVideoViews - Error:", error)
      return { error: "Failed to increment views" }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] incrementVideoViews - Unexpected error:", error)
    return { error: "An unexpected error occurred" }
  }
}

export async function trackUserLogin() {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return parseCookieHeader(headers().get("Cookie") ?? "")
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookies().set(name, value, options))
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { error: "User not authenticated" }
    }

    // Insert login record
    const { error } = await supabase.from("user_logins").insert({
      user_id: user.id,
      login_time: new Date().toISOString(),
    })

    if (error) {
      console.error("[v0] Error tracking login:", error)
      return { error: "Failed to track login" }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] trackUserLogin error:", error)
    return { error: "An unexpected error occurred tracking login" }
  }
}

export async function getTelemetryData() {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Get current date and calculate week boundaries (Monday as week start)
    const now = new Date()
    const currentDay = now.getDay()
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1 // Sunday = 0, so 6 days from Monday

    const thisWeekStart = new Date(now)
    thisWeekStart.setDate(now.getDate() - daysFromMonday)
    thisWeekStart.setHours(0, 0, 0, 0)

    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(thisWeekStart.getDate() - 7)

    const lastWeekEnd = new Date(thisWeekStart)
    lastWeekEnd.setMilliseconds(-1)

    console.log("[v0] Telemetry date ranges:", {
      thisWeekStart: thisWeekStart.toISOString(),
      lastWeekStart: lastWeekStart.toISOString(),
      lastWeekEnd: lastWeekEnd.toISOString(),
    })

    // Get total video views
    const { data: totalViewsData, error: totalViewsError } = await serviceSupabase.from("videos").select("views")

    if (totalViewsError) {
      console.error("[v0] Error fetching total views:", totalViewsError)
      return { error: "Failed to fetch total views" }
    }

    const totalViews = totalViewsData?.reduce((sum, video) => sum + (video.views || 0), 0) || 0

    // Get video views this week (videos created this week)
    const { data: thisWeekVideos, error: thisWeekError } = await serviceSupabase
      .from("videos")
      .select("views")
      .gte("created_at", thisWeekStart.toISOString())

    if (thisWeekError) {
      console.error("[v0] Error fetching this week videos:", thisWeekError)
      return { error: "Failed to fetch this week video data" }
    }

    const thisWeekViews = thisWeekVideos?.reduce((sum, video) => sum + (video.views || 0), 0) || 0

    // Get video views last week (videos created last week)
    const { data: lastWeekVideos, error: lastWeekError } = await serviceSupabase
      .from("videos")
      .select("views")
      .gte("created_at", lastWeekStart.toISOString())
      .lt("created_at", thisWeekStart.toISOString())

    if (lastWeekError) {
      console.error("[v0] Error fetching last week videos:", lastWeekError)
      return { error: "Failed to fetch last week video data" }
    }

    const lastWeekViews = lastWeekVideos?.reduce((sum, video) => sum + (video.views || 0), 0) || 0

    // Get user logins this week
    const { data: thisWeekLogins, error: thisWeekLoginsError } = await serviceSupabase
      .from("user_logins")
      .select("user_id", { count: "exact" })
      .gte("login_time", thisWeekStart.toISOString())

    if (thisWeekLoginsError) {
      console.error("[v0] Error fetching this week logins:", thisWeekLoginsError)
      return { error: "Failed to fetch this week login data" }
    }

    // Get user logins last week
    const { data: lastWeekLogins, error: lastWeekLoginsError } = await serviceSupabase
      .from("user_logins")
      .select("user_id", { count: "exact" })
      .gte("login_time", lastWeekStart.toISOString())
      .lt("login_time", thisWeekStart.toISOString())

    if (lastWeekLoginsError) {
      console.error("[v0] Error fetching last week logins:", lastWeekLoginsError)
      return { error: "Failed to fetch last week login data" }
    }

    const telemetryData = {
      totalViews,
      thisWeekViews,
      lastWeekViews,
      thisWeekUserLogins: thisWeekLogins?.length || 0,
      lastWeekUserLogins: lastWeekLogins?.length || 0,
    }

    console.log("[v0] Telemetry data:", telemetryData)
    return { success: true, data: telemetryData }
  } catch (error) {
    console.error("[v0] getTelemetryData error:", error)
    return { error: "An unexpected error occurred fetching telemetry data" }
  }
}

async function sendNewUserNotification({
  userEmail,
  fullName,
  teacher,
  school,
}: {
  userEmail: string
  fullName: string
  teacher: string
  school: string
}) {
  if (!process.env.RESEND_API_KEY) {
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const emailContent = `
    <h2>New User Registration Requires Approval</h2>
    <p>A new user has registered and is waiting for approval:</p>
    
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p><strong>Teacher:</strong> ${teacher}</p>
      <p><strong>School:</strong> ${school}</p>
    </div>
    
    <p>Please log in to the admin panel to approve or review this user registration.</p>
    
    <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin" style="background: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Admin Panel</a></p>
  `

  await resend.emails.send({
    from: process.env.FROM_EMAIL || "noreply@yourdomain.com",
    to: "acmyma@gmail.com",
    subject: `New User Registration: ${fullName}`,
    html: emailContent,
  })
}

async function sendNotificationEmail({
  recipientEmail,
  recipientName,
  senderName,
  message,
  isFromAdmin = false,
}: {
  recipientEmail: string
  recipientName: string | null
  senderName: string | null
  message: string
  isFromAdmin?: boolean
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[v0] No RESEND_API_KEY found, skipping email")
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  console.log("[v0] Email parameters:", {
    recipientEmail,
    recipientName,
    senderName,
    isFromAdmin,
    messageLength: message.length,
  })

  const emailSubject = `New Message from ${isFromAdmin ? "Administrator" : senderName || "TY Kobudo Library"}`
  console.log("[v0] Email subject:", emailSubject)

  const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailSubject}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto;">
                        <tr>
                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                                <h1 style="color: white; margin: 0; font-size: 24px;">TY Kobudo Library</h1>
                                <p style="color: #f0f0f0; margin: 5px 0 0 0;">New Message Notification</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 30px; background: #ffffff;">
                                <h2 style="color: #333; margin-top: 0;">You have a new message!</h2>
                                <p style="color: #666; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                                    Hello ${recipientName || "there"}, you've received a new message in your TY Kobudo Library account.
                                </p>
                                
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isFromAdmin ? "#6f42c1" : "#dc3545"};">
                                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px; font-weight: bold;">
                                        From: ${senderName || "Unknown User"}${isFromAdmin ? " (Administrator)" : ""}
                                    </p>
                                    <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e9ecef;">
                                        <p style="margin: 0; color: #333; font-size: 16px; line-height: 1.5;">
                                            "${message}"
                                        </p>
                                    </div>
                                </div>
                                
                                <p style="color: #666; margin: 20px 0;">
                                    To view and respond to this message, please log in to your account:
                                </p>
                                
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}" 
                                       style="background: ${isFromAdmin ? "#6f42c1" : "#dc3545"}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                        View Message
                                    </a>
                                </div>
                                
                                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                                
                                <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                                    This is an automated notification from TY Kobudo Library.<br>
                                    Please do not reply to this email.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
  `

  console.log("[v0] Attempting to send email via Resend")
  console.log("[v0] From address:", process.env.FROM_EMAIL || "noreply@tykobudolibrary.com")
  console.log("[v0] To address:", recipientEmail)

  try {
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL || "noreply@tykobudolibrary.com",
      to: recipientEmail,
      subject: emailSubject,
      html: emailContent,
    })

    console.log("[v0] Resend API response:", result)

    if (result.error) {
      console.error("[v0] Resend API returned error:", result.error)
      throw new Error(`Resend API error: ${result.error.message || JSON.stringify(result.error)}`)
    }

    if (!result.data?.id) {
      console.error("[v0] Resend API returned no message ID")
      throw new Error("Email sending failed - no message ID returned")
    }

    console.log("[v0] Email send successful, message ID:", result.data.id)
  } catch (error) {
    console.error("[v0] Resend API error:", error)
    console.error("[v0] Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    })
    throw error
  }
}

async function sendBroadcastNotificationEmail({
  recipientEmail,
  recipientName,
  message,
}: {
  recipientEmail: string
  recipientName: string | null
  message: string
}) {
  if (!process.env.RESEND_API_KEY) {
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">TY Kobudo Library</h1>
        <p style="color: #f0f0f0; margin: 5px 0 0 0;">Important Announcement</p>
      </div>
      
      <div style="padding: 30px; background: #ffffff;">
        <h2 style="color: #333; margin-top: 0;">Message from Administrator</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6f42c1;">
          <p style="margin: 0; color: #333; font-size: 16px; line-height: 1.5;">
            ${message}
          </p>
        </div>
        
        <p style="color: #666; margin: 20px 0;">
          This message has been sent to all users. Please log in to your account to view it:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}" 
             style="background: #6f42c1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Message
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          This is an automated notification from TY Kobudo Library.<br>
          Please do not reply to this email.
        </p>
      </div>
    </div>
  `

  await resend.emails.send({
    from: process.env.FROM_EMAIL || "noreply@tykobudolibrary.com",
    to: recipientEmail,
    subject: "Important Message from TY Kobudo Library Administrator",
    html: emailContent,
  })
}

function parseCookieHeader(cookieHeader: string): { name: string; value: string; options: any }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, value] = cookie.trim().split("=")
    return { name: name.trim(), value: value?.trim() || "", options: {} }
  })
}

export async function addPerformer(name: string) {
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
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: "Not authenticated" }
    }

    const { error } = await serviceSupabase.from("performers").insert([{ name: name.trim() }])

    if (error) {
      console.error("Error adding performer:", error)
      return { error: "Failed to add performer" }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error adding performer:", error)
    return { error: "An unexpected error occurred" }
  }
}

export async function updatePerformer(id: string, name: string) {
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
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: "Not authenticated" }
    }

    const { error } = await serviceSupabase.from("performers").update({ name: name.trim() }).eq("id", id)

    if (error) {
      console.error("Error updating performer:", error)
      return { error: "Failed to update performer" }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error updating performer:", error)
    return { error: "An unexpected error occurred" }
  }
}

export async function deletePerformer(id: string) {
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
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: "Not authenticated" }
    }

    // First delete all video_performer relationships
    const { error: relationError } = await serviceSupabase.from("video_performers").delete().eq("performer_id", id)

    if (relationError) {
      console.error("Error deleting performer relationships:", relationError)
      return { error: "Failed to delete performer relationships" }
    }

    // Then delete the performer
    const { error: performerError } = await serviceSupabase.from("performers").delete().eq("id", id)

    if (performerError) {
      console.error("Error deleting performer:", performerError)
      return { error: "Failed to delete performer" }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error deleting performer:", error)
    return { error: "An unexpected error occurred" }
  }
}
