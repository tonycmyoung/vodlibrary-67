"use server"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { generateUUID, sanitizeHtml, siteTitle } from "../utils/helpers"
import { sendEmail } from "./email"
import { logAuditEvent } from "./audit"

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
      .maybeSingle()

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
      .maybeSingle()

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

    await logAuditEvent({
      actor_id: currentUser.user.id,
      actor_email: currentUser.user.email!,
      action: "user_invitation",
      target_id: null,
      target_email: email.toLowerCase(),
      additional_data: {
        actor_name: inviterUser.full_name,
        invited_email: email.toLowerCase(),
      },
    })

    await sendEmail(
      email,
      `You're invited to join the ${siteTitle}`,
      `You're Invited!`,
      `
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
          ${sanitizeHtml(inviterUser.full_name)} has invited you to join the ${siteTitle}.
        </p>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 30px;">
          This library is invite-only for Matayoshi/Okinawa Kobudo Australia Students.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_FULL_SITE_URL}/auth/sign-up" 
              style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Accept Invitation
          </a>
        </div>
      `,
    )

    return { success: "Invitation sent successfully" }
  } catch (emailError) {
    console.error("Failed to send invitation email:", emailError)
    return { error: "Failed to send invitation email" }
  }
}

export async function approveUserServerAction(userId: string, role = "Student") {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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

    const { data: actorUser } = await serviceSupabase
      .from("users")
      .select("full_name")
      .eq("id", currentUser.user.id)
      .single()

    const { error } = await serviceSupabase
      .from("users")
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: currentUser.user.id,
        role: role,
      })
      .eq("id", userId)

    if (error) {
      console.error("Error approving user:", error)
      return { error: "Failed to approve user" }
    }

    await logAuditEvent({
      actor_id: currentUser.user.id,
      actor_email: currentUser.user.email!,
      action: "user_approval",
      target_id: userId,
      target_email: user.email,
      additional_data: {
        actor_name: actorUser?.full_name || currentUser.user.email!.split("@")[0],
        target_name: user.full_name,
        assigned_role: role,
      },
    })

    await sendEmail(
      user.email,
      `Your ${siteTitle} account has been approved!`,
      `Welcome to the ${siteTitle}!`,
      `
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
             style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Access Library
          </a>
        </div>
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          Happy training!
        </p>
      `,
    )

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
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
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
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
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
      console.error("Error updating pending user fields:", error)
      return { error: "Failed to update pending user fields" }
    }

    revalidatePath("/admin")
    return { success: "Pending user fields updated successfully" }
  } catch (error) {
    console.error("Error in updatePendingUserFields:", error)
    return { error: "Failed to update pending user fields" }
  }
}

export async function updateUserFields(
  userId: string,
  fullName: string,
  teacher: string,
  school: string,
  currentBeltId?: string | null,
) {
  try {
    const cookieStore = await cookies()
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
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

    const updateData: any = {
      full_name: fullName.trim(),
      teacher: teacher.trim(),
      school: school.trim(),
    }

    if (currentBeltId !== undefined) {
      updateData.current_belt_id = currentBeltId
    }

    const { error } = await serviceSupabase.from("users").update(updateData).eq("id", userId)

    if (error) {
      console.error("Error updating user fields:", error)
      return { error: "Failed to update user fields" }
    }

    revalidatePath("/admin/users")
    revalidatePath("/students")
    return { success: "User fields updated successfully" }
  } catch (error) {
    console.error("Error in updateUserFields:", error)
    return { error: "Failed to update user fields" }
  }
}

export async function deleteUserCompletely(userId: string) {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: userToDelete } = await serviceSupabase
      .from("users")
      .select("email, full_name")
      .eq("id", userId)
      .single()

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
            } catch {}
          },
        },
      },
    )

    const { data: currentUser } = await supabase.auth.getUser()

    let actorName = currentUser.user?.email?.split("@")[0] || "Unknown"
    if (currentUser.user) {
      const { data: actorUser } = await serviceSupabase
        .from("users")
        .select("full_name")
        .eq("id", currentUser.user.id)
        .single()

      if (actorUser) {
        actorName = actorUser.full_name
      }
    }

    const { error: publicError } = await serviceSupabase.from("users").delete().eq("id", userId)

    if (publicError) {
      console.error("Error deleting user from public.users:", publicError)
      return { error: "Failed to delete user profile" }
    }

    const { error: authError } = await serviceSupabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.error("Error deleting user from auth (user may not exist in auth):", authError)
    }

    if (currentUser.user && userToDelete) {
      await logAuditEvent({
        actor_id: currentUser.user.id,
        actor_email: currentUser.user.email!,
        action: "user_deletion",
        target_id: userId,
        target_email: userToDelete.email,
        additional_data: {
          actor_name: actorName,
          target_name: userToDelete.full_name,
        },
      })
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
  profileImageUrl: string | null
}) {
  const { userId, fullName, profileImageUrl } = params

  if (!fullName) {
    return { error: "Name is required", success: false }
  }

  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase
      .from("users")
      .update({
        full_name: fullName,
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

export async function updateUserBelt(userId: string, beltId: string | null) {
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
            } catch {}
          },
        },
      },
    )

    const { data: currentUser } = await supabase.auth.getUser()
    if (!currentUser.user) {
      return { error: "Not authenticated", success: false }
    }

    // Check permissions
    const { data: userProfile } = await supabase
      .from("users")
      .select("role, school")
      .eq("id", currentUser.user.id)
      .single()

    const { data: targetUser } = await supabase.from("users").select("school").eq("id", userId).single()

    const isAdmin = userProfile?.role === "Admin"
    const isTeacher = userProfile?.role === "Teacher" || userProfile?.role === "Head Teacher"
    const isSameSchool = userProfile?.school === targetUser?.school
    const isOwnProfile = currentUser.user.id === userId

    if (!isOwnProfile && !isAdmin && !(isTeacher && isSameSchool)) {
      return { error: "Unauthorized to update this user's belt", success: false }
    }

    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase.from("users").update({ current_belt_id: beltId }).eq("id", userId)

    if (error) {
      console.error("Error updating user belt:", error)
      return { error: "Failed to update belt", success: false }
    }

    revalidatePath("/profile")
    revalidatePath("/admin/users")
    revalidatePath("/students")

    return { success: true }
  } catch (error) {
    console.error("Error in updateUserBelt:", error)
    return { error: "Failed to update belt", success: false }
  }
}

export async function fetchPendingUsers() {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data, error } = await serviceSupabase
      .from("users")
      .select(`
        *,
        inviter:invited_by(full_name)
      `)
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
    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
    })

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

export async function fetchStudentsForHeadTeacher(headTeacherSchool: string, headTeacherId: string) {
  try {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: usersData, error: usersError } = await serviceSupabase
      .from("users")
      .select(`
        id, email, full_name, teacher, school, role, created_at, is_approved, approved_at, profile_image_url, current_belt_id,
        inviter:invited_by(full_name),
        current_belt:curriculums!current_belt_id(id, name, color, display_order)
      `)
      .eq("is_approved", true)
      .ilike("school", `${headTeacherSchool}%`)
      .neq("id", headTeacherId)
      .order("full_name", { ascending: true })

    if (usersError) throw usersError

    // Fetch login stats
    const { data: loginStats, error: loginError } = await serviceSupabase
      .from("user_logins")
      .select("user_id, login_time")
      .order("login_time", { ascending: false })

    if (loginError) throw loginError

    // Fetch view stats
    const { data: viewStats, error: viewError } = await serviceSupabase
      .from("user_video_views")
      .select("user_id, viewed_at")
      .order("viewed_at", { ascending: false })

    if (viewError) throw viewError

    // Combine data with stats
    const usersWithStats =
      usersData?.map((user) => {
        const userLogins = loginStats?.filter((login) => login.user_id === user.id) || []
        const lastLogin = userLogins.length > 0 ? userLogins[0].login_time : null
        const loginCount = userLogins.length

        const userViews = viewStats?.filter((view) => view.user_id === user.id) || []
        const lastView = userViews.length > 0 ? userViews[0].viewed_at : null
        const viewCount = userViews.length

        return {
          ...user,
          last_login: lastLogin,
          login_count: loginCount,
          last_view: lastView,
          view_count: viewCount,
        }
      }) || []

    return { data: usersWithStats, error: null }
  } catch (error) {
    console.error("Error in fetchStudentsForHeadTeacher:", error)
    return { error: "Failed to fetch students", data: [] }
  }
}

export async function adminResetUserPassword(userId: string, newPassword: string) {
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
            } catch {}
          },
        },
      },
    )

    // Verify the current user is an admin
    const { data: currentUser } = await supabase.auth.getUser()
    if (!currentUser.user) {
      return { error: "Not authenticated" }
    }

    const { data: adminProfile } = await supabase
      .from("users")
      .select("role, full_name")
      .eq("id", currentUser.user.id)
      .single()

    if (adminProfile?.role !== "Admin") {
      return { error: "Unauthorized - Admin access required" }
    }

    // Validate password
    if (!newPassword || newPassword.length < 8) {
      return { error: "Password must be at least 8 characters long" }
    }

    // Get target user details
    const { data: targetUser } = await supabase.from("users").select("email, full_name").eq("id", userId).single()

    if (!targetUser) {
      return { error: "User not found" }
    }

    // Use service role to update password
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (updateError) {
      console.error("Error updating password:", updateError)
      return { error: "Failed to update password" }
    }

    // Log audit event
    await logAuditEvent({
      actor_id: currentUser.user.id,
      actor_email: currentUser.user.email!,
      action: "password_reset",
      target_id: userId,
      target_email: targetUser.email,
      additional_data: {
        actor_name: adminProfile.full_name,
        target_name: targetUser.full_name,
      },
    })

    return { success: "Password reset successfully" }
  } catch (error) {
    console.error("Error in adminResetUserPassword:", error)
    return { error: "Failed to reset password" }
  }
}
