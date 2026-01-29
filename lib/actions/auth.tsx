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

// Helper function to create a service client (reduces repeated code)
function getServiceClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Helper function to log auth events (reduces cognitive complexity from try/catch nesting)
async function logAuthEvent(
  eventType: string,
  userEmail: string,
  userId: string | null,
  success: boolean,
  errorMessage: string | null,
  errorCode: string | null = null,
  additionalData: Record<string, unknown> = {},
) {
  try {
    const serviceSupabase = getServiceClient()
    await serviceSupabase.from("auth_debug_logs").insert({
      event_type: eventType,
      user_email: userEmail,
      user_id: userId,
      success,
      error_message: errorMessage,
      error_code: errorCode,
      additional_data: additionalData,
    })
  } catch (logError) {
    console.error(`Failed to log ${eventType}:`, logError)
  }
}

// Helper to validate signup form fields
function validateSignupFields(
  email: string,
  password: string,
  fullName: string,
  school: string,
  teacher: string,
  eulaAccepted: boolean,
  privacyAccepted: boolean,
): string | null {
  if (!email || !password || !fullName || !school || !teacher) {
    return "All fields are required"
  }
  if (!eulaAccepted || !privacyAccepted) {
    return "You must accept both the EULA and Privacy Policy to create an account"
  }
  return null
}

// Helper to validate password reset fields
function validatePasswordFields(password: string, confirmPassword: string): string | null {
  if (!password || !confirmPassword) {
    return "Both password fields are required"
  }
  if (password !== confirmPassword) {
    return "Passwords do not match"
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters long"
  }
  return null
}

// Helper to get validation error type for logging
function getPasswordValidationErrorType(password: string, confirmPassword: string): string {
  if (!password || !confirmPassword) {
    return "missing_fields"
  }
  if (password !== confirmPassword) {
    return "password_mismatch"
  }
  return "password_too_short"
}

// Helper to create user profile after signup
async function createUserProfile(
  userId: string,
  email: string,
  fullName: string,
  school: string,
  teacher: string,
  invitedBy: string | null,
): Promise<{ error: string | null }> {
  const serviceSupabase = getServiceClient()
  const { error: profileError } = await serviceSupabase.from("users").insert({
    id: userId,
    email,
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
  return { error: null }
}

// Helper to store user consent
async function storeUserConsent(
  userId: string,
  eulaAccepted: boolean,
  privacyAccepted: boolean,
): Promise<{ error: string | null }> {
  const serviceSupabase = getServiceClient()
  const now = new Date().toISOString()
  const { error: consentError } = await serviceSupabase.from("user_consents").insert({
    user_id: userId,
    eula_accepted_at: eulaAccepted ? now : null,
    privacy_accepted_at: privacyAccepted ? now : null,
  })

  if (consentError) {
    console.error("Error storing user consent:", consentError)
    return { error: "Failed to store legal consent" }
  }
  return { error: null }
}

// Helper to get invitation info
async function getInvitationInfo(email: string): Promise<string | null> {
  const serviceSupabase = getServiceClient()
  const { data: invitationData, error: invitationError } = await serviceSupabase
    .from("invitations")
    .select("invited_by")
    .eq("email", email.toLowerCase())
    .maybeSingle()

  if (invitationError && invitationError.code !== "PGRST116") {
    console.error("Error fetching invitation:", invitationError)
  }

  return invitationData?.invited_by || null
}

// Helper to delete invitation after signup
async function deleteInvitation(email: string) {
  const serviceSupabase = getServiceClient()
  const { error: deleteError } = await serviceSupabase
    .from("invitations")
    .delete()
    .eq("email", email.toLowerCase())
    .select()

  if (deleteError) {
    console.error("Error deleting invitation record:", deleteError)
  }
}

// Helper to send admin notification email
async function sendAdminNotification(
  fullName: string,
  email: string,
  school: string,
  teacher: string,
  invitedBy: string | null,
) {
  const serviceSupabase = getServiceClient()

  try {
    const { data: adminUser } = await serviceSupabase
      .from("users")
      .select("id, email, full_name")
      .eq("role", "Admin")
      .single()

    if (!adminUser) return

    let inviterInfo = "<strong>Invited by:</strong> Direct signup<br>"
    if (invitedBy) {
      const { data: inviterData } = await serviceSupabase.from("users").select("full_name").eq("id", invitedBy).single()

      if (inviterData) {
        inviterInfo = `<strong>Invited by:</strong> ${sanitizeHtml(inviterData.full_name)}<br>`
      }
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
  } catch (emailError) {
    console.error("Failed to send admin notification email:", emailError)
  }
}

// Helper to determine login error code
function getLoginErrorCode(errorMessage: string): string {
  if (errorMessage.includes("Email not confirmed")) {
    return "email_not_confirmed"
  }
  if (errorMessage.includes("Invalid login credentials")) {
    return "invalid_credentials"
  }
  return "auth_error"
}

// Helper to track daily login
async function trackDailyLogin(userId: string) {
  const serviceSupabase = getServiceClient()
  const today = new Date().toISOString().split("T")[0]

  const { data: existingLogin, error: checkError } = await serviceSupabase
    .from("user_logins")
    .select("id")
    .eq("user_id", userId)
    .gte("login_time", today)
    .maybeSingle()

  if (checkError && checkError.code !== "PGRST116") {
    throw checkError
  }

  if (!existingLogin) {
    const { error: insertError } = await serviceSupabase.from("user_logins").insert({
      user_id: userId,
      login_time: new Date().toISOString(),
    })

    if (insertError) {
      throw insertError
    }
  }
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const returnTo = formData.get("returnTo") as string | null

  if (!email || !password) {
    const returnToParam = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""
    redirect(`/auth/login?error=auth_error${returnToParam}`)
  }

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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // Build additional data for logging
  const additionalData: Record<string, unknown> = {
    email_confirmed: !!data?.user?.email_confirmed_at,
    user_exists: !!data?.user,
    returnTo: returnTo || null,
  }

  // If authentication failed, check if email exists to determine specific reason
  if (error) {
    const serviceSupabase = getServiceClient()
    const { data: userCheck } = await serviceSupabase.from("users").select("id").eq("email", email).maybeSingle()
    additionalData.failure_reason = userCheck ? "Password incorrect" : "Email not registered"
  }

  // Log login attempt using helper
  await logAuthEvent(
    "login_attempt",
    email,
    data?.user?.id || null,
    !error,
    error?.message || null,
    error?.code || null,
    additionalData,
  )

  if (error) {
    const errorCode = getLoginErrorCode(error.message)
    const returnToParam = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""
    redirect(`/auth/login?error=${errorCode}${returnToParam}`)
  }

  // Track daily login (non-critical, errors are logged but don't fail signin)
  if (data.user?.id) {
    try {
      await trackDailyLogin(data.user.id)
    } catch (trackingError) {
      console.error("Login tracking failed (non-critical):", trackingError)
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

  // Validate fields using helper (reduces nested conditionals)
  const validationError = validateSignupFields(email, password, fullName, school, teacher, eulaAccepted, privacyAccepted)
  if (validationError) {
    return { error: validationError }
  }

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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo:
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
        `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm/callback`,
    },
  })

  // Log signup attempt using helper
  await logAuthEvent("signup", email, data?.user?.id || null, !error, error?.message || null, error?.code || null, {
    full_name: fullName,
    school,
    teacher,
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    redirect("/pending-approval?from=signup")
  }

  // Get invitation info
  const invitedBy = await getInvitationInfo(email)

  // Create user profile
  const profileResult = await createUserProfile(data.user.id, data.user.email!, fullName, school, teacher, invitedBy)
  if (profileResult.error) {
    return { error: profileResult.error }
  }

  // Store consent
  const consentResult = await storeUserConsent(data.user.id, eulaAccepted, privacyAccepted)
  if (consentResult.error) {
    return { error: consentResult.error }
  }

  // Clean up invitation record
  await deleteInvitation(email)

  // Send admin notification
  await sendAdminNotification(fullName, email, school, teacher, invitedBy)

  // Log audit event
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

  redirect("/pending-approval?from=signup")
}

export async function createAdminUser(prevState: any, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const fullName = formData.get("fullName") as string

  if (!email || !password || !fullName) {
    return { error: "All fields are required" }
  }

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
  const cookieStore = await cookies()
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

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userEmail = user?.email || "unknown"
  const userId = user?.id || null

  // Validate password fields using helper (reduces nested conditionals)
  const validationError = validatePasswordFields(password, confirmPassword)
  if (validationError) {
    const validationErrorType = getPasswordValidationErrorType(password, confirmPassword)
    const additionalData: Record<string, unknown> = { validation_error: validationErrorType }
    if (validationErrorType === "password_too_short") {
      additionalData.password_length = password.length
    }
    await logAuthEvent("password_reset", userEmail, userId, false, validationError, null, additionalData)
    return { error: validationError }
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  // Log password reset attempt using helper
  await logAuthEvent("password_reset", userEmail, userId, !error, error?.message || null, error?.code || null, {
    reset_method: "email_link",
  })

  if (error) {
    return { error: error.message }
  }

  redirect("/auth/login?reset=success")
}
