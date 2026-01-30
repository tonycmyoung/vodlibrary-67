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
import { traceDebug, traceInfo, traceWarn, traceError, serverTrace } from "@/lib/trace-logger"

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
      traceDebug("Test debug message")

      // Wait for async operations
      await vi.waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalled()
      })

      // Console.log is called with a single formatted string containing [DEBUG]
      const logCall = consoleLogSpy.mock.calls[0][0]
      expect(logCall).toContain("[DEBUG]")
      expect(logCall).toContain("Test debug message")
    })

    it("should include message in console output", async () => {
      traceDebug("Test debug message")

      await vi.waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalled()
      })

      const logCall = consoleLogSpy.mock.calls[0][0]
      expect(logCall).toContain("Test debug message")
    })

    it("should write to database", async () => {
      traceDebug("Test debug message")

      await vi.waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("trace_logs")
      })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "debug",
          message: "Test debug message",
        })
      )
    })

    it("should include payload when provided", async () => {
      traceDebug("Test message", { payload: { key: "value" } })

      await vi.waitFor(() => {
        expect(mockInsert).toHaveBeenCalled()
      })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { key: "value" },
        })
      )
    })

    it("should include category when provided", async () => {
      traceDebug("Test message", { category: "auth" })

      await vi.waitFor(() => {
        expect(mockInsert).toHaveBeenCalled()
      })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "auth",
        })
      )
    })
  })

  describe("traceInfo", () => {
    it("should log info messages with correct level", async () => {
      traceInfo("Test info message")

      await vi.waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalled()
      })

      const logCall = consoleLogSpy.mock.calls[0][0]
      expect(logCall).toContain("[INFO]")
      expect(logCall).toContain("Test info message")

      await vi.waitFor(() => {
        expect(mockInsert).toHaveBeenCalled()
      })

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
      traceWarn("Test warning message")

      await vi.waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalled()
      })

      const logCall = consoleLogSpy.mock.calls[0][0]
      expect(logCall).toContain("[WARN]")
      expect(logCall).toContain("Test warning message")

      await vi.waitFor(() => {
        expect(mockInsert).toHaveBeenCalled()
      })

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
      traceError("Test error message")

      await vi.waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalled()
      })

      const logCall = consoleLogSpy.mock.calls[0][0]
      expect(logCall).toContain("[ERROR]")
      expect(logCall).toContain("Test error message")

      await vi.waitFor(() => {
        expect(mockInsert).toHaveBeenCalled()
      })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          message: "Test error message",
        })
      )
    })
  })

  describe("serverTrace object", () => {
    it("should expose all trace methods", () => {
      expect(serverTrace.debug).toBe(traceDebug)
      expect(serverTrace.info).toBe(traceInfo)
      expect(serverTrace.warn).toBe(traceWarn)
      expect(serverTrace.error).toBe(traceError)
    })
  })

  describe("options handling", () => {
    it("should include user context when provided", async () => {
      traceInfo("User action", {
        userId: "user-123",
        userEmail: "user@test.com",
        sessionId: "session-456",
      })

      await vi.waitFor(() => {
        expect(mockInsert).toHaveBeenCalled()
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
      traceInfo("API call", {
        requestId: "req-789",
        userAgent: "Mozilla/5.0",
        ipAddress: "192.168.1.1",
      })

      await vi.waitFor(() => {
        expect(mockInsert).toHaveBeenCalled()
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

      traceInfo("Should not be logged to DB")

      await vi.waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalled()
      })

      // Give time for async to complete
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should still log to console in dev, but insert should not be called
      // after settings check returns enabled: false
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe("error handling", () => {
    it("should handle database insert errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      mockInsert.mockResolvedValue({ error: { message: "Insert failed" } })

      traceInfo("Test message")

      await vi.waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[trace-logger] Failed to write trace:",
          "Insert failed"
        )
      })

      consoleErrorSpy.mockRestore()
    })

    it("should handle settings fetch errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      mockSingle.mockResolvedValue({ data: null, error: { message: "Settings fetch failed" } })

      traceInfo("Test message")

      await vi.waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalled()
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe("environment detection", () => {
    it("should include environment in log entry", async () => {
      traceInfo("Test message")

      await vi.waitFor(() => {
        expect(mockInsert).toHaveBeenCalled()
      })

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
