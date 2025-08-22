import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

export async function updateSession(request: NextRequest) {
  // If Supabase is not configured, just continue without auth
  if (!isSupabaseConfigured) {
    return NextResponse.next({
      request,
    })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Check if this is an auth callback
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code)
    // Redirect to home page after successful auth
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Refresh session if expired - required for Server Components
  try {
    await supabase.auth.getSession()
  } catch (error) {
    // If session refresh fails (e.g., invalid refresh token), clear cookies and redirect to login
    console.log("[v0] Session refresh failed, redirecting to login:", error)
    const response = NextResponse.redirect(new URL("/auth/login", request.url))
    // Clear all auth-related cookies
    response.cookies.delete("sb-access-token")
    response.cookies.delete("sb-refresh-token")
    return response
  }

  // Protected routes - redirect to login if not authenticated
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/auth/login") ||
    request.nextUrl.pathname.startsWith("/auth/sign-up") ||
    request.nextUrl.pathname === "/auth/callback"

  const isPublicRoute = request.nextUrl.pathname === "/pending-approval" || request.nextUrl.pathname === "/setup-admin"

  if (!isAuthRoute && !isPublicRoute) {
    let session
    try {
      const {
        data: { session: sessionData },
      } = await supabase.auth.getSession()
      session = sessionData
    } catch (error) {
      // If we can't get session data, redirect to login
      console.log("[v0] Failed to get session for protected route, redirecting to login:", error)
      const response = NextResponse.redirect(new URL("/auth/login", request.url))
      response.cookies.delete("sb-access-token")
      response.cookies.delete("sb-refresh-token")
      return response
    }

    if (!session) {
      const redirectUrl = new URL("/auth/login", request.url)
      return NextResponse.redirect(redirectUrl)
    }

    const isAdminEmail = session.user.email === "acmyma@gmail.com"

    // Admin users bypass approval checks and get redirected to admin dashboard
    // unless they explicitly want to view the student interface
    if (isAdminEmail && request.nextUrl.pathname === "/" && !request.nextUrl.searchParams.has("admin-view")) {
      const redirectUrl = new URL("/admin", request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Check if user is approved (except for admin routes and admin users)
    if (!request.nextUrl.pathname.startsWith("/admin") && !isAdminEmail) {
      const { data: user } = await supabase.from("users").select("is_approved").eq("id", session.user.id).single()

      if (user && !user.is_approved) {
        const redirectUrl = new URL("/pending-approval", request.url)
        return NextResponse.redirect(redirectUrl)
      }
    }
  }

  return supabaseResponse
}
