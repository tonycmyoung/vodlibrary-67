"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

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
  const supabase = createServerActionClient({ cookies: () => cookieStore })

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
  console.log("[v0] SignUp process started")

  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")
  const fullName = formData.get("fullName")
  const teacher = formData.get("teacher")
  const school = formData.get("school")

  console.log("[v0] SignUp form data:", { email, fullName, teacher, school })

  if (!email || !password || !fullName || !teacher || !school) {
    return { error: "All fields are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    console.log("[v0] Creating Supabase auth user")
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
      console.log("[v0] Supabase auth error:", error)
      return { error: error.message }
    }

    console.log("[v0] Supabase auth user created:", data.user?.id)

    if (data.user) {
      console.log("[v0] Creating user profile in database")
      const { createClient } = await import("@supabase/supabase-js")
      const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const profileData = {
        id: data.user.id,
        email: data.user.email,
        full_name: fullName.toString(),
        teacher: teacher.toString(),
        school: school.toString(),
        is_approved: false,
      }

      console.log("[v0] Profile data to insert:", profileData)

      const { error: profileError } = await serviceSupabase.from("users").insert(profileData)

      if (profileError) {
        console.error("[v0] Profile creation error:", profileError)
        return { error: "Failed to create user profile. Please try again." }
      }

      console.log("[v0] User profile created successfully")
    }

    console.log("[v0] SignUp process completed successfully")
    return {
      success: "Check your email to confirm your account, then you can sign in.",
    }
  } catch (error) {
    console.error("[v0] Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signOut() {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error("Sign out error:", error.message)
  }

  redirect("/auth/login")
}

export async function approveUser(userId: string) {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

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

    if (!adminCheck?.is_approved || adminCheck.email !== "admin@martialarts.com") {
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
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const { data, error } = await supabase.auth.signUp({
      email: "admin@martialarts.com",
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

    return { success: "Admin user created! You can now sign in with admin@martialarts.com / admin123" }
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
    const supabase = createServerActionClient({ cookies: () => cookieStore })

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
    const supabase = createServerActionClient({ cookies: () => cookieStore })

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

    if (!adminCheck?.is_approved || adminCheck.email !== "admin@martialarts.com") {
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
