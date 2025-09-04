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
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session?.user) {
      // Track the login using service role client
      try {
        const serviceSupabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            cookies: {
              getAll() {
                return []
              },
              setAll() {},
            },
          },
        )

        await serviceSupabase.from("user_logins").insert({
          user_id: data.session.user.id,
          login_time: new Date().toISOString(),
        })
      } catch (trackingError) {
        // Silently fail - don't break the user experience for tracking issues
      }
    }

    return NextResponse.redirect(new URL("/auth/login?confirmed=true", request.url))
  }

  let session
  try {
    const {
      data: { session: sessionData },
    } = await supabase.auth.getSession()
    session = sessionData
  } catch (error) {
    const isAuthRoute =
      request.nextUrl.pathname.startsWith("/auth/login") ||
      request.nextUrl.pathname.startsWith("/auth/sign-up") ||
      request.nextUrl.pathname === "/auth/callback"

    if (isAuthRoute) {
      return supabaseResponse
    }

    // If it's a rate limiting error, allow the request to continue for non-auth routes
    const errorMessage = error?.message || ""
    if (errorMessage.includes("Too Many") || errorMessage.includes("SyntaxError")) {
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
            const redirectUrl = new URL("/admin", request.url)
            return NextResponse.redirect(redirectUrl)
          }
        }
      } catch (dbError) {
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
        // Database error - deny access for non-admin emails
      }

      // Not authorized for admin routes
      const redirectUrl = new URL("/", request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}
