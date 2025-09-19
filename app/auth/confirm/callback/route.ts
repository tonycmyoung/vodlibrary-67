import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const code = requestUrl.searchParams.get("code")
  const token_hash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type")
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

  try {
    await serviceSupabase.from("auth_debug_logs").insert({
      event_type: "email_confirmation_attempt",
      user_id: null,
      user_email: null,
      success: false,
      error_message: error || null,
      error_code: null,
      additional_data: {
        has_code: !!code,
        has_token_hash: !!token_hash,
        type: type,
        error_description: errorDescription,
        timestamp: new Date().toISOString(),
        full_url: request.url,
      },
    })
  } catch (logError) {
    console.error("Failed to log confirmation attempt:", logError)
  }

  if (error) {
    const errorParam = error === "access_denied" && errorDescription?.includes("expired") ? "expired" : "invalid"
    return NextResponse.redirect(new URL(`/auth/confirm?error=${errorParam}`, request.url))
  }

  if (!token_hash && !code) {
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

    let data, exchangeError

    if (token_hash && type) {
      const result = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      })
      data = result.data
      exchangeError = result.error
    } else if (code) {
      const result = await supabase.auth.exchangeCodeForSession(code)
      data = result.data
      exchangeError = result.error
    } else {
      throw new Error("No valid confirmation parameters found")
    }

    if (exchangeError) {
      throw new Error(`Confirmation failed: ${exchangeError.message}`)
    }

    if (!data.user) {
      throw new Error("No user returned from confirmation")
    }

    const user = data.user

    const { data: userData, error: userError } = await serviceSupabase
      .from("users")
      .select("is_approved")
      .eq("id", user.id)
      .single()

    if (userError) {
      console.error("Error checking user approval status:", userError)
    }

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
          session_created: !!data.session,
          method_used: token_hash ? "verifyOtp" : "exchangeCodeForSession",
        },
      })
    } catch (logError) {
      console.error("Failed to log confirmation success:", logError)
    }

    const isApproved = userData?.is_approved || false

    const response = NextResponse.redirect(new URL(`/auth/confirm?confirmed=true&approved=${isApproved}`, request.url))

    if (data.session) {
      const supabaseResponse = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options)
              })
            },
          },
        },
      )

      await supabaseResponse.auth.getSession()
    }

    return response
  } catch (error) {
    console.error("Confirmation processing error:", error)

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
