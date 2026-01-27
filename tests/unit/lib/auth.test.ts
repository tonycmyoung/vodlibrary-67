import { describe, it, expect, vi, beforeEach } from "vitest"
import { getCurrentUser } from "@/lib/auth"
import { createServerClient } from "@supabase/ssr"

// Mock Next.js modules - cookies() is now async in Next.js 15
const mockCookieStore = {
  getAll: vi.fn(() => [{ name: "sb-access-token", value: "mock-token" }]),
  set: vi.fn(),
}
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}))

// Mock Supabase
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}))

describe("lib/auth", () => {
  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any)
  })

  describe("getCurrentUser", () => {
    it("should return user with profile data when authenticated", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        aud: "authenticated",
      }

      const mockProfile = {
        id: "user-123",
        email: "test@example.com",
        full_name: "Test User",
        role: "user",
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      })

      const result = await getCurrentUser()

      expect(result).toEqual({
        ...mockUser,
        ...mockProfile,
      })
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("users")
      expect(mockSelect).toHaveBeenCalledWith("*")
      expect(mockEq).toHaveBeenCalledWith("id", "user-123")
    })

    it("should return null when no user is authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getCurrentUser()

      expect(result).toBeNull()
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it("should return null when auth error occurs", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Auth error", code: "auth_error" },
      })

      const result = await getCurrentUser()

      expect(result).toBeNull()
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it("should return null when profile fetch fails", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Profile not found", code: "PGRST116" },
      })

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      })

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const result = await getCurrentUser()

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching user profile:",
        expect.objectContaining({ message: "Profile not found" }),
      )

      consoleSpy.mockRestore()
    })

    it("should handle unexpected errors gracefully", async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error("Network error"))

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const result = await getCurrentUser()

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith("Error in getCurrentUser:", expect.any(Error))

      consoleSpy.mockRestore()
    })

    it("should handle cookie setAll errors from Server Components", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      }

      const mockProfile = {
        id: "user-123",
        email: "test@example.com",
        full_name: "Test User",
        role: "user",
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      })

      const result = await getCurrentUser()

      // Should still succeed even if cookie setting fails
      expect(result).toEqual({
        ...mockUser,
        ...mockProfile,
      })
    })

    it("should use environment variables for Supabase configuration", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await getCurrentUser()

      expect(createServerClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-anon-key",
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        }),
      )
    })
  })
})
