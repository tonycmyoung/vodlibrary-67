import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

const userApprovalCache = new Map<string, { isApproved: boolean; role: string; timestamp: number }>()
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes (increased from 5)

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

  let session
  try {
    const {
      data: { session: sessionData },
    } = await supabase.auth.getSession()
    session = sessionData
  } catch (error) {
    console.log("[v0] Session refresh failed:", error)
    const isAuthRoute =
      request.nextUrl.pathname.startsWith("/auth/login") ||
      request.nextUrl.pathname.startsWith("/auth/sign-up") ||
      request.nextUrl.pathname === "/auth/callback"

    if (isAuthRoute) {
      console.log("[v0] Auth route access with session error, allowing request")
      return supabaseResponse
    }

    // If it's a rate limiting error, allow the request to continue for non-auth routes
    const errorMessage = error?.message || ""
    if (errorMessage.includes("Too Many") || errorMessage.includes("SyntaxError")) {
      console.log("[v0] Rate limiting detected, redirecting to login")
      const response = NextResponse.redirect(new URL("/auth/login", request.url))
      response.cookies.delete("sb-access-token")
      response.cookies.delete("sb-refresh-token")
      return response
    }

    const response = NextResponse.redirect(new URL("/auth/login", request.url))
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

  if (isAuthRoute) {
    console.log("[v0] Auth route access, allowing request")
    return supabaseResponse
  }

  if (!isPublicRoute) {
    if (!session) {
      console.log("[v0] No session found, redirecting to login")
      const redirectUrl = new URL("/auth/login", request.url)
      return NextResponse.redirect(redirectUrl)
    }

    console.log("[v0] Session user:", {
      id: session.user.id,
      email: session.user.email,
      pathname: request.nextUrl.pathname,
    })

    const isAdminEmail = session.user.email === "acmyma@gmail.com"
    console.log("[v0] Is admin email:", isAdminEmail)

    // Admin users bypass approval checks and get redirected to admin dashboard
    // unless they explicitly want to view the student interface
    if (isAdminEmail && request.nextUrl.pathname === "/" && !request.nextUrl.searchParams.has("admin-view")) {
      console.log("[v0] Redirecting admin to /admin dashboard")
      const redirectUrl = new URL("/admin", request.url)
      return NextResponse.redirect(redirectUrl)
    }

    if (!request.nextUrl.pathname.startsWith("/admin") && !isAdminEmail) {
      const cachedApproval = getCachedUserApproval(session.user.id)

      if (cachedApproval) {
        console.log("[v0] Using cached user approval status:", cachedApproval)
        if (!cachedApproval.isApproved) {
          console.log("[v0] Cached user not approved, redirecting to pending approval")
          const redirectUrl = new URL("/pending-approval", request.url)
          return NextResponse.redirect(redirectUrl)
        }
      } else {
        console.log("[v0] Checking user approval status for non-admin user")

        try {
          const { data: user, error } = await supabase
            .from("users")
            .select("is_approved, role")
            .eq("id", session.user.id)
            .single()

          console.log("[v0] User data from database:", { user, error })

          if (error) {
            console.log("[v0] Database error, using fallback approval for known user:", error.message)
            setCachedUserApproval(session.user.id, true, "Teacher") // Fallback assumption
            return supabaseResponse
          }

          if (user) {
            setCachedUserApproval(session.user.id, user.is_approved, user.role)

            if (!user.is_approved) {
              console.log("[v0] User not approved, redirecting to pending approval")
              const redirectUrl = new URL("/pending-approval", request.url)
              return NextResponse.redirect(redirectUrl)
            }
          }
        } catch (dbError) {
          console.log("[v0] Database call failed, using fallback approval:", dbError)
          setCachedUserApproval(session.user.id, true, "Teacher") // Fallback assumption
          return supabaseResponse
        }
      }
    }

    if (request.nextUrl.pathname.startsWith("/admin")) {
      console.log("[v0] Admin page access attempt")

      const cachedApproval = getCachedUserApproval(session.user.id)

      if (cachedApproval && cachedApproval.role === "Admin") {
        console.log("[v0] Using cached admin role verification")
      } else {
        try {
          const { data: user, error } = await supabase
            .from("users")
            .select("role, is_approved")
            .eq("id", session.user.id)
            .single()
          console.log("[v0] Admin access check - User role:", { user, error })

          if (error) {
            console.log("[v0] Failed to fetch user data for admin access, denying access")
            const redirectUrl = new URL("/", request.url)
            return NextResponse.redirect(redirectUrl)
          } else if (user && user.role !== "Admin") {
            console.log("[v0] User does not have Admin role, current role:", user.role)
            setCachedUserApproval(session.user.id, user.is_approved, user.role)
            const redirectUrl = new URL("/", request.url)
            return NextResponse.redirect(redirectUrl)
          } else if (user) {
            setCachedUserApproval(session.user.id, user.is_approved, user.role)
          }
        } catch (dbError) {
          console.log("[v0] Admin role check failed, denying access:", dbError)
          const redirectUrl = new URL("/", request.url)
          return NextResponse.redirect(redirectUrl)
        }
      }
    }
  }

  return supabaseResponse
}
