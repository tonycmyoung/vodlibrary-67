"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Resend } from "resend"

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

    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
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
      const { createClient } = await import("@supabase/supabase-js")
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
      const { createClient } = await import("@supabase/supabase-js")
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

    const { createClient } = await import("@supabase/supabase-js")
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
    const { createClient } = await import("@supabase/supabase-js")
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
    const { createClient } = await import("@supabase/supabase-js")
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

    const { createClient } = await import("@supabase/supabase-js")
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
