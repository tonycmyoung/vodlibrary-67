import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const code = requestUrl.searchParams.get("code")
  const token_hash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

  const serviceSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  if (error) {
    try {
      await serviceSupabase.from("auth_debug_logs").insert({
        event_type: "email_confirm_callback_error",
        user_email: null,
        user_id: null,
        success: false,
        error_message: `Confirmation failed: ${errorDescription || error}`,
        error_code: error,
        additional_data: {
          type: type || null,
          full_url: requestUrl.toString(),
          has_code: !!code,
          has_token_hash: !!token_hash,
          error_description: errorDescription,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (logError) {
      console.error("[v0] Failed to log confirmation error:", logError)
    }

    let errorParam = "invalid"
    if (error === "access_denied" && errorDescription?.includes("expired")) {
      errorParam = "expired"
    }

    const redirectUrl = new URL(`/auth/confirm?error=${errorParam}`, request.url)
    if (errorDescription) {
      redirectUrl.searchParams.set("error_description", errorDescription)
    }
    return NextResponse.redirect(redirectUrl)
  }

  let confirmationMethod: string
  if (token_hash) {
    confirmationMethod = "token_hash"
  } else if (code) {
    confirmationMethod = "code"
  } else {
    confirmationMethod = "no_params"
  }

  try {
    await serviceSupabase.from("auth_debug_logs").insert({
      event_type: "email_confirm_callback_success",
      user_email: null,
      user_id: null,
      success: true,
      error_message: null,
      error_code: null,
      additional_data: {
        type: type || null,
        full_url: requestUrl.toString(),
        has_code: !!code,
        has_token_hash: !!token_hash,
        error_description: errorDescription,
        confirmation_method: confirmationMethod,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (logError) {
    console.error("[v0] Failed to log confirmation success:", logError)
  }

  return NextResponse.redirect(new URL("/auth/confirm?success=true", request.url))
}
