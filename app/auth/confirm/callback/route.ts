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

  try {
    await serviceSupabase.from("auth_debug_logs").insert({
      event_type: "email_confirmation_attempt",
      user_email: null, // We don't have email in URL parameters
      user_id: null, // We don't have user_id until after confirmation
      success: false, // Will be updated if successful
      error_message: errorDescription || error || null,
      error_code: error || null,
      additional_data: {
        type: type || null,
        full_url: requestUrl.toString(),
        has_code: !!code,
        has_token_hash: !!token_hash,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (logError) {
    console.error("[v0] Failed to log confirmation attempt:", logError)
  }

  if (error) {
    try {
      await serviceSupabase.from("auth_debug_logs").insert({
        event_type: "email_confirmation_error",
        user_email: null,
        user_id: null,
        success: false,
        error_message: `Confirmation failed: ${errorDescription || error}`,
        error_code: error,
        additional_data: {
          error_description: errorDescription,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (logError) {
      console.error("[v0] Failed to log confirmation error:", logError)
    }

    const errorParam = error === "access_denied" && errorDescription?.includes("expired") ? "expired" : "invalid"
    return NextResponse.redirect(new URL(`/auth/confirm?error=${errorParam}`, request.url))
  }

  if (token_hash || code) {
    try {
      await serviceSupabase.from("auth_debug_logs").insert({
        event_type: "email_confirmation_success",
        user_email: null,
        user_id: null,
        success: true,
        error_message: null,
        error_code: null,
        additional_data: {
          confirmation_method: token_hash ? "token_hash" : "code",
          timestamp: new Date().toISOString(),
        },
      })
    } catch (logError) {
      console.error("[v0] Failed to log confirmation success:", logError)
    }

    return NextResponse.redirect(new URL("/auth/confirm", request.url))
  }

  try {
    await serviceSupabase.from("auth_debug_logs").insert({
      event_type: "email_confirmation_error",
      user_email: null,
      user_id: null,
      success: false,
      error_message: "Confirmation failed: missing required parameters",
      error_code: "missing_params",
      additional_data: {
        timestamp: new Date().toISOString(),
      },
    })
  } catch (logError) {
    console.error("[v0] Failed to log missing params error:", logError)
  }

  return NextResponse.redirect(new URL("/auth/confirm?error=missing_params", request.url))
}
