"use server"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { redirect } from "next/navigation"

function generateUUID() {
  // Use Web Crypto API if available (modern browsers and Node.js 16+)
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  // Fallback UUID v4 generation for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c == "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function signIn(prevState: any, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: "Invalid email or password" }
  }

  if (data.user?.id) {
    try {
      console.log("[v0] Tracking login for user:", data.user.id)

      const serviceSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() {
              return []
            },
            setAll() {},
          },
        },
      )

      const today = new Date().toISOString().split("T")[0]

      // Check if login already exists for today
      const { data: existingLogin, error: checkError } = await serviceSupabase
        .from("user_logins")
        .select("id")
        .eq("user_id", data.user.id)
        .gte("login_time", today)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      if (!existingLogin) {
        const { error: insertError } = await serviceSupabase.from("user_logins").insert({
          user_id: data.user.id,
          login_time: new Date().toISOString(),
        })

        if (insertError) {
          throw insertError
        }

        console.log("[v0] Login tracking successful")
      } else {
        console.log("[v0] Login already tracked for today")
      }
    } catch (trackingError) {
      console.log("[v0] Login tracking failed:", trackingError)
      // Don't fail signin if tracking fails
    }
  }

  redirect("/")
}

export async function signUp(prevState: any, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const fullName = formData.get("fullName") as string
  const school = formData.get("school") as string
  const teacher = formData.get("teacher") as string
  const eulaAccepted = formData.get("eulaAccepted") === "true"
  const privacyAccepted = formData.get("privacyAccepted") === "true"

  if (!email || !password || !fullName || !school || !teacher) {
    return { error: "All fields are required" }
  }

  if (!eulaAccepted || !privacyAccepted) {
    return { error: "You must accept both the EULA and Privacy Policy to create an account" }
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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo:
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
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
      full_name: fullName,
      school,
      teacher,
      is_approved: false,
    })

    if (profileError) {
      console.error("Error creating user profile:", profileError)
      return { error: "Failed to create user profile" }
    }

    const now = new Date().toISOString()
    const { error: consentError } = await serviceSupabase.from("user_consents").insert({
      user_id: data.user.id,
      eula_accepted_at: eulaAccepted ? now : null,
      privacy_accepted_at: privacyAccepted ? now : null,
    })

    if (consentError) {
      console.error("Error storing user consent:", consentError)
      return { error: "Failed to store legal consent" }
    }

    console.log("[v0] Attempting to clean up invitation for email:", email.toLowerCase())

    const { data: deletedInvitations, error: deleteError } = await serviceSupabase
      .from("invitations")
      .delete()
      .eq("email", email.toLowerCase())
      .select()

    if (deleteError) {
      console.error("[v0] Error deleting invitation record:", deleteError)
    } else {
      console.log("[v0] Invitation cleanup result:", deletedInvitations)
      if (deletedInvitations && deletedInvitations.length > 0) {
        console.log("[v0] Successfully deleted", deletedInvitations.length, "invitation record(s)")
      } else {
        console.log("[v0] No invitation records found to delete for email:", email.toLowerCase())
      }
    }

    try {
      const { data: adminUser } = await serviceSupabase
        .from("users")
        .select("id, email, full_name")
        .eq("role", "Admin")
        .single()

      if (adminUser) {
        const message = `New user registration pending approval:<br><br>
<strong>Name:</strong> ${fullName}<br>
<strong>Email:</strong> ${email}<br>
<strong>School:</strong> ${school}<br>
<strong>Teacher:</strong> ${teacher}<br><br>
Please review and approve this user in the admin dashboard.`

        await sendNotificationEmail({
          recipientEmail: adminUser.email,
          recipientName: adminUser.full_name,
          senderName: "System",
          message: message,
        })
      }
    } catch (emailError) {
      console.error("Failed to send admin notification email:", emailError)
    }
  }

  redirect("/pending-approval")
}

export async function createAdminUser(prevState: any, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const fullName = formData.get("fullName") as string

  if (!email || !password || !fullName) {
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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error: profileError } = await serviceSupabase.from("users").insert({
      id: data.user.id,
      email: data.user.email,
      full_name: fullName,
      role: "Admin",
      is_approved: true,
    })

    if (profileError) {
      console.error("Error creating admin profile:", profileError)
      return { error: "Failed to create admin profile" }
    }
  }

  redirect("/")
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

    const { data: currentUser } = await supabase.auth.getUser()
    if (!currentUser.user) {
      return { error: "Not authenticated" }
    }

    const { data: inviterUser } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", currentUser.user.id)
      .single()

    if (!inviterUser) {
      return { error: "User profile not found" }
    }

    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: existingUser, error: checkError } = await serviceSupabase
      .from("users")
      .select("id, email, is_approved")
      .eq("email", email.toLowerCase())
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing user:", checkError)
      return { error: "Failed to validate user" }
    }

    if (existingUser) {
      return { error: "This user is already registered. No invitation needed." }
    }

    const { data: existingInvitation } = await serviceSupabase
      .from("invitations")
      .select("id, expires_at")
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single()

    if (existingInvitation) {
      return { error: "An invitation has already been sent to this email address." }
    }

    const invitationToken = generateUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { error: inviteError } = await serviceSupabase.from("invitations").insert({
      email: email.toLowerCase(),
      invited_by: currentUser.user.id,
      token: invitationToken,
      expires_at: expiresAt.toISOString(),
      status: "pending",
    })

    if (inviteError) {
      console.error("Error creating invitation:", inviteError)
      return { error: "Failed to create invitation" }
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: email,
      subject: "You're invited to join TY Kobudo Library",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              ${inviterUser.full_name} has invited you to join the TY Kobudo Library.
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 30px;">
              This library is invite-only for Matayoshi/Okinawa Kobudo Australia Students.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL}/auth/sign-up" 
                 style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              This invitation will expire in 7 days.
            </p>
          </div>
        </div>
      `,
    })

    return { success: "Invitation sent successfully" }
  } catch (emailError) {
    console.error("Failed to send invitation email:", emailError)
    return { error: "Failed to send invitation email" }
  }
}

export async function incrementVideoViews(videoId: string) {
  try {
    console.log("[v0] Incrementing views for video:", videoId)
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: currentVideo, error: fetchError } = await serviceSupabase
      .from("videos")
      .select("views")
      .eq("id", videoId)
      .single()

    if (fetchError) {
      console.error("[v0] Error fetching current views:", fetchError)
      return { error: "Failed to fetch current views" }
    }

    const currentViews = currentVideo?.views || 0
    const newViews = currentViews + 1
    const newLastViewed = new Date().toISOString()

    console.log("[v0] Current views:", currentViews, "New views:", newViews)
    console.log("[v0] Setting last_viewed to:", newLastViewed)

    const { data: updateData, error } = await serviceSupabase
      .from("videos")
      .update({
        views: newViews,
        last_viewed: newLastViewed,
      })
      .eq("id", videoId)
      .select()

    console.log("[v0] Database update result - data:", updateData, "error:", error)

    if (error) {
      console.error("[v0] Error incrementing video views:", error)
      return { error: "Failed to increment video views" }
    }

    console.log("[v0] View increment successful - updated record:", updateData)
    return { success: true }
  } catch (error) {
    console.error("[v0] Error in incrementVideoViews:", error)
    return { error: "Failed to increment video views" }
  }
}

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

export async function fetchPendingUsers() {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data, error } = await serviceSupabase
      .from("users")
      .select("*")
      .eq("is_approved", false)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching pending users:", error)
      return { error: "Failed to fetch pending users", data: [] }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error("Error in fetchPendingUsers:", error)
    return { error: "Failed to fetch pending users", data: [] }
  }
}

export async function approveUser(userId: string) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: currentUser } = await supabase.auth.getUser()
    if (!currentUser.user) {
      return { error: "Not authenticated" }
    }

    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: user, error: userError } = await serviceSupabase
      .from("users")
      .select("email, full_name")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      console.error("Error fetching user:", userError)
      return { error: "User not found" }
    }

    const { error } = await serviceSupabase
      .from("users")
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: currentUser.user.id,
      })
      .eq("id", userId)

    if (error) {
      console.error("Error approving user:", error)
      return { error: "Failed to approve user" }
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: user.email,
      subject: "Your TY Kobudo Library account has been approved!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to TY Kobudo Library!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Hi ${user.full_name},
            </p>
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Great news! Your account has been approved and you now have access to the TY Kobudo Library.
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 30px;">
              You can now access our complete collection of instructional videos, techniques, and resources for Matayoshi/Okinawa Kobudo training.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL}" 
                 style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Access Library
              </a>
            </div>
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              Happy training!
            </p>
          </div>
        </div>
      `,
    })

    return { success: "User approved successfully" }
  } catch (error) {
    console.error("Error in approveUser:", error)
    return { error: "Failed to approve user" }
  }
}

export async function rejectUser(userId: string) {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase.from("users").delete().eq("id", userId)

    if (error) {
      console.error("Error rejecting user:", error)
      return { error: "Failed to reject user" }
    }

    return { success: "User rejected successfully" }
  } catch (error) {
    console.error("Error in rejectUser:", error)
    return { error: "Failed to reject user" }
  }
}

export async function deleteUserCompletely(userId: string) {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error: publicError } = await serviceSupabase.from("users").delete().eq("id", userId)

    if (publicError) {
      console.error("Error deleting user from public.users:", publicError)
      return { error: "Failed to delete user profile" }
    }

    const { error: authError } = await serviceSupabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.error("Error deleting user from auth (user may not exist in auth):", authError)
    }

    return { success: "User deleted successfully" }
  } catch (error) {
    console.error("Error in deleteUserCompletely:", error)
    return { error: "Failed to delete user" }
  }
}

export async function updateProfile(params: {
  userId: string
  email: string
  fullName: string | null
  teacher: string | null
  school: string | null
  profileImageUrl: string | null
}) {
  const { userId, email, fullName, teacher, school, profileImageUrl } = params

  if (!fullName || !school || !teacher) {
    return { error: "All fields are required", success: false }
  }

  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase
      .from("users")
      .update({
        full_name: fullName,
        school,
        teacher,
        profile_image_url: profileImageUrl,
      })
      .eq("id", userId)

    if (error) {
      console.error("Error updating profile:", error)
      return { error: "Failed to update profile", success: false }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in updateProfile:", error)
    return { error: "Failed to update profile", success: false }
  }
}

export async function changePassword(prevState: any, formData: FormData) {
  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All fields are required" }
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match" }
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

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    console.error("Error changing password:", error)
    return { error: "Failed to change password" }
  }

  return { success: "Password changed successfully" }
}

export async function saveVideo(videoData: {
  title: string
  description?: string
  videoUrl: string
  thumbnailUrl?: string
  performerId: string
}) {
  const { title, description, videoUrl, thumbnailUrl, performerId } = videoData

  if (!title || !videoUrl || !performerId) {
    return { error: "Title, video URL, and performer are required" }
  }

  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase.from("videos").insert({
      title,
      description,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      performer_id: performerId,
    })

    if (error) {
      console.error("Error saving video:", error)
      return { error: "Failed to save video" }
    }

    return { success: "Video saved successfully" }
  } catch (error) {
    console.error("Error in saveVideo:", error)
    return { error: "Failed to save video" }
  }
}

export async function addPerformer(prevState: any, formData: FormData) {
  const name = formData.get("name") as string
  const bio = formData.get("bio") as string

  if (!name) {
    return { error: "Name is required" }
  }

  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase.from("performers").insert({
      name,
      bio,
    })

    if (error) {
      console.error("Error adding performer:", error)
      return { error: "Failed to add performer" }
    }

    return { success: "Performer added successfully" }
  } catch (error) {
    console.error("Error in addPerformer:", error)
    return { error: "Failed to add performer" }
  }
}

export async function updatePerformer(performerId: string, name: string, bio: string) {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase.from("performers").update({ name, bio }).eq("id", performerId)

    if (error) {
      console.error("Error updating performer:", error)
      return { error: "Failed to update performer" }
    }

    return { success: "Performer updated successfully" }
  } catch (error) {
    console.error("Error in updatePerformer:", error)
    return { error: "Failed to update performer" }
  }
}

export async function deletePerformer(performerId: string) {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase.from("performers").delete().eq("id", performerId)

    if (error) {
      console.error("Error deleting performer:", error)
      return { error: "Failed to delete performer" }
    }

    return { success: "Performer deleted successfully" }
  } catch (error) {
    console.error("Error in deletePerformer:", error)
    return { error: "Failed to delete performer" }
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
            from: process.env.FROM_EMAIL!,
            to: user.email,
            subject: "New notification from TY Kobudo Library",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #1f2937; padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0;">TY Kobudo Library</h1>
                </div>
                <div style="background: #f9fafb; padding: 30px;">
                  <p style="font-size: 16px; color: #374151;">Hi ${user.full_name},</p>
                  <p style="font-size: 16px; color: #374151;">${message}</p>
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
        from: process.env.FROM_EMAIL!,
        to: recipient.email,
        subject: "New notification from TY Kobudo Library",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1f2937; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">TY Kobudo Library</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px;">
              <p style="font-size: 16px; color: #374151;">Hi ${recipient.full_name},</p>
              <p style="font-size: 16px; color: #374151;">${message}</p>
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

export async function getTelemetryData() {
  try {
    console.log("[v0] Starting getTelemetryData function")
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const now = new Date()
    console.log("[v0] Current date:", now.toISOString())

    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    console.log("[v0] This week range:", startOfWeek.toISOString(), "to", endOfWeek.toISOString())

    const startOfLastWeek = new Date(startOfWeek)
    startOfLastWeek.setDate(startOfWeek.getDate() - 7)

    const endOfLastWeek = new Date(startOfLastWeek)
    endOfLastWeek.setDate(startOfLastWeek.getDate() + 6)
    endOfLastWeek.setHours(23, 59, 59, 999)

    console.log("[v0] Last week range:", startOfLastWeek.toISOString(), "to", endOfLastWeek.toISOString())

    const [
      allVideosResult,
      totalUsersResult,
      pendingUsersResult,
      totalVideosResult,
      totalCategoriesResult,
      thisWeekVideosResult,
      lastWeekVideosResult,
      thisWeekLoginsResult,
      lastWeekLoginsResult,
    ] = await Promise.all([
      serviceSupabase.from("videos").select("views"),
      serviceSupabase.from("users").select("id", { count: "exact" }),
      serviceSupabase.from("users").select("id", { count: "exact" }).eq("is_approved", false),
      serviceSupabase.from("videos").select("id", { count: "exact" }),
      serviceSupabase.from("categories").select("id", { count: "exact" }),
      serviceSupabase
        .from("videos")
        .select("id")
        .gte("last_viewed::date", startOfWeek.toISOString().split("T")[0])
        .lte("last_viewed::date", endOfWeek.toISOString().split("T")[0]),
      serviceSupabase
        .from("videos")
        .select("id")
        .gte("last_viewed::date", startOfLastWeek.toISOString().split("T")[0])
        .lte("last_viewed::date", endOfLastWeek.toISOString().split("T")[0]),
      serviceSupabase
        .from("user_logins")
        .select("user_id")
        .gte("login_time::date", startOfWeek.toISOString().split("T")[0])
        .lte("login_time::date", endOfWeek.toISOString().split("T")[0]),
      serviceSupabase
        .from("user_logins")
        .select("user_id")
        .gte("login_time::date", startOfLastWeek.toISOString().split("T")[0])
        .lte("login_time::date", endOfLastWeek.toISOString().split("T")[0]),
    ])

    console.log("[v0] All videos query result:", allVideosResult.data?.length, "videos, error:", allVideosResult.error)
    const totalViews = allVideosResult.data?.reduce((sum, video) => sum + (video.views || 0), 0) || 0
    console.log("[v0] Total views calculated:", totalViews)

    console.log(
      "[v0] This week videos query result:",
      thisWeekVideosResult.data?.length,
      "videos, error:",
      thisWeekVideosResult.error,
    )
    const thisWeekViews = thisWeekVideosResult.data?.length || 0

    console.log(
      "[v0] Last week videos query result:",
      lastWeekVideosResult.data?.length,
      "videos, error:",
      lastWeekVideosResult.error,
    )
    const lastWeekViews = lastWeekVideosResult.data?.length || 0

    console.log(
      "[v0] This week logins query result:",
      thisWeekLoginsResult.data?.length,
      "logins, error:",
      thisWeekLoginsResult.error,
    )

    const thisWeekUserLogins = thisWeekLoginsResult.data?.length || 0
    console.log("[v0] Total logins this week:", thisWeekUserLogins)

    console.log(
      "[v0] Last week logins query result:",
      lastWeekLoginsResult.data?.length,
      "logins, error:",
      lastWeekLoginsResult.error,
    )

    const lastWeekUserLogins = lastWeekLoginsResult.data?.length || 0
    console.log("[v0] Total logins last week:", lastWeekUserLogins)

    const result = {
      success: true,
      data: {
        totalUsers: totalUsersResult.count || 0,
        pendingUsers: pendingUsersResult.count || 0,
        totalVideos: totalVideosResult.count || 0,
        totalCategories: totalCategoriesResult.count || 0,
        totalViews,
        thisWeekViews,
        lastWeekViews,
        thisWeekUserLogins,
        lastWeekUserLogins,
      },
    }

    console.log("[v0] Final telemetry result:", result)
    return result
  } catch (error) {
    console.error("[v0] Error getting telemetry data:", error)
    return {
      success: false,
      data: {
        totalUsers: 0,
        pendingUsers: 0,
        totalVideos: 0,
        totalCategories: 0,
        totalViews: 0,
        thisWeekViews: 0,
        lastWeekViews: 0,
        thisWeekUserLogins: 0,
        lastWeekUserLogins: 0,
      },
    }
  }
}

async function sendNotificationEmail(params: {
  recipientEmail: string
  recipientName: string
  senderName: string
  message: string
}) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: params.recipientEmail,
    subject: "New Notification from TY Kobudo Library",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">TY Kobudo Library</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px;">
          <p style="font-size: 16px; color: #374151;">Hi ${params.recipientName},</p>
          <p style="font-size: 16px; color: #374151;">${params.message}</p>
        </div>
      </div>
    `,
  })
}
