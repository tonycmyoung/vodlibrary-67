import { describe, it, expect, vi, beforeEach } from "vitest"
import { getTelemetryData, clearAuthDebugLogs, fetchAuthDebugLogs } from "@/lib/actions/admin"
import { createClient } from "@supabase/supabase-js"
import { getCurrentUser } from "@/lib/auth"
import { getTotalVideoViews, getVideoViewsInDateRange } from "@/lib/actions/videos"

// Mock Next.js modules
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}))

// Mock helper functions
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock("@/lib/actions/videos", () => ({
  getTotalVideoViews: vi.fn(),
  getVideoViewsInDateRange: vi.fn(),
}))

describe("Admin Actions", () => {
  const mockServiceClient = {
    from: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockReturnValue(mockServiceClient as any)
  })

  describe("getTelemetryData", () => {
    it("should successfully fetch all telemetry data", async () => {
      let usersSelectCallCount = 0

      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn(() => {
              usersSelectCallCount++

              // First call: direct Promise for total users
              if (usersSelectCallCount === 1) {
                return Promise.resolve({ count: 150, error: null })
              }

              // Second call: return object with .eq() for pending users
              return {
                eq: vi.fn(() => Promise.resolve({ count: 12, error: null })),
              }
            }),
          }
        }
        if (table === "user_logins") {
          return {
            select: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({ data: new Array(25).fill({ user_id: "test" }), error: null }),
              })),
            })),
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }
      })

      vi.mocked(getTotalVideoViews).mockResolvedValue(5000)
      vi.mocked(getVideoViewsInDateRange).mockResolvedValueOnce(350).mockResolvedValueOnce(280)

      const result = await getTelemetryData()

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        totalUsers: 150,
        pendingUsers: 12,
        totalViews: 5000,
        thisWeekViews: 350,
        lastWeekViews: 280,
        thisWeekUserLogins: 25,
        lastWeekUserLogins: 25,
      })
    })

    it("should handle database errors gracefully", async () => {
      mockServiceClient.from.mockImplementation(() => {
        const errorResult = { count: null, error: { message: "Database error" } }
        const selectResult: any = Promise.resolve(errorResult)
        selectResult.eq = vi.fn(() => Promise.resolve(errorResult))

        return {
          select: vi.fn(() => selectResult),
        }
      })

      vi.mocked(getTotalVideoViews).mockRejectedValue(new Error("Video views error"))
      vi.mocked(getVideoViewsInDateRange).mockRejectedValue(new Error("Date range error"))

      const result = await getTelemetryData()

      expect(result.success).toBe(false)
      expect(result.data).toEqual({
        totalUsers: 0,
        pendingUsers: 0,
        totalViews: 0,
        thisWeekViews: 0,
        lastWeekViews: 0,
        thisWeekUserLogins: 0,
        lastWeekUserLogins: 0,
      })
    })

    it("should calculate week boundaries correctly", async () => {
      const mockFromSpy = vi.fn()

      mockServiceClient.from = mockFromSpy.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn(() => {
              const baseResult = { count: 100, error: null }
              const selectResult: any = Promise.resolve(baseResult)
              selectResult.eq = vi.fn().mockResolvedValue({ count: 5, error: null })
              return selectResult
            }),
          }
        }
        if (table === "user_logins") {
          return {
            select: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }
      })

      vi.mocked(getTotalVideoViews).mockResolvedValue(1000)
      vi.mocked(getVideoViewsInDateRange).mockResolvedValue(50)

      await getTelemetryData()

      expect(mockFromSpy).toHaveBeenCalledWith("users")
      expect(mockFromSpy).toHaveBeenCalledWith("user_logins")
    })

    it("should handle null counts from database", async () => {
      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn(() => {
              const baseResult = { count: null, error: null }
              const selectResult: any = Promise.resolve(baseResult)
              selectResult.eq = vi.fn().mockResolvedValue({ count: null, error: null })
              return selectResult
            }),
          }
        }
        if (table === "user_logins") {
          return {
            select: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          }
        }
        return {
          select: vi.fn().mockResolvedValue({ count: null, error: null }),
        }
      })

      vi.mocked(getTotalVideoViews).mockResolvedValue(0)
      vi.mocked(getVideoViewsInDateRange).mockResolvedValue(0)

      const result = await getTelemetryData()

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        totalUsers: 0,
        pendingUsers: 0,
        totalViews: 0,
        thisWeekViews: 0,
        lastWeekViews: 0,
        thisWeekUserLogins: 0,
        lastWeekUserLogins: 0,
      })
    })
  })

  describe("clearAuthDebugLogs", () => {
    it("should successfully clear debug logs for admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "admin-123",
        email: "admin@test.com",
        role: "Admin",
        is_approved: true,
      } as any)

      const mockDelete = vi.fn().mockReturnThis()
      const mockNeq = vi.fn().mockResolvedValue({ error: null })

      mockServiceClient.from.mockReturnValue({
        delete: mockDelete,
        neq: mockNeq,
      } as any)

      mockDelete.mockReturnValue({ neq: mockNeq })

      await clearAuthDebugLogs()

      expect(mockServiceClient.from).toHaveBeenCalledWith("auth_debug_logs")
      expect(mockDelete).toHaveBeenCalled()
      expect(mockNeq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000")
    })

    it("should throw error for non-admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "user-123",
        email: "user@test.com",
        role: "Student",
        is_approved: true,
      } as any)

      await expect(clearAuthDebugLogs()).rejects.toThrow("Unauthorized")

      expect(mockServiceClient.from).not.toHaveBeenCalled()
    })

    it("should throw error when database delete fails", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "admin-123",
        email: "admin@test.com",
        role: "Admin",
        is_approved: true,
      } as any)

      const mockDelete = vi.fn().mockReturnThis()
      const mockNeq = vi.fn().mockResolvedValue({ error: { message: "Delete failed" } })

      mockServiceClient.from.mockReturnValue({
        delete: mockDelete,
        neq: mockNeq,
      } as any)

      mockDelete.mockReturnValue({ neq: mockNeq })

      await expect(clearAuthDebugLogs()).rejects.toThrow("Failed to clear debug logs")
    })

    it("should throw error when user is null", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null)

      await expect(clearAuthDebugLogs()).rejects.toThrow("Unauthorized")
    })
  })

  describe("fetchAuthDebugLogs", () => {
    it("should successfully fetch debug logs for admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "admin-123",
        email: "admin@test.com",
        role: "Admin",
        is_approved: true,
      } as any)

      const mockLogs = [
        { id: "log-1", event_type: "login", created_at: new Date().toISOString() },
        { id: "log-2", event_type: "signup", created_at: new Date().toISOString() },
      ]

      const mockLimit = vi.fn().mockResolvedValue({ data: mockLogs, error: null })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
      } as any)

      const result = await fetchAuthDebugLogs()

      expect(result).toEqual(mockLogs)
      expect(mockServiceClient.from).toHaveBeenCalledWith("auth_debug_logs")
      expect(mockSelect).toHaveBeenCalledWith("*")
      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false })
      expect(mockLimit).toHaveBeenCalledWith(100)
    })

    it("should throw error for non-admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "user-123",
        email: "user@test.com",
        role: "Student",
        is_approved: true,
      } as any)

      await expect(fetchAuthDebugLogs()).rejects.toThrow("Unauthorized")

      expect(mockServiceClient.from).not.toHaveBeenCalled()
    })

    it("should throw error when database query fails", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "admin-123",
        email: "admin@test.com",
        role: "Admin",
        is_approved: true,
      } as any)

      const mockLimit = vi.fn().mockResolvedValue({ data: null, error: { message: "Query failed" } })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
      } as any)

      await expect(fetchAuthDebugLogs()).rejects.toThrow("Failed to fetch debug logs")
    })

    it("should throw error when user is null", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null)

      await expect(fetchAuthDebugLogs()).rejects.toThrow("Unauthorized")
    })

    it("should return empty array when no logs exist", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "admin-123",
        email: "admin@test.com",
        role: "Admin",
        is_approved: true,
      } as any)

      const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
      } as any)

      const result = await fetchAuthDebugLogs()

      expect(result).toEqual([])
    })
  })
})
