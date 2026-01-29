import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

function setSessionCookies(
  response: NextResponse,
  session: { access_token: string; refresh_token: string }
) {
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  }
  response.cookies.set("sb-access-token", session.access_token, cookieOptions)
  response.cookies.set("sb-refresh-token", session.refresh_token, cookieOptions)
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

  if (error) {
    const errorPath = error === "access_denied" && errorDescription?.includes("expired")
      ? "/auth/login?error=expired"
      : "/auth/login?error=auth_failed"
    return NextResponse.redirect(new URL(errorPath, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Handled by the response
        },
      },
    },
  )

  try {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error("Auth exchange error:", exchangeError)
      return NextResponse.redirect(new URL("/auth/login?error=exchange_failed", request.url))
    }

    if (!data.session?.user) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    const { data: existingUser } = await supabase
      .from("users")
      .select("id, is_approved")
      .eq("id", data.session.user.id)
      .single()

    const redirectPath = existingUser ? "/" : "/auth/sign-up?invited=true"
    const response = NextResponse.redirect(new URL(redirectPath, request.url))

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setSessionCookies(response, session)
    }

    return response
  } catch (err) {
    console.error("Callback processing error:", err)
    return NextResponse.redirect(new URL("/auth/login?error=callback_failed", request.url))
  }
}
