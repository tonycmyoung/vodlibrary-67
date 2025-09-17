import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

  // Handle errors from Supabase
  if (error) {
    const errorParam = error === "access_denied" && errorDescription?.includes("expired") ? "expired" : "invalid"
    return NextResponse.redirect(new URL(`/auth/confirm?error=${errorParam}`, request.url))
  }

  // Verify we have the required parameters
  if (!token_hash || !type) {
    return NextResponse.redirect(new URL("/auth/confirm?error=missing_params", request.url))
  }

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

  try {
    // Verify the OTP token
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })

    if (verifyError) {
      console.error("Email confirmation verification error:", verifyError)
      const errorParam =
        verifyError.message.includes("expired") || verifyError.message.includes("invalid")
          ? "expired"
          : "verification_failed"
      return NextResponse.redirect(new URL(`/auth/confirm?error=${errorParam}`, request.url))
    }

    if (data.session?.user) {
      // Email confirmed successfully - redirect to confirmation page with success
      const response = NextResponse.redirect(new URL("/auth/confirm?confirmed=true", request.url))

      // Set cookies for the session
      response.cookies.set("sb-access-token", data.session.access_token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      })
      response.cookies.set("sb-refresh-token", data.session.refresh_token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      })

      return response
    }

    // No session created - something went wrong
    return NextResponse.redirect(new URL("/auth/confirm?error=no_session", request.url))
  } catch (error) {
    console.error("Confirmation processing error:", error)
    return NextResponse.redirect(new URL("/auth/confirm?error=processing_failed", request.url))
  }
}
