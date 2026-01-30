import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  fetchTraceLogs,
  clearTraceLogs,
  fetchTraceSettings,
  updateTraceSettings,
  getTraceCategories,
  getTraceSourceFiles,
  formatTraceLogsForClipboard,
} from "@/lib/actions/trace"
import { createClient } from "@supabase/supabase-js"
import { getCurrentUser } from "@/lib/auth"

// Mock Next.js modules
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}))

// Mock auth
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}))

describe("Trace Actions", () => {
  const mockServiceClient = {
    from: vi.fn(),
  }

  const mockAdminUser = {
    id: "admin-123",
    email: "admin@test.com",
    role: "Admin",
    is_approved: true,
  }

  const mockNonAdminUser = {
    id: "user-123",
    email: "user@test.com",
    role: "Student",
    is_approved: true,
  }

  const mockTraceLogs = [
    {
      id: "log-1",
      created_at: "2024-01-15T10:00:00Z",
      source_file: "components/test.tsx",
      source_line: 42,
      function_name: "handleClick",
      level: "info",
      category: "auth",
      message: "User logged in",
      payload: { userId: "123" },
      user_id: "user-123",
      user_email: "user@test.com",
      session_id: null,
      request_id: null,
      environment: "development",
      user_agent: null,
      ip_address: null,
    },
    {
      id: "log-2",
      created_at: "2024-01-15T09:00:00Z",
      source_file: "lib/actions/auth.ts",
      source_line: 100,
      function_name: "signIn",
      level: "error",
      category: "auth",
      message: "Authentication failed",
      payload: { error: "Invalid credentials" },
      user_id: null,
      user_email: "test@test.com",
      session_id: null,
      request_id: null,
      environment: "development",
      user_agent: null,
      ip_address: null,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockReturnValue(mockServiceClient as any)
  })

  describe("fetchTraceLogs", () => {
    it("should fetch trace logs for admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as any)

      const mockLimit = vi.fn().mockResolvedValue({ data: mockTraceLogs, error: null })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
      } as any)

      const result = await fetchTraceLogs()

      expect(result).toEqual(mockTraceLogs)
      expect(mockServiceClient.from).toHaveBeenCalledWith("trace_logs")
      expect(mockSelect).toHaveBeenCalledWith("*")
      expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false })
      expect(mockLimit).toHaveBeenCalledWith(200)
    })

    it("should apply level filter", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as any)

      const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockEq = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockOrder = vi.fn().mockReturnValue({ eq: mockEq })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
      } as any)

      await fetchTraceLogs({ level: "error" })

      expect(mockEq).toHaveBeenCalledWith("level", "error")
    })

    it("should apply search filter", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as any)

      const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockOr = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockOrder = vi.fn().mockReturnValue({ or: mockOr })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
      } as any)

      await fetchTraceLogs({ search: "test" })

      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining("message.ilike.%test%")
      )
    })

    it("should throw error for non-admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockNonAdminUser as any)

      await expect(fetchTraceLogs()).rejects.toThrow("Unauthorized")
      expect(mockServiceClient.from).not.toHaveBeenCalled()
    })

    it("should throw error when database query fails", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as any)

      const mockLimit = vi.fn().mockResolvedValue({ data: null, error: { message: "Query failed" } })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
      } as any)

      await expect(fetchTraceLogs()).rejects.toThrow("Failed to fetch trace logs")
    })
  })

  describe("clearTraceLogs", () => {
    it("should clear all trace logs for admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as any)

      const mockNeq = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnValue({ neq: mockNeq })

      mockServiceClient.from.mockReturnValue({
        delete: mockDelete,
      } as any)

      await clearTraceLogs()

      expect(mockServiceClient.from).toHaveBeenCalledWith("trace_logs")
      expect(mockDelete).toHaveBeenCalled()
      expect(mockNeq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000")
    })

    it("should clear logs before specific date", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as any)

      const mockLt = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnValue({ lt: mockLt })

      mockServiceClient.from.mockReturnValue({
        delete: mockDelete,
      } as any)

      const beforeDate = "2024-01-01T00:00:00Z"
      await clearTraceLogs(beforeDate)

      expect(mockLt).toHaveBeenCalledWith("created_at", beforeDate)
    })

    it("should throw error for non-admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockNonAdminUser as any)

      await expect(clearTraceLogs()).rejects.toThrow("Unauthorized")
    })

    it("should throw error when delete fails", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as any)

      const mockNeq = vi.fn().mockResolvedValue({ error: { message: "Delete failed" } })
      const mockDelete = vi.fn().mockReturnValue({ neq: mockNeq })

      mockServiceClient.from.mockReturnValue({
        delete: mockDelete,
      } as any)

      await expect(clearTraceLogs()).rejects.toThrow("Failed to clear trace logs")
    })
  })

  describe("fetchTraceSettings", () => {
    it("should fetch trace settings for admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as any)

      const mockSettings = { id: "default", enabled: true, retention_days: 7 }
      const mockSingle = vi.fn().mockResolvedValue({ data: mockSettings, error: null })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
      } as any)

      const result = await fetchTraceSettings()

      expect(result).toEqual(mockSettings)
      expect(mockServiceClient.from).toHaveBeenCalledWith("trace_settings")
      expect(mockEq).toHaveBeenCalledWith("id", "default")
    })

    it("should return default settings when not found", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as any)

      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
      } as any)

      const result = await fetchTraceSettings()

      expect(result).toEqual({
        id: "default",
        enabled: true,
        retention_days: 7,
        updated_at: expect.any(String),
      })
    })

    it("should throw error for non-admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockNonAdminUser as any)

      await expect(fetchTraceSettings()).rejects.toThrow("Unauthorized")
    })
  })

  describe("updateTraceSettings", () => {
    it("should update trace settings for admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as any)

      const mockUpsert = vi.fn().mockResolvedValue({ error: null })

      mockServiceClient.from.mockReturnValue({
        upsert: mockUpsert,
      } as any)

      await updateTraceSettings({ enabled: false, retention_days: 14 })

      expect(mockUpsert).toHaveBeenCalledWith({
        id: "default",
        enabled: false,
        retention_days: 14,
        updated_at: expect.any(String),
      })
    })

    it("should throw error for non-admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockNonAdminUser as any)

      await expect(updateTraceSettings({ enabled: false })).rejects.toThrow("Unauthorized")
    })

    it("should throw error when update fails", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as any)

      const mockUpsert = vi.fn().mockResolvedValue({ error: { message: "Update failed" } })

      mockServiceClient.from.mockReturnValue({
        upsert: mockUpsert,
      } as any)

      await expect(updateTraceSettings({ enabled: false })).rejects.toThrow(
        "Failed to update trace settings"
      )
    })
  })

  describe("getTraceCategories", () => {
    it("should return unique categories for admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as any)

      const mockData = [{ category: "auth" }, { category: "video" }, { category: "auth" }, { category: null }]
      const mockNot = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const mockSelect = vi.fn().mockReturnValue({ not: mockNot })

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
      } as any)

      const result = await getTraceCategories()

      expect(result).toEqual(["auth", "video"])
      expect(mockSelect).toHaveBeenCalledWith("category")
    })

    it("should throw error for non-admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockNonAdminUser as any)

      await expect(getTraceCategories()).rejects.toThrow("Unauthorized")
    })

    it("should return empty array on error", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as any)

      const mockNot = vi.fn().mockResolvedValue({ data: null, error: { message: "Query failed" } })
      const mockSelect = vi.fn().mockReturnValue({ not: mockNot })

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
      } as any)

      const result = await getTraceCategories()

      expect(result).toEqual([])
    })
  })

  describe("getTraceSourceFiles", () => {
    it("should return unique source files for admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockAdminUser as any)

      const mockData = [
        { source_file: "components/test.tsx" },
        { source_file: "lib/auth.ts" },
        { source_file: "components/test.tsx" },
      ]
      const mockSelect = vi.fn().mockResolvedValue({ data: mockData, error: null })

      mockServiceClient.from.mockReturnValue({
        select: mockSelect,
      } as any)

      const result = await getTraceSourceFiles()

      expect(result).toEqual(["components/test.tsx", "lib/auth.ts"])
    })

    it("should throw error for non-admin user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockNonAdminUser as any)

      await expect(getTraceSourceFiles()).rejects.toThrow("Unauthorized")
    })
  })

  describe("formatTraceLogsForClipboard", () => {
    it("should format logs as JSON", () => {
      const result = formatTraceLogsForClipboard(mockTraceLogs as any)
      const parsed = JSON.parse(result)

      expect(parsed).toHaveLength(2)
      expect(parsed[0]).toEqual({
        timestamp: "2024-01-15T10:00:00Z",
        level: "info",
        source: "components/test.tsx:42 (handleClick)",
        category: "auth",
        message: "User logged in",
        payload: { userId: "123" },
        environment: "development",
        user: "user@test.com",
      })
    })

    it("should handle logs without optional fields", () => {
      const minimalLog = {
        id: "log-3",
        created_at: "2024-01-15T08:00:00Z",
        source_file: "test.ts",
        source_line: null,
        function_name: null,
        level: "debug",
        category: null,
        message: "Test",
        payload: null,
        user_id: null,
        user_email: null,
        session_id: null,
        request_id: null,
        environment: "development",
        user_agent: null,
        ip_address: null,
      }

      const result = formatTraceLogsForClipboard([minimalLog as any])
      const parsed = JSON.parse(result)

      expect(parsed[0].source).toBe("test.ts")
      expect(parsed[0].user).toBeNull()
    })

    it("should return empty array for no logs", () => {
      const result = formatTraceLogsForClipboard([])
      expect(JSON.parse(result)).toEqual([])
    })
  })
})
