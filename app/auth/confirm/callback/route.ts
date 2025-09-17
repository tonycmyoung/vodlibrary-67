import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

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

  // Log confirmation attempt
  try {
    await serviceSupabase.from("auth_debug_logs").insert({
      event_type: "email_confirmation_attempt",
      user_id: null,
      user_email: null,
      success: false, // Will be updated to true on success
      error_message: error || null,
      error_code: null,
      additional_data: {
        has_code: !!code,
        error_description: errorDescription,
        timestamp: new Date().toISOString(),
        full_url: request.url,
      },
    })
  } catch (logError) {
    console.error("Failed to log confirmation attempt:", logError)
  }

  // Handle errors from Supabase
  if (error) {
    const errorParam = error === "access_denied" && errorDescription?.includes("expired") ? "expired" : "invalid"
    return NextResponse.redirect(new URL(`/auth/confirm?error=${errorParam}`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/auth/confirm?error=missing_params", request.url))
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // This will be handled by the response
          },
        },
      },
    )

    // Try to get current session (Supabase might have set it during redirect)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    let user = session?.user

    // If no session, try to find recently confirmed users
    if (!user) {
      const { data: recentUsers, error: usersError } = await serviceSupabase.auth.admin.listUsers({
        page: 1,
        perPage: 100,
      })

      if (!usersError && recentUsers?.users) {
        // Find user confirmed in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
        user = recentUsers.users.find((u) => u.email_confirmed_at && new Date(u.email_confirmed_at) > fiveMinutesAgo)
      }
    }

    if (!user) {
      throw new Error("Could not identify confirmed user")
    }

    const { data: userData, error: userError } = await serviceSupabase
      .from("users")
      .select("is_approved")
      .eq("id", user.id)
      .single()

    if (userError) {
      console.error("Error checking user approval status:", userError)
      // Continue anyway - user might not be in users table yet
    }

    // Log successful confirmation
    try {
      await serviceSupabase.from("auth_debug_logs").insert({
        event_type: "email_confirmation_success",
        user_id: user.id,
        user_email: user.email,
        success: true,
        error_message: null,
        error_code: null,
        additional_data: {
          confirmed_at: new Date().toISOString(),
          is_approved: userData?.is_approved || false,
          found_via_session: !!session,
        },
      })
    } catch (logError) {
      console.error("Failed to log confirmation success:", logError)
    }

    const isApproved = userData?.is_approved || false
    const redirectUrl = `/auth/confirm?confirmed=true&approved=${isApproved}`

    return NextResponse.redirect(new URL(redirectUrl, request.url))
  } catch (error) {
    console.error("Confirmation processing error:", error)

    // Log processing error
    try {
      await serviceSupabase.from("auth_debug_logs").insert({
        event_type: "email_confirmation_error",
        user_id: null,
        user_email: null,
        success: false,
        error_message: error instanceof Error ? error.message : "Unknown error",
        error_code: null,
        additional_data: {
          timestamp: new Date().toISOString(),
        },
      })
    } catch (logError) {
      console.error("Failed to log processing error:", logError)
    }

    return NextResponse.redirect(new URL("/auth/confirm?error=processing_failed", request.url))
  }
}
