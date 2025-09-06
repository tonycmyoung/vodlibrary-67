import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

let cachedClient: any = null
let cacheRequestId: string | null = null

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

function getCachedSupabaseClient(request: NextRequest, supabaseResponse: NextResponse) {
  const requestId = request.headers.get("x-request-id") || request.url + Date.now()

  if (cachedClient && cacheRequestId === requestId) {
    console.log("[v0] MIDDLEWARE - Using cached Supabase client")
    return cachedClient
  }

  console.log("[v0] MIDDLEWARE - Creating new Supabase client")
  cachedClient = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
  cacheRequestId = requestId
  return cachedClient
}

export async function updateSession(request: NextRequest) {
  console.log("[v0] MIDDLEWARE EXECUTION START - URL:", request.url)
  console.log("[v0] MIDDLEWARE - Method:", request.method)
  console.log("[v0] MIDDLEWARE - Pathname:", request.nextUrl.pathname)

  const redirectCount = Number.parseInt(request.headers.get("x-redirect-count") || "0")
  if (redirectCount > 3) {
    console.log("[v0] MIDDLEWARE - Redirect loop detected, breaking chain")
    const errorUrl = new URL("/error?type=redirect&message=Too many redirects", request.url)
    return NextResponse.redirect(errorUrl)
  }

  try {
    // If Supabase is not configured, just continue without auth
    if (!isSupabaseConfigured) {
      console.log("[v0] MIDDLEWARE - Supabase not configured, skipping")
      return NextResponse.next({
        request,
      })
    }

    const supabaseResponse = NextResponse.next({
      request,
    })

    let supabase
    try {
      supabase = getCachedSupabaseClient(request, supabaseResponse)
      console.log("[v0] MIDDLEWARE - Supabase client ready")
    } catch (clientError) {
      console.log("[v0] MIDDLEWARE - Supabase client creation error:", clientError?.message)
      console.log("[v0] MIDDLEWARE - Redirecting to home due to client error")
      const redirectUrl = new URL("/", request.url)
      const response = NextResponse.redirect(redirectUrl)
      response.headers.set("x-redirect-count", String(redirectCount + 1))
      return response
    }

    console.log("[v0] MIDDLEWARE - Processing request (OAuth logic removed)")

    console.log("[v0] MIDDLEWARE - About to get session")
    console.log("[v0] MIDDLEWARE - Getting session")
    let session
    try {
      console.log("[v0] MIDDLEWARE - Calling supabase.auth.getSession()")
      console.log("[v0] MIDDLEWARE - Request URL for session call:", request.url)
      console.log("[v0] MIDDLEWARE - Request pathname for session call:", request.nextUrl.pathname)
      console.log("[v0] MIDDLEWARE - Request search params:", request.nextUrl.searchParams.toString())

      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Session timeout")), 5000))

      const {
        data: { session: sessionData },
      } = await Promise.race([sessionPromise, timeoutPromise])

      console.log("[v0] MIDDLEWARE - Session call completed successfully")
      session = sessionData
      console.log("[v0] MIDDLEWARE - Session retrieved successfully:", session ? "authenticated" : "not authenticated")
      if (session?.user) {
        console.log("[v0] MIDDLEWARE - Session user email:", session.user.email)
      }
    } catch (error) {
      console.log("[v0] MIDDLEWARE - Session error occurred:", error?.message)
      console.log("[v0] MIDDLEWARE - Session error stack:", error?.stack)
      console.log("[v0] MIDDLEWARE - Session error for URL:", request.url)

      const isAuthRoute =
        request.nextUrl.pathname.startsWith("/auth/login") ||
        request.nextUrl.pathname.startsWith("/auth/sign-up") ||
        request.nextUrl.pathname === "/auth/callback"

      if (isAuthRoute) {
        console.log("[v0] MIDDLEWARE - Auth route, returning supabaseResponse")
        return supabaseResponse
      }

      const errorMessage = error?.message || ""
      if (
        errorMessage.includes("Too Many") ||
        errorMessage.includes("SyntaxError") ||
        errorMessage.includes("Invalid Refresh Token") ||
        errorMessage.includes("Session timeout")
      ) {
        console.log("[v0] MIDDLEWARE - Auth error detected, redirecting to error page")
        const response = NextResponse.redirect(new URL("/error?type=session&message=Session expired", request.url))
        response.cookies.delete("sb-access-token")
        response.cookies.delete("sb-refresh-token")
        response.cookies.delete("supabase-auth-token")
        response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
        response.headers.set("Pragma", "no-cache")
        response.headers.set("Expires", "0")
        response.headers.set("x-redirect-count", String(redirectCount + 1))
        return response
      }

      console.log("[v0] MIDDLEWARE - General auth error, redirecting to error page")
      const response = NextResponse.redirect(new URL("/error?type=auth&message=Authentication required", request.url))
      response.cookies.delete("sb-access-token")
      response.cookies.delete("sb-refresh-token")
      response.cookies.delete("supabase-auth-token")
      response.headers.set("x-redirect-count", String(redirectCount + 1))
      return response
    }

    console.log("[v0] MIDDLEWARE - About to determine route types")
    // Protected routes - redirect to login if not authenticated
    const isAuthRoute =
      request.nextUrl.pathname.startsWith("/auth/login") ||
      request.nextUrl.pathname.startsWith("/auth/sign-up") ||
      request.nextUrl.pathname === "/auth/callback"

    const isPublicRoute =
      request.nextUrl.pathname === "/pending-approval" || request.nextUrl.pathname === "/setup-admin"

    console.log("[v0] MIDDLEWARE - Route type determined:", {
      isAuthRoute,
      isPublicRoute,
      pathname: request.nextUrl.pathname,
    })

    // Protected routes - redirect to login if not authenticated
    if (isAuthRoute) {
      console.log("[v0] MIDDLEWARE - Auth route, continuing")
      return supabaseResponse
    }

    if (!isPublicRoute) {
      if (!session) {
        console.log("[v0] MIDDLEWARE - No session, redirecting to login")
        const redirectUrl = new URL("/auth/login", request.url)
        const response = NextResponse.redirect(redirectUrl)
        response.headers.set("x-redirect-count", String(redirectCount + 1))
        return response
      }

      if (session?.user && !request.nextUrl.pathname.startsWith("/admin")) {
        console.log("[v0] MIDDLEWARE - Processing non-admin route for user:", session.user.email)
        try {
          const { data: user, error } = await supabase
            .from("users")
            .select("is_approved, role")
            .eq("id", session.user.id)
            .single()

          if (error) {
            console.log("[v0] MIDDLEWARE - User lookup error:", error.message)
            setCachedUserApproval(session.user.id, true, "Teacher") // Fallback assumption
            return supabaseResponse
          }

          if (user) {
            console.log("[v0] MIDDLEWARE - User found:", { approved: user.is_approved, role: user.role })
            setCachedUserApproval(session.user.id, user.is_approved, user.role)

            if (!user.is_approved) {
              console.log("[v0] MIDDLEWARE - User not approved, redirecting to pending")
              const redirectUrl = new URL("/pending-approval", request.url)
              const response = NextResponse.redirect(redirectUrl)
              response.headers.set("x-redirect-count", String(redirectCount + 1))
              return response
            }

            const isAdminEmail = session.user.email === "acmyma@gmail.com"
            if ((user.role === "Admin" || isAdminEmail) && request.nextUrl.pathname === "/") {
              // Check if we're already coming from admin to prevent loops
              const referer = request.headers.get("referer")
              if (!referer || !referer.includes("/admin")) {
                console.log("[v0] MIDDLEWARE - Admin user on home, redirecting to admin")
                const redirectUrl = new URL("/admin", request.url)
                const response = NextResponse.redirect(redirectUrl)
                response.headers.set("x-redirect-count", String(redirectCount + 1))
                return response
              }
            }
          }
        } catch (dbError) {
          console.log("[v0] MIDDLEWARE - Database error:", dbError?.message)
          setCachedUserApproval(session.user.id, true, "Teacher") // Fallback assumption
          return supabaseResponse
        }
      }

      if (request.nextUrl.pathname.startsWith("/admin")) {
        console.log("[v0] MIDDLEWARE - Processing admin route for user:", session.user.email)
        const isAdminEmail = session.user.email === "acmyma@gmail.com"

        if (isAdminEmail) {
          console.log("[v0] MIDDLEWARE - Admin email authorized")
          // Admin email always has access
          return supabaseResponse
        }

        console.log("[v0] MIDDLEWARE - Checking cached approval for user:", session.user.id)
        const cachedApproval = getCachedUserApproval(session.user.id)

        if (cachedApproval && cachedApproval.role === "Admin") {
          console.log("[v0] MIDDLEWARE - Cached admin role found")
          return supabaseResponse
        }

        console.log("[v0] MIDDLEWARE - Querying database for user role")
        try {
          const { data: user, error } = await supabase
            .from("users")
            .select("role, is_approved")
            .eq("id", session.user.id)
            .single()

          console.log("[v0] MIDDLEWARE - Database query result:", { user, error: error?.message })

          if (!error && user && user.role === "Admin") {
            console.log("[v0] MIDDLEWARE - Database admin role confirmed")
            setCachedUserApproval(session.user.id, user.is_approved, user.role)
            return supabaseResponse
          }
        } catch (dbError) {
          console.log("[v0] MIDDLEWARE - Database query error:", dbError?.message)
          // Database error - deny access for non-admin emails
        }

        // Not authorized for admin routes
        console.log("[v0] MIDDLEWARE - Not authorized for admin, redirecting to error page")
        const redirectUrl = new URL("/error?type=permission&message=Admin access required", request.url)
        const response = NextResponse.redirect(redirectUrl)
        response.headers.set("x-redirect-count", String(redirectCount + 1))
        return response
      }
    }

    console.log("[v0] MIDDLEWARE EXECUTION END - Continuing to:", request.nextUrl.pathname)
    return supabaseResponse
  } catch (middlewareError) {
    console.log("[v0] MIDDLEWARE - Unhandled error:", middlewareError?.message)
    console.log("[v0] MIDDLEWARE - Stack trace:", middlewareError?.stack)
    console.log("[v0] MIDDLEWARE - Error occurred for URL:", request.url)
    console.log("[v0] MIDDLEWARE - Redirecting to error page due to unhandled error")
    const redirectUrl = new URL("/error?type=server&message=Server error occurred", request.url)
    const response = NextResponse.redirect(redirectUrl)
    response.headers.set("x-redirect-count", String(redirectCount + 1))
    return response
  }
}
