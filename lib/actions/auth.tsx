"use server"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { sanitizeHtml, siteTitle } from "../utils/helpers"
import { validateReturnTo } from "../utils/auth"
import { sendEmail } from "./email"

type SignInResult = {
  success: boolean
  redirectTo?: string
  error?: string
}

export async function signIn(formData: FormData) {
  console.log("[v0] Auth Action: signIn called")

  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const returnTo = formData.get("returnTo") as string | null

  console.log("[v0] Auth Action: Email:", email)
  console.log("[v0] Auth Action: returnTo from form:", returnTo)

  if (!email || !password) {
    console.log("[v0] Auth Action: Missing email or password")
    const errorUrl = `/auth/login?error=auth_error${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`
    console.log("[v0] Auth Action: Redirecting to:", errorUrl)
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

  try {
    await serviceSupabase.from("auth_debug_logs").insert({
      event_type: "login_attempt",
      user_email: email,
      user_id: data?.user?.id || null,
      success: !error,
      error_message: error?.message || null,
      error_code: error?.code || null,
      additional_data: {
        email_confirmed: data?.user?.email_confirmed_at ? true : false,
        user_exists: data?.user ? true : false,
        returnTo: returnTo || null,
      },
    })
  } catch (logError) {
    console.error("[v0] Auth Action: Failed to log auth attempt:", logError)
  }

  if (error) {
    console.log("[v0] Auth Action: Authentication failed:", error.message)

    let errorCode = "auth_error"
    if (error.message.includes("Email not confirmed")) {
      errorCode = "email_not_confirmed"
    } else if (error.message.includes("Invalid login credentials")) {
      errorCode = "invalid_credentials"
    }

    const errorUrl = `/auth/login?error=${errorCode}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`
    console.log("[v0] Auth Action: Redirecting to:", errorUrl)
    redirect(errorUrl)
  }

  console.log("[v0] Auth Action: Authentication successful for user:", data.user?.id)

  if (data.user?.id) {
    try {
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

        console.log("[v0] Auth Action: Login tracking successful")
      } else {
        console.log("[v0] Auth Action: Login already tracked for today")
      }
    } catch (trackingError) {
      console.log("[v0] Auth Action: Login tracking failed:", trackingError)
      // Don't fail signin if tracking fails
    }
  }

  const validatedReturnTo = validateReturnTo(returnTo)
  console.log("[v0] Auth Action: Validated returnTo:", validatedReturnTo)

  const finalRedirect = validatedReturnTo || "/"
  console.log("[v0] Auth Action: Setting redirect cookie to:", finalRedirect)

  cookieStore.set("auth_redirect", finalRedirect, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60, // 1 minute - short lived
  })

  revalidatePath("/auth/login")

  console.log("[v0] Auth Action: Cookie set and path revalidated")
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
    console.error("[v0] Failed to log signup attempt:", logError)
  }

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    console.log("[v0] Checking for invitation for email:", email.toLowerCase())
    const { data: invitationData, error: invitationError } = await serviceSupabase
      .from("invitations")
      .select("invited_by")
      .eq("email", email.toLowerCase())
      .maybeSingle()

    if (invitationError && invitationError.code !== "PGRST116") {
      console.error("[v0] Error fetching invitation:", invitationError)
    }

    const invitedBy = invitationData?.invited_by || null
    console.log("[v0] Invitation found, invited_by:", invitedBy)

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
          `
        )

      }
    } catch (emailError) {
      console.error("Failed to send admin notification email:", emailError)
    }
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
