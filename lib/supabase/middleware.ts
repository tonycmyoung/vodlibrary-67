import { createServerClient, type SupabaseClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { AuthCookieService } from "@/lib/auth/cookie-service"
import { validateReturnTo } from "@/lib/utils/auth"
import type { Session } from "@supabase/supabase-js"

const userApprovalCache = new Map<string, { isApproved: boolean; role: string; timestamp: number }>()
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

const AUTH_ROUTES = ["/auth/login", "/auth/sign-up", "/auth/callback"]
const PUBLIC_ROUTES = new Set([
  "/pending-approval",
  "/setup-admin",
  "/privacy-policy",
  "/eula",
  "/auth/confirm",
  "/auth/confirm/callback",
  "/auth/reset-password",
])
const ADMIN_EMAIL = "acmyma@gmail.com"

function getCachedUserApproval(userId: string) {
  const cached = userApprovalCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { isApproved: cached.isApproved, role: cached.role }
  }
  if (cached) {
    userApprovalCache.delete(userId)
  }
  return null
}

function setCachedUserApproval(userId: string, isApproved: boolean, role: string) {
  userApprovalCache.set(userId, { isApproved, role, timestamp: Date.now() })

  if (userApprovalCache.size > 100) {
    const now = Date.now()
    for (const [key, value] of userApprovalCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        userApprovalCache.delete(key)
      }
    }
  }
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route) || pathname === route)
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(pathname)
}

function handleSessionError(error: Error | null, request: NextRequest, supabaseResponse: NextResponse): NextResponse {
  console.error("[v0] Middleware: Session error occurred:", error?.message)

  if (isAuthRoute(request.nextUrl.pathname)) {
    return supabaseResponse
  }

  const errorMessage = error?.message || ""
  const isRecoverableError =
    errorMessage.includes("Too Many") ||
    errorMessage.includes("SyntaxError") ||
    errorMessage.includes("Invalid Refresh Token")

  if (isRecoverableError) {
    console.error("[v0] Middleware: Auth error detected, redirecting to error page")
    return AuthCookieService.createAuthErrorResponse(request, "session", "Session expired")
  }

  console.error("[v0] Middleware: General auth error, redirecting to error page")
  return AuthCookieService.createAuthErrorResponse(request, "auth", "Authentication required")
}

function getValidReturnPath(request: NextRequest): string {
  let currentPath = request.nextUrl.pathname

  try {
    currentPath = decodeURIComponent(currentPath)
  } catch {
    return ""
  }

  // Reject paths that look like they contain domain information
  if (/^\/?(www\.|[a-z0-9-]+\.[a-z]{2,})/i.test(currentPath)) {
    return ""
  }

  return validateReturnTo(currentPath) || ""
}

function createLoginRedirect(request: NextRequest, returnTo: string): NextResponse {
  const redirectUrl = new URL("/auth/login", request.url)
  if (returnTo) {
    redirectUrl.searchParams.set("returnTo", returnTo)
  }
  return NextResponse.redirect(redirectUrl)
}

async function handleUserApprovalCheck(
  supabase: SupabaseClient,
  session: Session,
  request: NextRequest,
  supabaseResponse: NextResponse
): Promise<NextResponse | null> {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("is_approved, role")
      .eq("id", session.user.id)
      .single()

    if (error) {
      console.error("User lookup error:", error.message)
      setCachedUserApproval(session.user.id, true, "Teacher")
      return supabaseResponse
    }

    if (!user) {
      return null
    }

    setCachedUserApproval(session.user.id, user.is_approved, user.role)

    if (!user.is_approved) {
      return NextResponse.redirect(new URL("/pending-approval", request.url))
    }

    const isAdminEmail = session.user.email === ADMIN_EMAIL
    const shouldRedirectToAdmin =
      (user.role === "Admin" || isAdminEmail) &&
      request.nextUrl.pathname === "/" &&
      !request.headers.get("referer")?.includes("/admin")

    if (shouldRedirectToAdmin) {
      return NextResponse.redirect(new URL("/admin", request.url))
    }

    return null
  } catch (dbError) {
    console.error("User lookup error:", (dbError as Error)?.message)
    setCachedUserApproval(session.user.id, true, "Teacher")
    return supabaseResponse
  }
}

async function handleAdminRouteAuth(
  supabase: SupabaseClient,
  session: Session,
  request: NextRequest,
  supabaseResponse: NextResponse
): Promise<NextResponse> {
  const isAdminEmail = session.user.email === ADMIN_EMAIL
  if (isAdminEmail) {
    return supabaseResponse
  }

  const cachedApproval = getCachedUserApproval(session.user.id)
  if (cachedApproval?.role === "Admin") {
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
    } else if (user?.role === "Admin") {
      setCachedUserApproval(session.user.id, user.is_approved, user.role)
      return supabaseResponse
    }
  } catch (dbError) {
    console.error("Admin check error:", (dbError as Error)?.message)
  }

  console.error("Unauthorized admin access attempt by:", session.user?.email)
  return NextResponse.redirect(new URL("/error?type=permission&message=Admin access required", request.url))
}

function createSupabaseClient(request: NextRequest, supabaseResponse: { current: NextResponse }) {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse.current = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.current.cookies.set(name, value, options))
      },
    },
  })
}

export async function updateSession(request: NextRequest) {
  const hasEnvVars = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!hasEnvVars) {
    return NextResponse.next({ request })
  }

  const pathname = request.nextUrl.pathname

  try {
    const supabaseResponse = { current: NextResponse.next({ request }) }

    let supabase: SupabaseClient
    try {
      supabase = createSupabaseClient(request, supabaseResponse)
    } catch (clientError) {
      console.error("[v0] Middleware: Supabase client creation error:", (clientError as Error)?.message)
      return NextResponse.redirect(new URL("/", request.url))
    }

    let session: Session | null = null
    try {
      const { data } = await supabase.auth.getSession()
      session = data.session
    } catch (error) {
      return handleSessionError(error as Error, request, supabaseResponse.current)
    }

    if (isAuthRoute(pathname) || isPublicRoute(pathname)) {
      return supabaseResponse.current
    }

    if (!session) {
      const returnTo = getValidReturnPath(request)
      return createLoginRedirect(request, returnTo)
    }

    const shouldCheckApproval =
      session.user && !pathname.startsWith("/admin") && pathname !== "/pending-approval"

    if (shouldCheckApproval) {
      const approvalResponse = await handleUserApprovalCheck(supabase, session, request, supabaseResponse.current)
      if (approvalResponse) {
        return approvalResponse
      }
    }

    if (pathname.startsWith("/admin")) {
      return handleAdminRouteAuth(supabase, session, request, supabaseResponse.current)
    }

    return supabaseResponse.current
  } catch (middlewareError) {
    console.error("[v0] Middleware: Unhandled error:", (middlewareError as Error)?.message)
    return AuthCookieService.createAuthErrorResponse(request, "server", "Server error occurred")
  }
}
