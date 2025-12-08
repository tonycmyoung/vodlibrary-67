import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { AuthCookieService } from "@/lib/auth/cookie-service"
import { validateReturnTo } from "@/lib/utils/auth"

const userApprovalCache = new Map<string, { isApproved: boolean; role: string; timestamp: number }>()
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

function getCachedUserApproval(userId: string) {
  const cached = userApprovalCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { isApproved: cached.isApproved, role: cached.role }
  }
  // Clean up expired cache entry
  if (cached) {
    userApprovalCache.delete(userId)
  }
  return null
}

function setCachedUserApproval(userId: string, isApproved: boolean, role: string) {
  userApprovalCache.set(userId, { isApproved, role, timestamp: Date.now() })

  // Clean up old cache entries to prevent memory leaks
  if (userApprovalCache.size > 100) {
    const now = Date.now()
    for (const [key, value] of userApprovalCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        userApprovalCache.delete(key)
      }
    }
  }
}

export async function updateSession(request: NextRequest) {
  console.log("[v0] Middleware: Processing request for path:", request.nextUrl.pathname)

  const hasEnvVars = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!hasEnvVars) {
    console.log("[v0] Middleware: Env vars not available, skipping middleware auth (page-level auth will handle)")
    return NextResponse.next({ request })
  }

  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

    let supabase
    try {
      supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
      })
    } catch (clientError) {
      console.error("[v0] Middleware: Supabase client creation error:", clientError?.message)
      const redirectUrl = new URL("/", request.url)
      return NextResponse.redirect(redirectUrl)
    }

    let session
    try {
      const {
        data: { session: sessionData },
      } = await supabase.auth.getSession()

      session = sessionData
      console.log("[v0] Middleware: Session check result - authenticated:", !!session)
    } catch (error) {
      console.error("[v0] Middleware: Session error occurred:", error?.message)

      const isAuthRoute =
        request.nextUrl.pathname.startsWith("/auth/login") ||
        request.nextUrl.pathname.startsWith("/auth/sign-up") ||
        request.nextUrl.pathname === "/auth/callback"

      if (isAuthRoute) {
        console.log("[v0] Middleware: Error on auth route, allowing through")
        return supabaseResponse
      }

      const errorMessage = error?.message || ""
      if (
        errorMessage.includes("Too Many") ||
        errorMessage.includes("SyntaxError") ||
        errorMessage.includes("Invalid Refresh Token")
      ) {
        console.error("[v0] Middleware: Auth error detected, redirecting to error page")
        return AuthCookieService.createAuthErrorResponse(request, "session", "Session expired")
      }

      console.error("[v0] Middleware: General auth error, redirecting to error page")
      return AuthCookieService.createAuthErrorResponse(request, "auth", "Authentication required")
    }

    // Protected routes - redirect to login if not authenticated
    const isAuthRoute =
      request.nextUrl.pathname.startsWith("/auth/login") ||
      request.nextUrl.pathname.startsWith("/auth/sign-up") ||
      request.nextUrl.pathname === "/auth/callback"

    const isPublicRoute =
      request.nextUrl.pathname === "/pending-approval" ||
      request.nextUrl.pathname === "/setup-admin" ||
      request.nextUrl.pathname === "/privacy-policy" ||
      request.nextUrl.pathname === "/eula" ||
      request.nextUrl.pathname === "/auth/confirm" ||
      request.nextUrl.pathname === "/auth/confirm/callback" ||
      request.nextUrl.pathname === "/auth/reset-password"

    if (isAuthRoute || isPublicRoute) {
      console.log("[v0] Middleware: Auth or public route, allowing through")
      return supabaseResponse
    }

    if (!session) {
      const currentPath = request.nextUrl.pathname
      const validReturnTo = validateReturnTo(currentPath)

      const redirectUrl = new URL("/auth/login", request.url)
      if (validReturnTo) {
        redirectUrl.searchParams.set("returnTo", validReturnTo)
        console.log("[v0] Middleware: Redirecting to login with returnTo:", validReturnTo)
      } else {
        console.log("[v0] Middleware: Redirecting to login without returnTo (path excluded or invalid)")
      }

      return NextResponse.redirect(redirectUrl)
    }

    if (
      session?.user &&
      !request.nextUrl.pathname.startsWith("/admin") &&
      request.nextUrl.pathname !== "/pending-approval"
    ) {
      try {
        const { data: user, error } = await supabase
          .from("users")
          .select("is_approved, role")
          .eq("id", session.user.id)
          .single()

        if (error) {
          console.error("User lookup error:", error.message)
          setCachedUserApproval(session.user.id, true, "Teacher") // Fallback assumption
          return supabaseResponse
        }

        if (user) {
          setCachedUserApproval(session.user.id, user.is_approved, user.role)

          if (!user.is_approved) {
            const redirectUrl = new URL("/pending-approval", request.url)
            return NextResponse.redirect(redirectUrl)
          }

          const isAdminEmail = session.user.email === "acmyma@gmail.com"
          if ((user.role === "Admin" || isAdminEmail) && request.nextUrl.pathname === "/") {
            // Check if we're already coming from admin to prevent loops
            const referer = request.headers.get("referer")
            if (!referer || !referer.includes("/admin")) {
              const redirectUrl = new URL("/admin", request.url)
              return NextResponse.redirect(redirectUrl)
            }
          }
        }
      } catch (dbError) {
        console.error("User lookup error:", dbError?.message)
        setCachedUserApproval(session.user.id, true, "Teacher") // Fallback assumption
        return supabaseResponse
      }
    }

    if (request.nextUrl.pathname.startsWith("/admin")) {
      const isAdminEmail = session.user.email === "acmyma@gmail.com"

      if (isAdminEmail) {
        // Admin email always has access
        return supabaseResponse
      }

      const cachedApproval = getCachedUserApproval(session.user.id)

      if (cachedApproval && cachedApproval.role === "Admin") {
        return supabaseResponse
      }

      try {
        const { data: user, error } = await supabase
          .from("users")
          .select("role, is_approved")
          .eq("id", session.user.id)
          .single()

        if (error) {
          console.error("Admin lookup error:", error.message)
        } else if (user && user.role === "Admin") {
          setCachedUserApproval(session.user.id, user.is_approved, user.role)
          return supabaseResponse
        }
      } catch (dbError) {
        console.error("Admin check error:", dbError?.message)
      }

      // Not authorized for admin routes
      console.error("Unauthorized admin access attempt by:", session.user?.email)
      const redirectUrl = new URL("/error?type=permission&message=Admin access required", request.url)
      return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
  } catch (middlewareError) {
    console.error("[v0] Middleware: Unhandled error:", middlewareError?.message)
    return AuthCookieService.createAuthErrorResponse(request, "server", "Server error occurred")
  }
}
