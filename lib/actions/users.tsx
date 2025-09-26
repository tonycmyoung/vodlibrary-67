"use server"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { revalidatePath } from "next/cache"
import { generateUUID, sanitizeHtml, siteTitle } from "../utils/helpers"

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
      from: `OKL Admin <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: `You're invited to join the ${siteTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              ${sanitizeHtml(inviterUser.full_name)} has invited you to join the ${siteTitle}.
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

export async function approveUserServerAction(userId: string, role = "Student") {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    })

    const { data: currentUser } = await supabase.auth.getUser()
    if (!currentUser.user) {
      return { error: "Not authenticated" }
    }

    const serviceSupabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Ignore
          }
        },
      },
    })

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
        role: role, // Set the selected role during approval
      })
      .eq("id", userId)

    if (error) {
      console.error("Error approving user:", error)
      return { error: "Failed to approve user" }
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: `OKL Admin <${process.env.FROM_EMAIL}>`,
      to: user.email,
      subject: `Your ${siteTitle} account has been approved!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to the ${siteTitle}!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Hi ${sanitizeHtml(user.full_name)},
            </p>
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Great news! Your account has been approved and you now have access to the ${siteTitle}.
            </p>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 30px;">
              You can now access our complete collection of instructional videos, techniques, and resources for Matayoshi/Okinawa Kobudo training.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_FULL_SITE_URL}" 
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

    revalidatePath("/admin")
    return { success: "User approved successfully" }
  } catch (error) {
    console.error("Error in approveUser:", error)
    return { error: "Failed to approve user" }
  }
}

export async function rejectUserServerAction(userId: string) {
  try {
    const cookieStore = await cookies()
    const serviceSupabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Ignore
          }
        },
      },
    })

    // First delete from public.users table
    const { error: publicError } = await serviceSupabase.from("users").delete().eq("id", userId)

    if (publicError) {
      console.error("Error deleting from public.users:", publicError)
      return { error: "Failed to reject user" }
    }

    // Then delete from auth.users table using admin API
    const { error: authError } = await serviceSupabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.error("Error deleting from auth.users:", authError)
      return { error: "Failed to completely remove user" }
    }

    revalidatePath("/admin")
    return { success: "User rejected successfully" }
  } catch (error) {
    console.error("Error in rejectUser:", error)
    return { error: "Failed to reject user" }
  }
}

export async function updatePendingUserFields(userId: string, fullName: string, teacher: string, school: string) {
  try {
    const cookieStore = await cookies()
    const serviceSupabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Ignore
          }
        },
      },
    })

    const { error } = await serviceSupabase
      .from("users")
      .update({
        full_name: fullName.trim(),
        teacher: teacher.trim(),
        school: school.trim(),
      })
      .eq("id", userId)

    if (error) {
      console.error("Error updating user fields:", error)
      return { error: "Failed to update user fields" }
    }

    revalidatePath("/admin")
    return { success: "User fields updated successfully" }
  } catch (error) {
    console.error("Error in updatePendingUserFields:", error)
    return { error: "Failed to update user fields" }
  }
}

export async function updateUserFields(userId: string, fullName: string, teacher: string, school: string) {
  try {
    const cookieStore = await cookies()
    const serviceSupabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Ignore
          }
        },
      },
    })

    const { error } = await serviceSupabase
      .from("users")
      .update({
        full_name: fullName.trim(),
        teacher: teacher.trim(),
        school: school.trim(),
      })
      .eq("id", userId)

    if (error) {
      console.error("Error updating user fields:", error)
      return { error: "Failed to update user fields" }
    }

    revalidatePath("/admin/users")
    return { success: "User fields updated successfully" }
  } catch (error) {
    console.error("Error in updateUserFields:", error)
    return { error: "Failed to update user fields" }
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

export async function fetchUnconfirmedEmailUsers() {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // First get unconfirmed users from auth.users
    const { data: authUsers, error: authError } = await serviceSupabase.auth.admin.listUsers()

    if (authError) {
      console.error("Error fetching auth users:", authError)
      return { error: "Failed to fetch unconfirmed email users", data: [] }
    }

    // Filter for users with null email_confirmed_at
    const unconfirmedAuthUsers = authUsers.users.filter((user) => !user.email_confirmed_at)

    if (unconfirmedAuthUsers.length === 0) {
      return { data: [], error: null }
    }

    // Get the corresponding profile data from public.users
    const userIds = unconfirmedAuthUsers.map((user) => user.id)
    const { data: profileData, error: profileError } = await serviceSupabase
      .from("users")
      .select(`
        id,
        full_name,
        teacher,
        school,
        created_at
      `)
      .in("id", userIds)

    if (profileError) {
      console.error("Error fetching profile data:", profileError)
      return { error: "Failed to fetch user profiles", data: [] }
    }

    const combinedData = unconfirmedAuthUsers.map((authUser) => {
      const profile = profileData?.find((p) => p.id === authUser.id)
      return {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || "Unknown",
        teacher: profile?.teacher || "Unknown",
        school: profile?.school || "Unknown",
        created_at: authUser.created_at,
        confirmation_sent_at: authUser.confirmation_sent_at, // Add confirmation timestamp
      }
    })

    return { data: combinedData, error: null }
  } catch (error) {
    console.error("Error in fetchUnconfirmedEmailUsers:", error)
    return { error: "Failed to fetch unconfirmed email users", data: [] }
  }
}

export async function resendConfirmationEmail(email: string) {
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

    // Check if user is authenticated and is admin
    const { data: currentUser } = await supabase.auth.getUser()
    if (!currentUser.user) {
      return { error: "Not authenticated" }
    }

    const { data: userProfile } = await supabase.from("users").select("role").eq("id", currentUser.user.id).single()

    if (!userProfile || userProfile.role !== "Admin") {
      return { error: "Unauthorized - Admin access required" }
    }

    // Use admin client to resend confirmation email
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase.auth.resend({
      type: "signup",
      email: email,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm/callback`,
      },
    })

    if (error) {
      console.error("Error resending confirmation email:", error)
      return { error: "Failed to resend confirmation email" }
    }

    return { success: "Confirmation email sent successfully" }
  } catch (error) {
    console.error("Error in resendConfirmationEmail:", error)
    return { error: "Failed to resend confirmation email" }
  }
}
