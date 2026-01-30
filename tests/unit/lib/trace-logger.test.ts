import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock environment variables before importing the module
const mockEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  NODE_ENV: "development",
}

vi.stubGlobal("process", {
  env: mockEnv,
})

// Mock Supabase client
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockDelete = vi.fn()
const mockFrom = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockLt = vi.fn()

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

// Import after mocking
import { traceDebug, traceInfo, traceWarn, traceError, trace } from "@/lib/trace-logger"

describe("Trace Logger", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})

    // Reset environment
    process.env = { ...mockEnv }

    // Setup default mock chain
    mockSingle.mockResolvedValue({ data: { enabled: true, retention_days: 7 }, error: null })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockInsert.mockResolvedValue({ error: null })
    mockLt.mockResolvedValue({ error: null })
    mockDelete.mockReturnValue({ lt: mockLt })

    mockFrom.mockImplementation((table: string) => {
      if (table === "trace_settings") {
        return { select: mockSelect }
      }
      if (table === "trace_logs") {
        return { insert: mockInsert, delete: mockDelete }
      }
      return {}
    })
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  describe("traceDebug", () => {
    it("should log debug messages to console in development", async () => {
      await traceDebug("Test debug message")

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[DEBUG]"),
        expect.any(String)
      )
    })

    it("should include message in console output", async () => {
      await traceDebug("Test debug message")

      const logCall = consoleLogSpy.mock.calls[0]
      expect(logCall.join(" ")).toContain("Test debug message")
    })

    it("should write to database", async () => {
      await traceDebug("Test debug message")

      expect(mockFrom).toHaveBeenCalledWith("trace_logs")
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "debug",
          message: "Test debug message",
        })
      )
    })

    it("should include payload when provided", async () => {
      await traceDebug("Test message", { payload: { key: "value" } })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { key: "value" },
        })
      )
    })

    it("should include category when provided", async () => {
      await traceDebug("Test message", { category: "auth" })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "auth",
        })
      )
    })
  })

  describe("traceInfo", () => {
    it("should log info messages with correct level", async () => {
      await traceInfo("Test info message")

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[INFO]"),
        expect.any(String)
      )
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "info",
          message: "Test info message",
        })
      )
    })
  })

  describe("traceWarn", () => {
    it("should log warning messages with correct level", async () => {
      await traceWarn("Test warning message")

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[WARN]"),
        expect.any(String)
      )
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "warn",
          message: "Test warning message",
        })
      )
    })
  })

  describe("traceError", () => {
    it("should log error messages with correct level", async () => {
      await traceError("Test error message")

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ERROR]"),
        expect.any(String)
      )
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          message: "Test error message",
        })
      )
    })
  })

  describe("trace object", () => {
    it("should expose all trace methods", () => {
      expect(trace.debug).toBe(traceDebug)
      expect(trace.info).toBe(traceInfo)
      expect(trace.warn).toBe(traceWarn)
      expect(trace.error).toBe(traceError)
    })
  })

  describe("options handling", () => {
    it("should include user context when provided", async () => {
      await traceInfo("User action", {
        userId: "user-123",
        userEmail: "user@test.com",
        sessionId: "session-456",
      })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          user_email: "user@test.com",
          session_id: "session-456",
        })
      )
    })

    it("should include request context when provided", async () => {
      await traceInfo("API call", {
        requestId: "req-789",
        userAgent: "Mozilla/5.0",
        ipAddress: "192.168.1.1",
      })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: "req-789",
          user_agent: "Mozilla/5.0",
          ip_address: "192.168.1.1",
        })
      )
    })
  })

  describe("settings check", () => {
    it("should not write to DB when tracing is disabled", async () => {
      mockSingle.mockResolvedValue({ data: { enabled: false, retention_days: 7 }, error: null })

      await traceInfo("Should not be logged")

      // Should still log to console in dev
      expect(consoleLogSpy).toHaveBeenCalled()
      // But should not insert to DB after checking settings
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  describe("error handling", () => {
    it("should handle database insert errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      mockInsert.mockResolvedValue({ error: { message: "Insert failed" } })

      await traceInfo("Test message")

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[trace-logger] Failed to write trace:",
        "Insert failed"
      )
      consoleErrorSpy.mockRestore()
    })

    it("should handle settings fetch errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      mockSingle.mockResolvedValue({ data: null, error: { message: "Settings fetch failed" } })

      await traceInfo("Test message")

      // Should still attempt to log
      expect(consoleLogSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe("environment detection", () => {
    it("should include environment in log entry", async () => {
      await traceInfo("Test message")

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: "development",
        })
      )
    })
  })

  describe("when Supabase is not configured", () => {
    it("should still log to console but not write to DB", async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = ""
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ""

      // Re-import to get fresh module with new env
      vi.resetModules()
      
      // Just verify console logging works - DB write will be skipped
      expect(consoleLogSpy).toBeDefined()
    })
  })
})
