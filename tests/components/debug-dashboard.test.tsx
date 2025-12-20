import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DebugDashboard from "@/components/debug-dashboard"
import * as actions from "@/lib/actions"

vi.mock("@/lib/actions", () => ({
  fetchAuthDebugLogs: vi.fn(),
  clearAuthDebugLogs: vi.fn(),
}))

const mockLogs = [
  {
    id: "log-1",
    event_type: "login_attempt",
    user_email: "user1@example.com",
    success: true,
    error_message: null,
    additional_data: { user_exists: true },
    created_at: new Date().toISOString(),
  },
  {
    id: "log-2",
    event_type: "signup",
    user_email: "user2@example.com",
    success: false,
    error_message: "Email already exists",
    additional_data: { failure_reason: "duplicate_email" },
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
]

describe("DebugDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should display loading state initially", () => {
    vi.mocked(actions.fetchAuthDebugLogs).mockImplementation(() => new Promise(() => {}))

    render(<DebugDashboard />)

    expect(screen.getByText("Loading debug logs...")).toBeInTheDocument()
    const spinner = document.querySelector(".animate-spin")
    expect(spinner).toBeTruthy()
  })

  it("should display debug logs after successful fetch", async () => {
    vi.mocked(actions.fetchAuthDebugLogs).mockResolvedValue(mockLogs)

    render(<DebugDashboard />)

    await waitFor(() => {
      expect(screen.getByText("user1@example.com")).toBeInTheDocument()
    })

    expect(screen.getByText("user2@example.com")).toBeInTheDocument()
    expect(screen.getByText("Email already exists")).toBeInTheDocument()
    expect(screen.getByText("2 logs total")).toBeInTheDocument()
  })

  it("should display empty state when no logs exist", async () => {
    vi.mocked(actions.fetchAuthDebugLogs).mockResolvedValue([])

    render(<DebugDashboard />)

    await waitFor(() => {
      expect(screen.getByText("No debug logs found")).toBeInTheDocument()
    })

    expect(screen.getByText("Logs will appear here when users attempt to sign in or sign up")).toBeInTheDocument()
  })

  it("should handle fetch errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.mocked(actions.fetchAuthDebugLogs).mockRejectedValue(new Error("Fetch failed"))

    render(<DebugDashboard />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load debug logs:", expect.any(Error))
    })

    consoleErrorSpy.mockRestore()
  })

  it("should refresh logs when refresh button is clicked", async () => {
    vi.mocked(actions.fetchAuthDebugLogs).mockResolvedValue(mockLogs)

    const user = userEvent.setup()
    render(<DebugDashboard />)

    await waitFor(() => {
      expect(screen.getByText("user1@example.com")).toBeInTheDocument()
    })

    const refreshButton = screen.getByRole("button", { name: /refresh/i })
    await user.click(refreshButton)

    expect(actions.fetchAuthDebugLogs).toHaveBeenCalledTimes(2)
  })

  it("should clear logs when clear button is clicked", async () => {
    vi.mocked(actions.fetchAuthDebugLogs).mockResolvedValue(mockLogs)
    vi.mocked(actions.clearAuthDebugLogs).mockResolvedValue(undefined)

    const user = userEvent.setup()
    render(<DebugDashboard />)

    await waitFor(() => {
      expect(screen.getByText("user1@example.com")).toBeInTheDocument()
    })

    const clearButton = screen.getByRole("button", { name: /clear all logs/i })
    await user.click(clearButton)

    await waitFor(() => {
      expect(screen.getByText("No debug logs found")).toBeInTheDocument()
    })

    expect(actions.clearAuthDebugLogs).toHaveBeenCalledTimes(1)
  })

  it("should disable clear button when no logs exist", async () => {
    vi.mocked(actions.fetchAuthDebugLogs).mockResolvedValue([])

    render(<DebugDashboard />)

    await waitFor(() => {
      expect(screen.getByText("No debug logs found")).toBeInTheDocument()
    })

    const clearButton = screen.getByRole("button", { name: /clear all logs/i })
    expect(clearButton).toBeDisabled()
  })

  it("should expand and collapse log rows when clicked", async () => {
    vi.mocked(actions.fetchAuthDebugLogs).mockResolvedValue(mockLogs)

    const user = userEvent.setup()
    render(<DebugDashboard />)

    await waitFor(() => {
      expect(screen.getByText("user1@example.com")).toBeInTheDocument()
    })

    const logRow = screen.getByText("user1@example.com").closest("tr")
    expect(logRow).toBeTruthy()

    await user.click(logRow!)

    await waitFor(() => {
      expect(screen.getByText("Additional Data")).toBeInTheDocument()
    })

    await user.click(logRow!)

    await waitFor(() => {
      expect(screen.queryByText("Additional Data")).not.toBeInTheDocument()
    })
  })

  it("should display correct badges for different event types", async () => {
    const logsWithVariousEvents = [
      { ...mockLogs[0], event_type: "login_attempt" },
      { ...mockLogs[1], event_type: "signup", id: "log-3", user_email: "user3@example.com" },
      {
        ...mockLogs[0],
        id: "log-4",
        event_type: "email_confirmation",
        user_email: "user4@example.com",
      },
      { ...mockLogs[0], id: "log-5", event_type: "approval", user_email: "user5@example.com" },
    ]

    vi.mocked(actions.fetchAuthDebugLogs).mockResolvedValue(logsWithVariousEvents)

    render(<DebugDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Login")).toBeInTheDocument()
    })

    expect(screen.getByText("Signup")).toBeInTheDocument()
    const emailBadges = screen.getAllByText("Email")
    expect(emailBadges.some((badge) => badge.getAttribute("data-slot") === "badge")).toBe(true)
    expect(screen.getByText("Approval")).toBeInTheDocument()
  })

  it("should display success and error indicators correctly", async () => {
    vi.mocked(actions.fetchAuthDebugLogs).mockResolvedValue(mockLogs)

    render(<DebugDashboard />)

    await waitFor(() => {
      const user1Row = screen.getByText("user1@example.com").closest("tr")
      expect(user1Row).toBeTruthy()
      expect(within(user1Row!).getByText("Success")).toBeInTheDocument()
    })

    const user2Row = screen.getByText("user2@example.com").closest("tr")
    expect(user2Row).toBeTruthy()
    expect(within(user2Row!).getByText("Error")).toBeInTheDocument()
  })

  it("should handle clear logs errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.mocked(actions.fetchAuthDebugLogs).mockResolvedValue(mockLogs)
    vi.mocked(actions.clearAuthDebugLogs).mockRejectedValue(new Error("Clear failed"))

    const user = userEvent.setup()
    render(<DebugDashboard />)

    await waitFor(() => {
      expect(screen.getByText("user1@example.com")).toBeInTheDocument()
    })

    const clearButton = screen.getByRole("button", { name: /clear all logs/i })
    await user.click(clearButton)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to clear debug logs:", expect.any(Error))
    })

    consoleErrorSpy.mockRestore()
  })
})
