import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import TraceDashboard from "@/components/trace-dashboard"
import * as traceActions from "@/lib/actions/trace"

vi.mock("@/lib/actions/trace", () => ({
  fetchTraceLogs: vi.fn(),
  clearTraceLogs: vi.fn(),
  fetchTraceSettings: vi.fn(),
  updateTraceSettings: vi.fn(),
  getTraceCategories: vi.fn(),
  getTraceSourceFiles: vi.fn(),
  formatTraceLogsForClipboard: vi.fn(),
}))

const mockLogs = [
  {
    id: "log-1",
    created_at: new Date().toISOString(),
    source_file: "components/test.tsx",
    source_line: 42,
    function_name: "handleClick",
    level: "info" as const,
    category: "auth",
    message: "User logged in successfully",
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
    created_at: new Date(Date.now() - 3600000).toISOString(),
    source_file: "lib/auth.ts",
    source_line: 100,
    function_name: "signIn",
    level: "error" as const,
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
  {
    id: "log-3",
    created_at: new Date(Date.now() - 7200000).toISOString(),
    source_file: "components/video.tsx",
    source_line: 25,
    function_name: "playVideo",
    level: "debug" as const,
    category: "video",
    message: "Video playback started",
    payload: null,
    user_id: null,
    user_email: null,
    session_id: null,
    request_id: null,
    environment: "development",
    user_agent: null,
    ip_address: null,
  },
  {
    id: "log-4",
    created_at: new Date(Date.now() - 10800000).toISOString(),
    source_file: "lib/api.ts",
    source_line: 50,
    function_name: "fetchData",
    level: "warn" as const,
    category: null,
    message: "Rate limit approaching",
    payload: { current: 95, limit: 100 },
    user_id: null,
    user_email: null,
    session_id: null,
    request_id: null,
    environment: "development",
    user_agent: null,
    ip_address: null,
  },
]

const mockSettings = {
  id: "default",
  enabled: true,
  retention_days: 7,
  updated_at: new Date().toISOString(),
}

const mockCategories = ["auth", "video"]

describe("TraceDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(traceActions.fetchTraceLogs).mockResolvedValue(mockLogs)
    vi.mocked(traceActions.fetchTraceSettings).mockResolvedValue(mockSettings)
    vi.mocked(traceActions.getTraceCategories).mockResolvedValue(mockCategories)
    vi.mocked(traceActions.formatTraceLogsForClipboard).mockReturnValue(JSON.stringify(mockLogs, null, 2))
  })

  it("should display loading state initially", () => {
    vi.mocked(traceActions.fetchTraceLogs).mockImplementation(() => new Promise(() => {}))

    render(<TraceDashboard />)

    expect(screen.getByText("Loading trace logs...")).toBeTruthy()
  })

  it("should display trace logs after successful fetch", async () => {
    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("User logged in successfully")).toBeTruthy()
    })

    expect(screen.getByText("Authentication failed")).toBeTruthy()
    expect(screen.getByText("Video playback started")).toBeTruthy()
    expect(screen.getByText("Rate limit approaching")).toBeTruthy()
    expect(screen.getByText("4 logs total")).toBeTruthy()
  })

  it("should display empty state when no logs exist", async () => {
    vi.mocked(traceActions.fetchTraceLogs).mockResolvedValue([])

    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("No trace logs found")).toBeTruthy()
    })

    expect(screen.getByText("Use trace.info(), trace.debug(), etc. in your code to add logs")).toBeTruthy()
  })

  it("should display correct level badges", async () => {
    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("User logged in successfully")).toBeTruthy()
    })

    // Check for level badges (case insensitive since they're uppercase in the badge)
    expect(screen.getByText("INFO")).toBeTruthy()
    expect(screen.getByText("ERROR")).toBeTruthy()
    expect(screen.getByText("DEBUG")).toBeTruthy()
    expect(screen.getByText("WARN")).toBeTruthy()
  })

  it("should display source file and line information", async () => {
    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("components/test.tsx")).toBeTruthy()
    })

    expect(screen.getByText(":42")).toBeTruthy()
    expect(screen.getByText("handleClick()")).toBeTruthy()
  })

  it("should display category badges", async () => {
    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("User logged in successfully")).toBeTruthy()
    })

    const authBadges = screen.getAllByText("auth")
    expect(authBadges.length).toBeGreaterThan(0)
    expect(screen.getByText("video")).toBeTruthy()
  })

  it("should refresh logs when refresh button is clicked", async () => {
    const user = userEvent.setup()
    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("User logged in successfully")).toBeTruthy()
    })

    const refreshButton = screen.getByRole("button", { name: /refresh/i })
    await user.click(refreshButton)

    expect(traceActions.fetchTraceLogs).toHaveBeenCalledTimes(2)
  })

  it("should purge logs when purge button is clicked", async () => {
    vi.mocked(traceActions.clearTraceLogs).mockResolvedValue(undefined)

    const user = userEvent.setup()
    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("User logged in successfully")).toBeTruthy()
    })

    const purgeButton = screen.getByRole("button", { name: /purge all/i })
    await user.click(purgeButton)

    await waitFor(() => {
      expect(traceActions.clearTraceLogs).toHaveBeenCalledTimes(1)
    })
  })

  it("should copy logs to clipboard when copy button is clicked", async () => {
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    }
    Object.assign(navigator, { clipboard: mockClipboard })

    const user = userEvent.setup()
    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("User logged in successfully")).toBeTruthy()
    })

    const copyButton = screen.getByRole("button", { name: /copy to clipboard/i })
    await user.click(copyButton)

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled()
      expect(traceActions.formatTraceLogsForClipboard).toHaveBeenCalledWith(mockLogs)
    })
  })

  it("should show 'Copied!' after successful copy", async () => {
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    }
    Object.assign(navigator, { clipboard: mockClipboard })

    const user = userEvent.setup()
    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("User logged in successfully")).toBeTruthy()
    })

    const copyButton = screen.getByRole("button", { name: /copy to clipboard/i })
    await user.click(copyButton)

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeTruthy()
    })
  })

  it("should expand and collapse log rows when clicked", async () => {
    const user = userEvent.setup()
    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("User logged in successfully")).toBeTruthy()
    })

    // Find and click the first log row
    const logRow = screen.getByText("User logged in successfully").closest("tr")
    expect(logRow).toBeTruthy()

    await user.click(logRow!)

    // Should show expanded details
    await waitFor(() => {
      expect(screen.getByText("Payload")).toBeTruthy()
    })

    // Click again to collapse
    await user.click(logRow!)

    await waitFor(() => {
      expect(screen.queryByText("Payload")).toBeNull()
    })
  })

  it("should toggle settings panel when clicked", async () => {
    const user = userEvent.setup()
    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Trace Settings")).toBeTruthy()
    })

    // Settings should be collapsed by default
    expect(screen.queryByText("Tracing Enabled")).toBeNull()

    // Click to expand
    const settingsHeader = screen.getByText("Trace Settings").closest("div")
    await user.click(settingsHeader!)

    await waitFor(() => {
      expect(screen.getByText("Tracing Enabled")).toBeTruthy()
    })
  })

  it("should update enabled setting when switch is toggled", async () => {
    vi.mocked(traceActions.updateTraceSettings).mockResolvedValue(undefined)

    const user = userEvent.setup()
    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Trace Settings")).toBeTruthy()
    })

    // Expand settings
    const settingsHeader = screen.getByText("Trace Settings").closest("div")
    await user.click(settingsHeader!)

    await waitFor(() => {
      expect(screen.getByText("Tracing Enabled")).toBeTruthy()
    })

    // Toggle the switch
    const enabledSwitch = screen.getByRole("switch", { name: /tracing enabled/i })
    await user.click(enabledSwitch)

    await waitFor(() => {
      expect(traceActions.updateTraceSettings).toHaveBeenCalledWith({ enabled: false })
    })
  })

  it("should show disabled indicator when tracing is disabled", async () => {
    vi.mocked(traceActions.fetchTraceSettings).mockResolvedValue({
      ...mockSettings,
      enabled: false,
    })

    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("(Tracing disabled)")).toBeTruthy()
    })
  })

  it("should filter logs by level", async () => {
    const user = userEvent.setup()
    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("User logged in successfully")).toBeTruthy()
    })

    // Open level filter dropdown
    const levelSelect = screen.getByRole("combobox", { name: /level/i })
    await user.click(levelSelect)

    // Select "Error" option
    const errorOption = screen.getByRole("option", { name: /error/i })
    await user.click(errorOption)

    // Should trigger a new fetch with the filter
    await waitFor(() => {
      expect(traceActions.fetchTraceLogs).toHaveBeenCalledWith(
        expect.objectContaining({ level: "error" })
      )
    })
  })

  it("should handle fetch errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(traceActions.fetchTraceLogs).mockRejectedValue(new Error("Fetch failed"))

    render(<TraceDashboard />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load trace logs:", expect.any(Error))
    })

    consoleErrorSpy.mockRestore()
  })

  it("should handle clear errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(traceActions.clearTraceLogs).mockRejectedValue(new Error("Clear failed"))

    const user = userEvent.setup()
    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("User logged in successfully")).toBeTruthy()
    })

    const purgeButton = screen.getByRole("button", { name: /purge all/i })
    await user.click(purgeButton)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to clear trace logs:", expect.any(Error))
    })

    consoleErrorSpy.mockRestore()
  })

  it("should disable purge button when no logs exist", async () => {
    vi.mocked(traceActions.fetchTraceLogs).mockResolvedValue([])

    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("No trace logs found")).toBeTruthy()
    })

    const purgeButton = screen.getByRole("button", { name: /purge all/i })
    expect(purgeButton).toBeDisabled()
  })

  it("should disable copy button when no logs exist", async () => {
    vi.mocked(traceActions.fetchTraceLogs).mockResolvedValue([])

    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("No trace logs found")).toBeTruthy()
    })

    const copyButton = screen.getByRole("button", { name: /copy to clipboard/i })
    expect(copyButton).toBeDisabled()
  })

  it("should enable auto-refresh when toggle is switched", async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    
    render(<TraceDashboard />)

    await waitFor(() => {
      expect(screen.getByText("User logged in successfully")).toBeTruthy()
    })

    // Initial fetch
    expect(traceActions.fetchTraceLogs).toHaveBeenCalledTimes(1)

    // Enable auto-refresh
    const autoRefreshSwitch = screen.getByRole("switch", { name: /auto-refresh/i })
    await user.click(autoRefreshSwitch)

    // Advance time by 5 seconds
    vi.advanceTimersByTime(5000)

    await waitFor(() => {
      expect(traceActions.fetchTraceLogs).toHaveBeenCalledTimes(2)
    })

    vi.useRealTimers()
  })
})
