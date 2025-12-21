"use server"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { sanitizeHtml } from "../utils/helpers"
import { validateReturnTo } from "../utils/auth"
import { sendEmail } from "./email"
import { logAuditEvent } from "./audit"

type SignInResult = {
  success: boolean
  redirectTo?: string
  error?: string
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const returnTo = formData.get("returnTo") as string | null

  if (!email || !password) {
    const returnToParam = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""
    const errorUrl = `/auth/login?error=auth_error${returnToParam}`
    redirect(errorUrl)
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

  const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const additionalData: any = {
    email_confirmed: data?.user?.email_confirmed_at ? true : false,
    user_exists: data?.user ? true : false,
    returnTo: returnTo || null,
  }

  // If authentication failed, check if email exists in users table to determine specific reason
  if (error) {
    const { data: userCheck } = await serviceSupabase.from("users").select("id").eq("email", email).maybeSingle()

    additionalData.failure_reason = userCheck ? "Password incorrect" : "Email not registered"
  }

  try {
    await serviceSupabase.from("auth_debug_logs").insert({
      event_type: "login_attempt",
      user_email: email,
      user_id: data?.user?.id || null,
      success: !error,
      error_message: error?.message || null,
      error_code: error?.code || null,
      additional_data: additionalData,
    })
  } catch (logError) {
    console.error("Failed to log auth attempt:", logError)
  }

  if (error) {
    let errorCode = "auth_error"
    if (error.message.includes("Email not confirmed")) {
      errorCode = "email_not_confirmed"
    } else if (error.message.includes("Invalid login credentials")) {
      errorCode = "invalid_credentials"
    }

    const returnToParam = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""
    const errorUrl = `/auth/login?error=${errorCode}${returnToParam}`
    redirect(errorUrl)
  }

  if (data.user?.id) {
    try {
      const today = new Date().toISOString().split("T")[0]

      const { data: existingLogin, error: checkError } = await serviceSupabase
        .from("user_logins")
        .select("id")
        .eq("user_id", data.user.id)
        .gte("login_time", today)
        .maybeSingle()

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
      }
    } catch (trackingError) {
      // Don't fail signin if tracking fails
    }
  }

  const validatedReturnTo = validateReturnTo(returnTo)

  const finalRedirect = validatedReturnTo || "/"

  cookieStore.set("auth_redirect", finalRedirect, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60, // 1 minute - short lived
  })

  revalidatePath("/auth/login")
}

export async function signUp(prevState: any, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const fullName = formData.get("fullName") as string
  const school = formData.get("school") as string
  const teacher = formData.get("teacher") as string
  const eulaAccepted = formData.get("eulaAccepted") === "true" || formData.get("eulaAccepted") === "on"
  const privacyAccepted = formData.get("privacyAccepted") === "true" || formData.get("privacyAccepted") === "on"

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
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
        `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm/callback`,
    },
  })

  const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  try {
    await serviceSupabase.from("auth_debug_logs").insert({
      event_type: "signup",
      user_email: email,
      user_id: data?.user?.id || null,
      success: !error,
      error_message: error?.message || null,
      error_code: error?.code || null,
      additional_data: {
        full_name: fullName,
        school,
        teacher,
      },
    })
  } catch (logError) {
    console.error("Failed to log signup attempt:", logError)
  }

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: invitationData, error: invitationError } = await serviceSupabase
      .from("invitations")
      .select("invited_by")
      .eq("email", email.toLowerCase())
      .maybeSingle()

    if (invitationError && invitationError.code !== "PGRST116") {
      console.error("Error fetching invitation:", invitationError)
    }

    const invitedBy = invitationData?.invited_by || null

    const { error: profileError } = await serviceSupabase.from("users").insert({
      id: data.user.id,
      email: data.user.email,
      full_name: fullName,
      school,
      teacher,
      is_approved: false,
      invited_by: invitedBy,
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

    const { data: deletedInvitations, error: deleteError } = await serviceSupabase
      .from("invitations")
      .delete()
      .eq("email", email.toLowerCase())
      .select()

    if (deleteError) {
      console.error("Error deleting invitation record:", deleteError)
    }

    try {
      const { data: adminUser } = await serviceSupabase
        .from("users")
        .select("id, email, full_name")
        .eq("role", "Admin")
        .single()

      if (adminUser) {
        let inviterInfo = ""
        if (invitedBy) {
          const { data: inviterData } = await serviceSupabase
            .from("users")
            .select("full_name")
            .eq("id", invitedBy)
            .single()

          if (inviterData) {
            inviterInfo = `<strong>Invited by:</strong> ${sanitizeHtml(inviterData.full_name)}<br>`
          }
        } else {
          inviterInfo = `<strong>Invited by:</strong> Direct signup<br>`
        }

        await sendEmail(
          adminUser.email,
          `New User to Approve`,
          `New user registration`,
          `
            <p style="font-size: 16px; color: #374151; margin-bottom: 12px;">
              <strong>Name:</strong> ${sanitizeHtml(fullName)}<br>
              <strong>Email:</strong> ${sanitizeHtml(email)}<br>
              <strong>School:</strong> ${sanitizeHtml(school)}<br>
              <strong>Teacher:</strong> ${sanitizeHtml(teacher)}<br>
              ${inviterInfo}
            </p>
            <p style="font-size: 14px; color: #6b7280;">
              Please review and approve this user in the admin dashboard.
            </p>
          `,
        )
      }
    } catch (emailError) {
      console.error("Failed to send admin notification email:", emailError)
    }

    await logAuditEvent({
      actor_id: data.user.id,
      actor_email: data.user.email!,
      action: "user_signup",
      additional_data: {
        actor_name: fullName,
        full_name: fullName,
        school,
        teacher,
        invited_by: invitedBy,
      },
    })
  }

  redirect("/pending-approval?from=signup")
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

export async function signOutServerAction() {
  const cookieStore = cookies()
  const authCookieNames = ["sb-access-token", "sb-refresh-token", "supabase-auth-token"]

  authCookieNames.forEach((name) => {
    cookieStore.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0), // Expire immediately
    })
  })

  return { success: true }
}

export async function updatePassword(prevState: any, formData: FormData) {
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

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

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userEmail = user?.email || "unknown"
  const userId = user?.id || null

  if (!password || !confirmPassword) {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    try {
      await serviceSupabase.from("auth_debug_logs").insert({
        event_type: "password_reset",
        user_email: userEmail,
        user_id: userId,
        success: false,
        error_message: "Both password fields are required",
        additional_data: {
          validation_error: "missing_fields",
        },
      })
    } catch (logError) {
      console.error("Failed to log password reset validation error:", logError)
    }
    return { error: "Both password fields are required" }
  }

  if (password !== confirmPassword) {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    try {
      await serviceSupabase.from("auth_debug_logs").insert({
        event_type: "password_reset",
        user_email: userEmail,
        user_id: userId,
        success: false,
        error_message: "Passwords do not match",
        additional_data: {
          validation_error: "password_mismatch",
        },
      })
    } catch (logError) {
      console.error("Failed to log password reset mismatch error:", logError)
    }
    return { error: "Passwords do not match" }
  }

  if (password.length < 8) {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    try {
      await serviceSupabase.from("auth_debug_logs").insert({
        event_type: "password_reset",
        user_email: userEmail,
        user_id: userId,
        success: false,
        error_message: "Password must be at least 8 characters long",
        additional_data: {
          validation_error: "password_too_short",
          password_length: password.length,
        },
      })
    } catch (logError) {
      console.error("Failed to log password reset length error:", logError)
    }
    return { error: "Password must be at least 8 characters long" }
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try {
    await serviceSupabase.from("auth_debug_logs").insert({
      event_type: "password_reset",
      user_email: userEmail,
      user_id: userId,
      success: !error,
      error_message: error?.message || null,
      error_code: error?.code || null,
      additional_data: {
        reset_method: "email_link",
      },
    })
  } catch (logError) {
    console.error("Failed to log password reset attempt:", logError)
  }

  if (error) {
    return { error: error.message }
  }

  redirect("/auth/login?reset=success")
}
