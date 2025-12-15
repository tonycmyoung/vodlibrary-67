import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { updateSession } from "@/lib/supabase/middleware"
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { AuthCookieService } from "@/lib/auth/cookie-service"
import { validateReturnTo } from "@/lib/utils/auth"

// Mock dependencies
vi.mock("@supabase/ssr")
vi.mock("@/lib/auth/cookie-service")
vi.mock("@/lib/utils/auth")

describe("Middleware: updateSession", () => {
  let mockSupabaseClient: any
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    vi.clearAllMocks()

    // Store and set up environment
    originalEnv = { ...process.env }
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"

    mockSupabaseClient = {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      })),
    }

    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient)

    vi.mocked(validateReturnTo).mockImplementation((path: string) => path)

    vi.mocked(AuthCookieService.createAuthErrorResponse).mockImplementation(
      (request: NextRequest, type: string, message: string) => {
        const url = new URL(`/error?type=${type}&message=${encodeURIComponent(message)}`, request.url)
        return NextResponse.redirect(url)
      },
    )

    vi.mocked(AuthCookieService.createSignOutResponse).mockImplementation((request: NextRequest, redirectTo = "/") => {
      const url = new URL(redirectTo, request.url)
      return NextResponse.redirect(url)
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  function createMockRequest(path: string, options: { referer?: string; cookies?: string } = {}): NextRequest {
    const url = `https://example.com${path}`
    const headers = new Headers()

    if (options.referer) {
      headers.set("referer", options.referer)
    }

    if (options.cookies) {
      headers.set("cookie", options.cookies)
    }

    const request = new NextRequest(url, { headers })
    return request
  }

  describe("Environment Variable Checks", () => {
    it("should skip middleware when SUPABASE_URL is missing", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      const request = createMockRequest("/dashboard")

      const result = await updateSession(request)

      expect(createServerClient).not.toHaveBeenCalled()
      expect(result).toBeInstanceOf(NextResponse)
    })

    it("should skip middleware when ANON_KEY is missing", async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const request = createMockRequest("/dashboard")

      const result = await updateSession(request)

      expect(createServerClient).not.toHaveBeenCalled()
    })

    it("should proceed when both env vars are present", async () => {
      const request = createMockRequest("/")

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      await updateSession(request)

      expect(createServerClient).toHaveBeenCalled()
    })
  })

  describe("Public and Auth Routes", () => {
    it("should allow /pending-approval without session", async () => {
      const request = createMockRequest("/pending-approval")

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const result = await updateSession(request)

      expect(result).toBeInstanceOf(NextResponse)
      expect(result.status).not.toBe(307)
    })

    it("should allow /setup-admin without session", async () => {
      const request = createMockRequest("/setup-admin")

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const result = await updateSession(request)

      expect(result).toBeInstanceOf(NextResponse)
      expect(result.status).not.toBe(307)
    })

    it("should allow auth routes without session", async () => {
      const authRoutes = ["/auth/login", "/auth/sign-up", "/auth/callback", "/auth/confirm", "/auth/reset-password"]

      for (const route of authRoutes) {
        const request = createMockRequest(route)

        mockSupabaseClient.auth.getSession.mockResolvedValue({
          data: { session: null },
          error: null,
        })

        const result = await updateSession(request)
        expect(result.status).not.toBe(307)
      }
    })
  })

  describe("Protected Routes - Unauthenticated", () => {
    it("should redirect to login for protected routes without session", async () => {
      const request = createMockRequest("/dashboard")

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      vi.mocked(validateReturnTo).mockReturnValue("/dashboard")

      const result = await updateSession(request)

      expect(result.status).toBe(307)
      expect(result.headers.get("location")).toContain("/auth/login")
      expect(result.headers.get("location")).toContain("returnTo=%2Fdashboard")
    })

    it("should redirect without returnTo when path is invalid", async () => {
      const request = createMockRequest("/some-path")

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      vi.mocked(validateReturnTo).mockReturnValue(null)

      const result = await updateSession(request)

      expect(result.status).toBe(307)
      expect(result.headers.get("location")).toContain("/auth/login")
      expect(result.headers.get("location")).not.toContain("returnTo")
    })
  })

  describe("Session Error Handling", () => {
    it("should handle rate limit errors", async () => {
      const request = createMockRequest("/dashboard")

      mockSupabaseClient.auth.getSession.mockRejectedValue(new Error("Too Many Requests"))

      const result = await updateSession(request)

      expect(AuthCookieService.createAuthErrorResponse).toHaveBeenCalledWith(
        expect.any(NextRequest),
        "session",
        "Session expired",
      )
    })

    it("should handle invalid refresh token errors", async () => {
      const request = createMockRequest("/dashboard")

      mockSupabaseClient.auth.getSession.mockRejectedValue(new Error("Invalid Refresh Token: Token expired"))

      const result = await updateSession(request)

      expect(AuthCookieService.createAuthErrorResponse).toHaveBeenCalled()
    })

    it("should allow auth routes through even on session errors", async () => {
      const request = createMockRequest("/auth/login")

      mockSupabaseClient.auth.getSession.mockRejectedValue(new Error("Session error"))

      const result = await updateSession(request)

      expect(result.status).not.toBe(307)
      expect(AuthCookieService.createAuthErrorResponse).not.toHaveBeenCalled()
    })
  })

  describe("User Approval Status", () => {
    it("should redirect unapproved users to pending-approval", async () => {
      const request = createMockRequest("/dashboard")

      const mockSession = {
        user: { id: "user-123", email: "test@example.com" },
        access_token: "token",
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { is_approved: false, role: "Student" },
          error: null,
        }),
      })

      const result = await updateSession(request)

      expect(result.status).toBe(307)
      expect(result.headers.get("location")).toContain("/pending-approval")
    })

    it("should allow approved users through", async () => {
      const request = createMockRequest("/dashboard")

      const mockSession = {
        user: { id: "user-123", email: "test@example.com" },
        access_token: "token",
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { is_approved: true, role: "Student" },
          error: null,
        }),
      })

      const result = await updateSession(request)

      expect(result.status).not.toBe(307)
    })

    it("should handle user lookup errors with fallback", async () => {
      const request = createMockRequest("/dashboard")

      const mockSession = {
        user: { id: "user-123", email: "test@example.com" },
        access_token: "token",
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      })

      const result = await updateSession(request)

      // Should allow through with fallback
      expect(result).toBeInstanceOf(NextResponse)
    })
  })

  describe("Admin Route Protection", () => {
    it("should allow admin email through to admin routes", async () => {
      const request = createMockRequest("/admin")

      const mockSession = {
        user: { id: "admin-123", email: "acmyma@gmail.com" },
        access_token: "token",
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const result = await updateSession(request)

      expect(result.status).not.toBe(307)
    })

    it("should allow users with Admin role through to admin routes", async () => {
      const request = createMockRequest("/admin")

      const mockSession = {
        user: { id: "user-123", email: "admin@example.com" },
        access_token: "token",
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Admin", is_approved: true },
          error: null,
        }),
      })

      const result = await updateSession(request)

      expect(result.status).not.toBe(307)
    })

    it("should redirect non-admin users from admin routes", async () => {
      const request = createMockRequest("/admin")

      const mockSession = {
        user: { id: "user-123", email: "student@example.com" },
        access_token: "token",
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Student", is_approved: true },
          error: null,
        }),
      })

      const result = await updateSession(request)

      expect(result.status).toBe(307)
      expect(result.headers.get("location")).toContain("/error")
      expect(result.headers.get("location")).toContain("type=permission")
    })

    it("should handle admin lookup errors by denying access", async () => {
      const request = createMockRequest("/admin")

      const mockSession = {
        user: { id: "user-123", email: "test@example.com" },
        access_token: "token",
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      })

      const result = await updateSession(request)

      expect(result.status).toBe(307)
      expect(result.headers.get("location")).toContain("/error")
    })
  })

  describe("Admin Auto-Redirect", () => {
    it("should redirect Admin users from / to /admin", async () => {
      const request = createMockRequest("/", { referer: "https://example.com/other" })

      const mockSession = {
        user: { id: "user-123", email: "admin@example.com" },
        access_token: "token",
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Admin", is_approved: true },
          error: null,
        }),
      })

      const result = await updateSession(request)

      expect(result.status).toBe(307)
      expect(result.headers.get("location")).toContain("/admin")
    })

    it("should not redirect Admin from / if coming from /admin (prevent loop)", async () => {
      const request = createMockRequest("/", { referer: "https://example.com/admin" })

      const mockSession = {
        user: { id: "user-123", email: "admin@example.com" },
        access_token: "token",
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Admin", is_approved: true },
          error: null,
        }),
      })

      const result = await updateSession(request)

      expect(result.status).not.toBe(307)
    })
  })

  describe("Supabase Client Creation Errors", () => {
    it("should handle Supabase client creation errors", async () => {
      vi.mocked(createServerClient).mockImplementation(() => {
        throw new Error("Client creation failed")
      })

      const request = createMockRequest("/dashboard")
      const result = await updateSession(request)

      expect(result.status).toBe(307)
      expect(result.headers.get("location")).toContain("/")
    })
  })

  describe("Unhandled Middleware Errors", () => {
    it("should handle unexpected errors in middleware", async () => {
      const request = createMockRequest("/dashboard")

      mockSupabaseClient.auth.getSession.mockImplementation(() => {
        throw new Error("Unexpected error")
      })

      const result = await updateSession(request)

      expect(AuthCookieService.createAuthErrorResponse).toHaveBeenCalledWith(
        expect.any(NextRequest),
        "server",
        "Server error occurred",
      )
    })
  })
})
