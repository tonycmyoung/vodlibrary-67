import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const code = requestUrl.searchParams.get("code")
  const token_hash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

  console.log("auth_debug_logs", "Email confirmation_attempt", {
    type: type || null,
    full_url: requestUrl.toString(),
    has_code: !!code,
    has_token_hash: !!token_hash,
    timestamp: new Date().toISOString(),
    error_description: errorDescription || null,
  })

  if (error) {
    console.log("auth_debug_logs", "Email confirmation_error", `Confirmation failed: ${errorDescription || error}`)

    const errorParam = error === "access_denied" && errorDescription?.includes("expired") ? "expired" : "invalid"
    return NextResponse.redirect(new URL(`/auth/confirm?error=${errorParam}`, request.url))
  }

  if (token_hash || code) {
    return NextResponse.redirect(new URL("/auth/confirm", request.url))
  }

  console.log("auth_debug_logs", "Email confirmation_error", "Confirmation failed: missing required parameters")
  return NextResponse.redirect(new URL("/auth/confirm?error=missing_params", request.url))
}
