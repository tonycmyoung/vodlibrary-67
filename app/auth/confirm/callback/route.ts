import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token = requestUrl.searchParams.get("token")
  const type = requestUrl.searchParams.get("type")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

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
        has_token: !!token,
        type: type,
        error_description: errorDescription,
        timestamp: new Date().toISOString(),
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

  // Verify we have the required parameters
  if (!token || !type) {
    return NextResponse.redirect(new URL("/auth/confirm?error=missing_params", request.url))
  }

  try {
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token,
      type: type as any,
    })

    if (verifyError) {
      console.error("Email confirmation verification error:", verifyError)

      // Log verification failure
      try {
        await serviceSupabase.from("auth_debug_logs").insert({
          event_type: "email_confirmation_failed",
          user_id: null,
          user_email: null,
          success: false,
          error_message: verifyError.message,
          error_code: verifyError.code || null,
          additional_data: {
            token_preview: token?.substring(0, 10) + "...", // Partial token for debugging
            type: type,
            timestamp: new Date().toISOString(),
          },
        })
      } catch (logError) {
        console.error("Failed to log verification failure:", logError)
      }

      const errorParam =
        verifyError.message.includes("expired") || verifyError.message.includes("invalid")
          ? "expired"
          : "verification_failed"
      return NextResponse.redirect(new URL(`/auth/confirm?error=${errorParam}`, request.url))
    }

    if (data.session?.user) {
      try {
        await serviceSupabase.from("auth_debug_logs").insert({
          event_type: "email_confirmation_success",
          user_id: data.session.user.id,
          user_email: data.session.user.email,
          success: true,
          error_message: null,
          error_code: null,
          additional_data: {
            confirmed_at: new Date().toISOString(),
            type: type,
          },
        })
      } catch (logError) {
        console.error("Failed to log confirmation success:", logError)
      }

      // Email confirmed successfully - redirect to confirmation page with success
      const response = NextResponse.redirect(new URL("/auth/confirm?confirmed=true", request.url))

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

      // Trigger cookie setting by getting session
      await supabaseWithCookies.auth.getSession()

      // Apply all cookies to response
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })

      return response
    }

    // No session created - something went wrong
    return NextResponse.redirect(new URL("/auth/confirm?error=no_session", request.url))
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
