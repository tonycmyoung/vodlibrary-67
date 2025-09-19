import { type NextRequest, NextResponse } from "next/server"

// Centralized cookie management for authentication
export class AuthCookieService {
  // Standard Supabase auth cookie names
  private static readonly COOKIE_NAMES = {
    ACCESS_TOKEN: "sb-access-token",
    REFRESH_TOKEN: "sb-refresh-token",
    AUTH_TOKEN: "supabase-auth-token",
  } as const

  // Cookie options for secure handling
  private static readonly COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0, // For deletion
  }

  /**
   * Clear all authentication cookies from response
   */
  static clearAuthCookies(response: NextResponse): void {
    const cookieNames = Object.values(this.COOKIE_NAMES)

    cookieNames.forEach((name) => {
      response.cookies.set(name, "", {
        ...this.COOKIE_OPTIONS,
        expires: new Date(0), // Expire immediately
      })
    })

    // Also clear any domain-specific variants
    const domains = [".vercel.app", ".com.au"]
    domains.forEach((domain) => {
      cookieNames.forEach((name) => {
        response.cookies.set(name, "", {
          ...this.COOKIE_OPTIONS,
          domain,
          expires: new Date(0),
        })
      })
    })
  }

  /**
   * Check if request has any auth cookies
   */
  static hasAuthCookies(request: NextRequest): boolean {
    const cookieNames = Object.values(this.COOKIE_NAMES)
    return cookieNames.some((name) => request.cookies.has(name))
  }

  /**
   * Create response with cleared auth cookies and redirect
   */
  static createSignOutResponse(request: NextRequest, redirectTo = "/"): NextResponse {
    const redirectUrl = new URL(redirectTo, request.url)
    const response = NextResponse.redirect(redirectUrl)

    this.clearAuthCookies(response)

    // Add cache control headers to prevent caching of auth state
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    return response
  }

  /**
   * Create response with cleared auth cookies for error handling
   */
  static createAuthErrorResponse(request: NextRequest, errorType: string, message: string): NextResponse {
    const errorUrl = new URL(`/error?type=${errorType}&message=${encodeURIComponent(message)}`, request.url)
    const response = NextResponse.redirect(errorUrl)

    this.clearAuthCookies(response)

    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    return response
  }
}
