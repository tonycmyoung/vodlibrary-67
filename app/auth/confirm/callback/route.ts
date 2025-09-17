import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const fragment = requestUrl.hash.substring(1) // Remove the # symbol
  const fragmentParams = new URLSearchParams(fragment)

  // Check for Supabase success/error in fragments
  const accessToken = fragmentParams.get("access_token")
  const refreshToken = fragmentParams.get("refresh_token")
  const error = fragmentParams.get("error") || requestUrl.searchParams.get("error")
  const errorDescription = fragmentParams.get("error_description") || requestUrl.searchParams.get("error_description")

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
        has_access_token: !!accessToken,
        has_refresh_token: !!refreshToken,
        error_description: errorDescription,
        timestamp: new Date().toISOString(),
        full_url: request.url,
        fragment: fragment,
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

  if (!accessToken) {
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

    // Set the session with the tokens from fragments
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken!,
    })

    if (sessionError || !sessionData.user) {
      throw new Error(sessionError?.message || "Failed to create session")
    }

    const user = sessionData.user

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
        },
      })
    } catch (logError) {
      console.error("Failed to log confirmation success:", logError)
    }

    const isApproved = userData?.is_approved || false
    const redirectUrl = `/auth/confirm?confirmed=true&approved=${isApproved}`
    const response = NextResponse.redirect(new URL(redirectUrl, request.url))

    // Set session cookies
    const cookiesToSet: Array<{ name: string; value: string; options?: any }> = []

    const supabaseWithCookies = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              cookiesToSet.push({ name, value, options })
            })
          },
        },
      },
    )

    // Set the session to trigger cookie setting
    await supabaseWithCookies.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken!,
    })

    // Apply all cookies to response
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })

    return response
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
