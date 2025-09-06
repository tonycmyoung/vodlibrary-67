import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

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
  try {
    // If Supabase is not configured, just continue without auth
    if (!isSupabaseConfigured) {
      return NextResponse.next({
        request,
      })
    }

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
      console.error("Supabase client creation error:", clientError?.message)
      const redirectUrl = new URL("/", request.url)
      return NextResponse.redirect(redirectUrl)
    }

    let session
    try {
      const {
        data: { session: sessionData },
      } = await supabase.auth.getSession()

      session = sessionData
    } catch (error) {
      console.error("Session error occurred:", error?.message)

      const isAuthRoute =
        request.nextUrl.pathname.startsWith("/auth/login") ||
        request.nextUrl.pathname.startsWith("/auth/sign-up") ||
        request.nextUrl.pathname === "/auth/callback"

      if (isAuthRoute) {
        return supabaseResponse
      }

      const errorMessage = error?.message || ""
      if (
        errorMessage.includes("Too Many") ||
        errorMessage.includes("SyntaxError") ||
        errorMessage.includes("Invalid Refresh Token")
      ) {
        console.error("Auth error detected, redirecting to error page")
        const response = NextResponse.redirect(new URL("/error?type=session&message=Session expired", request.url))
        response.cookies.delete("sb-access-token")
        response.cookies.delete("sb-refresh-token")
        response.cookies.delete("supabase-auth-token")
        response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
        response.headers.set("Pragma", "no-cache")
        response.headers.set("Expires", "0")
        return response
      }

      console.error("General auth error, redirecting to error page")
      const response = NextResponse.redirect(new URL("/error?type=auth&message=Authentication required", request.url))
      response.cookies.delete("sb-access-token")
      response.cookies.delete("sb-refresh-token")
      response.cookies.delete("supabase-auth-token")
      return response
    }

    // Protected routes - redirect to login if not authenticated
    const isAuthRoute =
      request.nextUrl.pathname.startsWith("/auth/login") ||
      request.nextUrl.pathname.startsWith("/auth/sign-up") ||
      request.nextUrl.pathname === "/auth/callback"

    const isPublicRoute =
      request.nextUrl.pathname === "/pending-approval" || request.nextUrl.pathname === "/setup-admin"

    // Protected routes - redirect to login if not authenticated
    if (isAuthRoute) {
      return supabaseResponse
    }

    if (!isPublicRoute) {
      if (!session) {
        const redirectUrl = new URL("/auth/login", request.url)
        return NextResponse.redirect(redirectUrl)
      }

      if (session?.user && !request.nextUrl.pathname.startsWith("/admin")) {
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
          console.error("Database error:", dbError?.message)
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

          if (!error && user && user.role === "Admin") {
            setCachedUserApproval(session.user.id, user.is_approved, user.role)
            return supabaseResponse
          }
        } catch (dbError) {
          console.error("Database query error:", dbError?.message)
          // Database error - deny access for non-admin emails
        }

        // Not authorized for admin routes
        console.error("Unauthorized admin access attempt by:", session.user?.email)
        const redirectUrl = new URL("/error?type=permission&message=Admin access required", request.url)
        return NextResponse.redirect(redirectUrl)
      }
    }

    return supabaseResponse
  } catch (middlewareError) {
    console.error("Middleware unhandled error:", middlewareError?.message)
    const redirectUrl = new URL("/error?type=server&message=Server error occurred", request.url)
    return NextResponse.redirect(redirectUrl)
  }
}
