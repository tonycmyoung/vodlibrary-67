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
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")
  const fullName = formData.get("fullName")

  if (!email || !password || !fullName) {
    return { error: "Email, password, and full name are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

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

      const { error: profileError } = await serviceSupabase.from("users").insert({
        id: data.user.id,
        email: data.user.email,
        full_name: fullName.toString(),
        is_approved: false,
      })

      if (profileError) {
        console.error("Profile creation error:", profileError)
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

    // Check if current user is admin
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
}) {
  try {
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })

    // Verify current user is authenticated
    const { data: currentUser } = await supabase.auth.getUser()
    if (!currentUser.user || currentUser.user.id !== data.userId) {
      return { error: "Not authorized" }
    }

    // Use service role client to update profile
    const { createClient } = await import("@supabase/supabase-js")
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { error } = await serviceSupabase
      .from("users")
      .update({
        full_name: data.fullName,
        profile_image_url: data.profileImageUrl,
      })
      .eq("id", data.userId)

    if (error) {
      return { error: error.message }
    }

    return { success: "Profile updated successfully" }
  } catch (error) {
    console.error("Profile update error:", error)
    return { error: "An unexpected error occurred" }
  }
}
