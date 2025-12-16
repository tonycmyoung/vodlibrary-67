import { describe, it, expect, vi, beforeEach } from "vitest"
import { logAuditEvent, fetchAuditLogs, clearAuditLogs } from "@/lib/actions/audit"
import { createClient } from "@supabase/supabase-js"

// Mock Supabase client
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}))

describe("audit.ts", () => {
  let mockSupabaseClient: any
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Set up environment variables
    process.env.SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"

    // Spy on console.error
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    // Create mock Supabase client
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
    }

    vi.mocked(createClient).mockReturnValue(mockSupabaseClient)
  })

  describe("logAuditEvent", () => {
    it("should successfully log an audit event with all fields", async () => {
      mockSupabaseClient.insert.mockResolvedValue({ data: null, error: null })

      await logAuditEvent({
        actor_id: "user-123",
        actor_email: "actor@example.com",
        action: "user_approval",
        target_id: "target-456",
        target_email: "target@example.com",
        additional_data: { reason: "Approved by admin" },
      })

      expect(createClient).toHaveBeenCalledWith("https://test.supabase.co", "test-service-role-key")
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("audit_logs")
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        actor_id: "user-123",
        actor_email: "actor@example.com",
        action: "user_approval",
        target_id: "target-456",
        target_email: "target@example.com",
        additional_data: { reason: "Approved by admin" },
      })
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it("should log audit event with minimal required fields", async () => {
      mockSupabaseClient.insert.mockResolvedValue({ data: null, error: null })

      await logAuditEvent({
        actor_id: "user-123",
        actor_email: "actor@example.com",
        action: "user_signup",
      })

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        actor_id: "user-123",
        actor_email: "actor@example.com",
        action: "user_signup",
        target_id: null,
        target_email: null,
        additional_data: null,
      })
    })

    it("should handle database insertion errors gracefully", async () => {
      const dbError = { message: "Database connection failed" }
      mockSupabaseClient.insert.mockResolvedValue({ data: null, error: dbError })

      // Should not throw
      await expect(
        logAuditEvent({
          actor_id: "user-123",
          actor_email: "actor@example.com",
          action: "user_deletion",
        }),
      ).resolves.not.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith("[v0] Failed to log audit event:", dbError)
    })

    it("should handle exceptions gracefully", async () => {
      const exception = new Error("Network error")
      mockSupabaseClient.insert.mockRejectedValue(exception)

      // Should not throw
      await expect(
        logAuditEvent({
          actor_id: "user-123",
          actor_email: "actor@example.com",
          action: "password_reset",
        }),
      ).resolves.not.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith("[v0] Error in logAuditEvent:", exception)
    })

    it("should support all action types", async () => {
      mockSupabaseClient.insert.mockResolvedValue({ data: null, error: null })

      const actions: Array<"user_signup" | "user_approval" | "user_deletion" | "user_invitation" | "password_reset"> = [
        "user_signup",
        "user_approval",
        "user_deletion",
        "user_invitation",
        "password_reset",
      ]

      for (const action of actions) {
        await logAuditEvent({
          actor_id: "user-123",
          actor_email: "actor@example.com",
          action,
        })

        expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            action,
          }),
        )
      }
    })
  })

  describe("fetchAuditLogs", () => {
    it("should fetch audit logs successfully", async () => {
      const mockLogs = [
        {
          id: "1",
          actor_id: "user-123",
          actor_email: "actor@example.com",
          action: "user_approval",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          actor_id: "user-456",
          actor_email: "admin@example.com",
          action: "user_deletion",
          created_at: "2024-01-02T00:00:00Z",
        },
      ]

      mockSupabaseClient.limit.mockResolvedValue({ data: mockLogs, error: null })

      const result = await fetchAuditLogs()

      expect(createClient).toHaveBeenCalledWith("https://test.supabase.co", "test-service-role-key")
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("audit_logs")
      expect(mockSupabaseClient.select).toHaveBeenCalledWith("*")
      expect(mockSupabaseClient.order).toHaveBeenCalledWith("created_at", { ascending: false })
      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(100)
      expect(result).toEqual(mockLogs)
    })

    it("should return empty array when no logs exist", async () => {
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null })

      const result = await fetchAuditLogs()

      expect(result).toEqual([])
    })

    it("should return empty array when data is null", async () => {
      mockSupabaseClient.limit.mockResolvedValue({ data: null, error: null })

      const result = await fetchAuditLogs()

      expect(result).toEqual([])
    })

    it("should handle database errors gracefully", async () => {
      const dbError = { message: "Database query failed" }
      mockSupabaseClient.limit.mockResolvedValue({ data: null, error: dbError })

      const result = await fetchAuditLogs()

      expect(result).toEqual([])
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching audit logs:", dbError)
    })

    it("should handle exceptions gracefully", async () => {
      const exception = new Error("Connection timeout")
      mockSupabaseClient.limit.mockRejectedValue(exception)

      const result = await fetchAuditLogs()

      expect(result).toEqual([])
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error in fetchAuditLogs:", exception)
    })
  })

  describe("clearAuditLogs", () => {
    it("should clear audit logs successfully", async () => {
      mockSupabaseClient.neq.mockResolvedValue({ data: null, error: null })

      await clearAuditLogs()

      expect(createClient).toHaveBeenCalledWith("https://test.supabase.co", "test-service-role-key")
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("audit_logs")
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
      expect(mockSupabaseClient.neq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000")
    })

    it("should throw error when database deletion fails", async () => {
      const dbError = { message: "Permission denied" }
      mockSupabaseClient.neq.mockResolvedValue({ data: null, error: dbError })

      await expect(clearAuditLogs()).rejects.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error clearing audit logs:", dbError)
    })

    it("should throw error when exception occurs", async () => {
      const exception = new Error("Network error")
      mockSupabaseClient.neq.mockRejectedValue(exception)

      await expect(clearAuditLogs()).rejects.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error in clearAuditLogs:", exception)
    })
  })
})
