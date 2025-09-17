import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get("token_hash")
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

  // Log confirmation attempt
  try {
    await supabase.from("auth_debug_logs").insert({
      event_type: "email_confirmation_attempt",
      user_id: null,
      details: {
        has_token: !!token_hash,
        type: type,
        error: error,
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
  if (!token_hash || !type) {
    return NextResponse.redirect(new URL("/auth/confirm?error=missing_params", request.url))
  }

  try {
    // Verify the OTP token
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })

    if (verifyError) {
      console.error("Email confirmation verification error:", verifyError)

      // Log verification failure
      try {
        await supabase.from("auth_debug_logs").insert({
          event_type: "email_confirmation_failed",
          user_id: null,
          details: {
            error: verifyError.message,
            token_hash: token_hash?.substring(0, 10) + "...", // Partial token for debugging
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
        await supabase.from("auth_debug_logs").insert({
          event_type: "email_confirmation_success",
          user_id: data.session.user.id,
          details: {
            email: data.session.user.email,
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
      await supabase.from("auth_debug_logs").insert({
        event_type: "email_confirmation_error",
        user_id: null,
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        },
      })
    } catch (logError) {
      console.error("Failed to log processing error:", logError)
    }

    return NextResponse.redirect(new URL("/auth/confirm?error=processing_failed", request.url))
  }
}
