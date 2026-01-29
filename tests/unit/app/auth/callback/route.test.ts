import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "@/app/auth/callback/route"
import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

// Mock Supabase
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}))

describe("Auth Callback Route", () => {
  const mockSupabaseClient = {
    auth: {
      exchangeCodeForSession: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any)
  })

  function createMockRequest(url: string): NextRequest {
    return new NextRequest(new URL(url, "https://example.com"))
  }

  describe("error handling", () => {
    it("should redirect to login with expired error when error is access_denied with expired description", async () => {
      const request = createMockRequest("/auth/callback?error=access_denied&error_description=Link%20expired")

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toContain("/auth/login?error=expired")
    })

    it("should redirect to login with auth_failed error for other errors", async () => {
      const request = createMockRequest("/auth/callback?error=server_error")

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toContain("/auth/login?error=auth_failed")
    })
  })

  describe("missing code", () => {
    it("should redirect to login when no code is provided", async () => {
      const request = createMockRequest("/auth/callback")

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toContain("/auth/login")
    })
  })

  describe("code exchange", () => {
    it("should redirect to login with exchange_failed error when exchange fails", async () => {
      const request = createMockRequest("/auth/callback?code=valid-code")

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Exchange failed" },
      })

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toContain("/auth/login?error=exchange_failed")
    })

    it("should redirect to login when no session user is returned", async () => {
      const request = createMockRequest("/auth/callback?code=valid-code")

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toContain("/auth/login")
    })
  })

  describe("successful authentication", () => {
    it("should redirect to home for existing users", async () => {
      const request = createMockRequest("/auth/callback?code=valid-code")

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: {
          session: {
            user: { id: "user-123", email: "test@example.com" },
            access_token: "access-token",
            refresh_token: "refresh-token",
          },
        },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "user-123", is_approved: true },
          error: null,
        }),
      })

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            access_token: "access-token",
            refresh_token: "refresh-token",
          },
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toBe("https://example.com/")
    })

    it("should redirect to sign-up with invited=true for new users", async () => {
      const request = createMockRequest("/auth/callback?code=valid-code")

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: {
          session: {
            user: { id: "user-123", email: "test@example.com" },
            access_token: "access-token",
            refresh_token: "refresh-token",
          },
        },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      })

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            access_token: "access-token",
            refresh_token: "refresh-token",
          },
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toBe("https://example.com/auth/sign-up?invited=true")
    })

    it("should set session cookies when session is available", async () => {
      const request = createMockRequest("/auth/callback?code=valid-code")

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: {
          session: {
            user: { id: "user-123", email: "test@example.com" },
            access_token: "access-token",
            refresh_token: "refresh-token",
          },
        },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "user-123", is_approved: true },
          error: null,
        }),
      })

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            access_token: "test-access-token",
            refresh_token: "test-refresh-token",
          },
        },
      })

      const response = await GET(request)

      // Verify cookies are set
      const cookies = response.cookies.getAll()
      const accessToken = cookies.find((c) => c.name === "sb-access-token")
      const refreshToken = cookies.find((c) => c.name === "sb-refresh-token")

      expect(accessToken).toBeDefined()
      expect(accessToken?.value).toBe("test-access-token")
      expect(refreshToken).toBeDefined()
      expect(refreshToken?.value).toBe("test-refresh-token")
    })

    it("should not set cookies when session is not available after exchange", async () => {
      const request = createMockRequest("/auth/callback?code=valid-code")

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: {
          session: {
            user: { id: "user-123", email: "test@example.com" },
            access_token: "access-token",
            refresh_token: "refresh-token",
          },
        },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "user-123", is_approved: true },
          error: null,
        }),
      })

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: {
          session: null,
        },
      })

      const response = await GET(request)

      const cookies = response.cookies.getAll()
      const accessToken = cookies.find((c) => c.name === "sb-access-token")
      const refreshToken = cookies.find((c) => c.name === "sb-refresh-token")

      expect(accessToken).toBeUndefined()
      expect(refreshToken).toBeUndefined()
    })
  })

  describe("error catching", () => {
    it("should redirect to login with callback_failed error when an exception occurs", async () => {
      const request = createMockRequest("/auth/callback?code=valid-code")

      mockSupabaseClient.auth.exchangeCodeForSession.mockRejectedValue(new Error("Unexpected error"))

      const response = await GET(request)

      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toContain("/auth/login?error=callback_failed")
    })
  })
})
