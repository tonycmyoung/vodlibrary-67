import { describe, it, expect, vi, beforeEach } from "vitest"
import { AuthCookieService } from "@/lib/auth/cookie-service"
import { type NextRequest, NextResponse } from "next/server"

describe("AuthCookieService", () => {
  let mockResponse: any
  let mockRequest: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock NextResponse with cookie management
    mockResponse = {
      cookies: {
        set: vi.fn(),
      },
      headers: new Map(),
    }

    // Mock NextRequest with cookies
    mockRequest = {
      url: "https://example.com/dashboard",
      cookies: {
        has: vi.fn(),
      },
    }
  })

  describe("clearAuthCookies", () => {
    it("should clear all auth cookies with correct options", () => {
      AuthCookieService.clearAuthCookies(mockResponse as unknown as NextResponse)

      // Should clear 3 main cookies
      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        "sb-access-token",
        "",
        expect.objectContaining({
          httpOnly: true,
          secure: false, // NODE_ENV is 'test'
          sameSite: "lax",
          path: "/",
          maxAge: 0,
          expires: expect.any(Date),
        }),
      )

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        "sb-refresh-token",
        "",
        expect.objectContaining({
          httpOnly: true,
          expires: expect.any(Date),
        }),
      )

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        "supabase-auth-token",
        "",
        expect.objectContaining({
          httpOnly: true,
          expires: expect.any(Date),
        }),
      )
    })

    it("should clear domain-specific cookie variants", () => {
      AuthCookieService.clearAuthCookies(mockResponse as unknown as NextResponse)

      // Should clear cookies for .vercel.app domain
      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        "sb-access-token",
        "",
        expect.objectContaining({
          domain: ".vercel.app",
          expires: expect.any(Date),
        }),
      )

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        "sb-refresh-token",
        "",
        expect.objectContaining({
          domain: ".vercel.app",
        }),
      )

      // Should clear cookies for .com.au domain
      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        "sb-access-token",
        "",
        expect.objectContaining({
          domain: ".com.au",
        }),
      )
    })

    it("should set cookies with immediate expiration date", () => {
      AuthCookieService.clearAuthCookies(mockResponse as unknown as NextResponse)

      const calls = mockResponse.cookies.set.mock.calls
      calls.forEach((call: any) => {
        const options = call[2]
        expect(options.expires).toBeInstanceOf(Date)
        expect(options.expires.getTime()).toBeLessThan(Date.now())
      })
    })

    it("should clear all authentication cookies with correct options", () => {
      AuthCookieService.clearAuthCookies(mockResponse as unknown as NextResponse)

      const calls = mockResponse.cookies.set.mock.calls
      // Should clear 3 base cookies + 3 cookies for each of 2 domains = 9 total
      expect(calls).toHaveLength(9)

      // Verify all calls have correct options structure
      calls.forEach((call: any) => {
        const options = call[2]
        expect(options).toHaveProperty("httpOnly", true)
        expect(options).toHaveProperty("sameSite", "lax")
        expect(options).toHaveProperty("path", "/")
        expect(options).toHaveProperty("maxAge", 0)
        expect(options.expires).toBeInstanceOf(Date)
      })
    })
  })

  describe("hasAuthCookies", () => {
    it("should return true when access token cookie exists", () => {
      mockRequest.cookies.has.mockImplementation((name: string) => name === "sb-access-token")

      const result = AuthCookieService.hasAuthCookies(mockRequest as unknown as NextRequest)

      expect(result).toBe(true)
      expect(mockRequest.cookies.has).toHaveBeenCalledWith("sb-access-token")
    })

    it("should return true when refresh token cookie exists", () => {
      mockRequest.cookies.has.mockImplementation((name: string) => name === "sb-refresh-token")

      const result = AuthCookieService.hasAuthCookies(mockRequest as unknown as NextRequest)

      expect(result).toBe(true)
    })

    it("should return true when auth token cookie exists", () => {
      mockRequest.cookies.has.mockImplementation((name: string) => name === "supabase-auth-token")

      const result = AuthCookieService.hasAuthCookies(mockRequest as unknown as NextRequest)

      expect(result).toBe(true)
    })

    it("should return false when no auth cookies exist", () => {
      mockRequest.cookies.has.mockReturnValue(false)

      const result = AuthCookieService.hasAuthCookies(mockRequest as unknown as NextRequest)

      expect(result).toBe(false)
      expect(mockRequest.cookies.has).toHaveBeenCalledWith("sb-access-token")
      expect(mockRequest.cookies.has).toHaveBeenCalledWith("sb-refresh-token")
      expect(mockRequest.cookies.has).toHaveBeenCalledWith("supabase-auth-token")
    })

    it("should return true when multiple auth cookies exist", () => {
      mockRequest.cookies.has.mockReturnValue(true)

      const result = AuthCookieService.hasAuthCookies(mockRequest as unknown as NextRequest)

      expect(result).toBe(true)
    })
  })

  describe("createSignOutResponse", () => {
    it("should create redirect response to default path", () => {
      const mockNextResponse = {
        headers: new Map(),
        cookies: {
          set: vi.fn(),
        },
      }

      vi.spyOn(NextResponse, "redirect").mockReturnValue(mockNextResponse as any)

      const result = AuthCookieService.createSignOutResponse(mockRequest as unknown as NextRequest)

      expect(NextResponse.redirect).toHaveBeenCalledWith(expect.objectContaining({ href: "https://example.com/" }))
      expect(result).toBeDefined()
    })

    it("should create redirect response to custom path", () => {
      const mockNextResponse = {
        headers: new Map(),
        cookies: {
          set: vi.fn(),
        },
      }

      vi.spyOn(NextResponse, "redirect").mockReturnValue(mockNextResponse as any)

      AuthCookieService.createSignOutResponse(mockRequest as unknown as NextRequest, "/auth/login")

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({ href: "https://example.com/auth/login" }),
      )
    })

    it("should set cache control headers", () => {
      const mockNextResponse = {
        headers: {
          set: vi.fn(),
        },
        cookies: {
          set: vi.fn(),
        },
      }

      vi.spyOn(NextResponse, "redirect").mockReturnValue(mockNextResponse as any)

      AuthCookieService.createSignOutResponse(mockRequest as unknown as NextRequest)

      expect(mockNextResponse.headers.set).toHaveBeenCalledWith("Cache-Control", "no-cache, no-store, must-revalidate")
      expect(mockNextResponse.headers.set).toHaveBeenCalledWith("Pragma", "no-cache")
      expect(mockNextResponse.headers.set).toHaveBeenCalledWith("Expires", "0")
    })

    it("should clear auth cookies on sign out response", () => {
      const mockNextResponse = {
        headers: {
          set: vi.fn(),
        },
        cookies: {
          set: vi.fn(),
        },
      }

      vi.spyOn(NextResponse, "redirect").mockReturnValue(mockNextResponse as any)

      AuthCookieService.createSignOutResponse(mockRequest as unknown as NextRequest)

      // Should have cleared all auth cookies (3 main + 6 domain-specific = 9 total)
      expect(mockNextResponse.cookies.set).toHaveBeenCalledTimes(9)
    })
  })

  describe("createAuthErrorResponse", () => {
    it("should create redirect to error page with type and message", () => {
      const mockNextResponse = {
        headers: {
          set: vi.fn(),
        },
        cookies: {
          set: vi.fn(),
        },
      }

      vi.spyOn(NextResponse, "redirect").mockReturnValue(mockNextResponse as any)

      AuthCookieService.createAuthErrorResponse(mockRequest as unknown as NextRequest, "session", "Session expired")

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: "https://example.com/error?type=session&message=Session%20expired",
        }),
      )
    })

    it("should encode error message in URL", () => {
      const mockNextResponse = {
        headers: {
          set: vi.fn(),
        },
        cookies: {
          set: vi.fn(),
        },
      }

      vi.spyOn(NextResponse, "redirect").mockReturnValue(mockNextResponse as any)

      AuthCookieService.createAuthErrorResponse(
        mockRequest as unknown as NextRequest,
        "auth",
        "Invalid token & special chars!",
      )

      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: expect.stringContaining("Invalid%20token%20%26%20special%20chars!"),
        }),
      )
    })

    it("should set cache control headers on error response", () => {
      const mockNextResponse = {
        headers: {
          set: vi.fn(),
        },
        cookies: {
          set: vi.fn(),
        },
      }

      vi.spyOn(NextResponse, "redirect").mockReturnValue(mockNextResponse as any)

      AuthCookieService.createAuthErrorResponse(mockRequest as unknown as NextRequest, "auth", "Error")

      expect(mockNextResponse.headers.set).toHaveBeenCalledWith("Cache-Control", "no-cache, no-store, must-revalidate")
      expect(mockNextResponse.headers.set).toHaveBeenCalledWith("Pragma", "no-cache")
      expect(mockNextResponse.headers.set).toHaveBeenCalledWith("Expires", "0")
    })

    it("should clear auth cookies on error response", () => {
      const mockNextResponse = {
        headers: {
          set: vi.fn(),
        },
        cookies: {
          set: vi.fn(),
        },
      }

      vi.spyOn(NextResponse, "redirect").mockReturnValue(mockNextResponse as any)

      AuthCookieService.createAuthErrorResponse(mockRequest as unknown as NextRequest, "permission", "Access denied")

      // Should have cleared all auth cookies
      expect(mockNextResponse.cookies.set).toHaveBeenCalledTimes(9)
    })
  })
})
