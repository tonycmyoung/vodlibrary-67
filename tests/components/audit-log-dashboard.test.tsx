import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AuditLogDashboard from "@/components/audit-log-dashboard"
import * as actions from "@/lib/actions"

vi.mock("@/lib/actions", () => ({
  fetchAuditLogs: vi.fn(),
  clearAuditLogs: vi.fn(),
}))

const mockLogs = [
  {
    id: "log-1",
    created_at: new Date().toISOString(),
    actor_id: "actor-1",
    actor_email: "admin@example.com",
    action: "user_approval",
    target_id: "user-1",
    target_email: "user1@example.com",
    additional_data: { actor_name: "Admin User", target_name: "John Doe" },
  },
  {
    id: "log-2",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    actor_id: "actor-2",
    actor_email: "moderator@example.com",
    action: "user_deletion",
    target_id: "user-2",
    target_email: "user2@example.com",
    additional_data: { actor_name: "Moderator", target_name: "Jane Smith" },
  },
]

describe("AuditLogDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should display loading state initially", () => {
    vi.mocked(actions.fetchAuditLogs).mockImplementation(() => new Promise(() => {}))

    render(<AuditLogDashboard />)

    expect(screen.getByText("Loading audit logs...")).toBeInTheDocument()
    const spinner = document.querySelector(".animate-spin")
    expect(spinner).toBeTruthy()
  })

  it("should display audit logs after successful fetch", async () => {
    vi.mocked(actions.fetchAuditLogs).mockResolvedValue(mockLogs)

    render(<AuditLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("admin@example.com")).toBeInTheDocument()
    })

    expect(screen.getByText("moderator@example.com")).toBeInTheDocument()
    expect(screen.getByText("user1@example.com")).toBeInTheDocument()
    expect(screen.getByText("user2@example.com")).toBeInTheDocument()
    expect(screen.getByText("2 logs total")).toBeInTheDocument()
  })

  it("should display empty state when no logs exist", async () => {
    vi.mocked(actions.fetchAuditLogs).mockResolvedValue([])

    render(<AuditLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("No audit logs found")).toBeInTheDocument()
    })

    expect(
      screen.getByText("Logs will appear here when users sign up, get approved, or are deleted"),
    ).toBeInTheDocument()
  })

  it("should handle fetch errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.mocked(actions.fetchAuditLogs).mockRejectedValue(new Error("Fetch failed"))

    render(<AuditLogDashboard />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load audit logs:", expect.any(Error))
    })

    consoleErrorSpy.mockRestore()
  })

  it("should refresh logs when refresh button is clicked", async () => {
    vi.mocked(actions.fetchAuditLogs).mockResolvedValue(mockLogs)

    const user = userEvent.setup()
    render(<AuditLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("admin@example.com")).toBeInTheDocument()
    })

    const refreshButton = screen.getByRole("button", { name: /refresh/i })
    await user.click(refreshButton)

    expect(actions.fetchAuditLogs).toHaveBeenCalledTimes(2)
  })

  it("should show confirmation and clear logs when clear button is clicked", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)

    vi.mocked(actions.fetchAuditLogs).mockResolvedValue(mockLogs)
    vi.mocked(actions.clearAuditLogs).mockResolvedValue(undefined)

    const user = userEvent.setup()
    render(<AuditLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("admin@example.com")).toBeInTheDocument()
    })

    const clearButton = screen.getByRole("button", { name: /clear all logs/i })
    await user.click(clearButton)

    expect(confirmSpy).toHaveBeenCalledWith(
      "Are you sure you want to clear all audit logs? This action cannot be undone.",
    )

    await waitFor(() => {
      expect(screen.getByText("No audit logs found")).toBeInTheDocument()
    })

    expect(actions.clearAuditLogs).toHaveBeenCalledTimes(1)

    confirmSpy.mockRestore()
  })

  it("should not clear logs when confirmation is cancelled", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)

    vi.mocked(actions.fetchAuditLogs).mockResolvedValue(mockLogs)

    const user = userEvent.setup()
    render(<AuditLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("admin@example.com")).toBeInTheDocument()
    })

    const clearButton = screen.getByRole("button", { name: /clear all logs/i })
    await user.click(clearButton)

    expect(confirmSpy).toHaveBeenCalled()
    expect(actions.clearAuditLogs).not.toHaveBeenCalled()
    expect(screen.getByText("admin@example.com")).toBeInTheDocument()

    confirmSpy.mockRestore()
  })

  it("should disable clear button when no logs exist", async () => {
    vi.mocked(actions.fetchAuditLogs).mockResolvedValue([])

    render(<AuditLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("No audit logs found")).toBeInTheDocument()
    })

    const clearButton = screen.getByRole("button", { name: /clear all logs/i })
    expect(clearButton).toBeDisabled()
  })

  it("should display correct badges for different action types", async () => {
    const logsWithVariousActions = [
      { ...mockLogs[0], action: "user_signup", id: "log-3" },
      { ...mockLogs[0], action: "user_approval", id: "log-4" },
      { ...mockLogs[0], action: "user_deletion", id: "log-5" },
      { ...mockLogs[0], action: "user_invitation", id: "log-6" },
      { ...mockLogs[0], action: "password_reset", id: "log-7" },
    ]

    vi.mocked(actions.fetchAuditLogs).mockResolvedValue(logsWithVariousActions)

    render(<AuditLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Signup")).toBeInTheDocument()
    })

    expect(screen.getByText("Approval")).toBeInTheDocument()
    expect(screen.getByText("Deletion")).toBeInTheDocument()
    expect(screen.getByText("Invitation")).toBeInTheDocument()
    expect(screen.getByText("Password Reset")).toBeInTheDocument()
  })

  it("should display actor and target names from additional data", async () => {
    vi.mocked(actions.fetchAuditLogs).mockResolvedValue(mockLogs)

    render(<AuditLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument()
    })

    expect(screen.getByText("John Doe")).toBeInTheDocument()
    expect(screen.getByText("Moderator")).toBeInTheDocument()
    expect(screen.getByText("Jane Smith")).toBeInTheDocument()
  })

  it("should handle logs without target information", async () => {
    const logsWithoutTarget = [
      {
        ...mockLogs[0],
        target_id: null,
        target_email: null,
        action: "user_signup",
      },
    ]

    vi.mocked(actions.fetchAuditLogs).mockResolvedValue(logsWithoutTarget)

    render(<AuditLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("admin@example.com")).toBeInTheDocument()
    })

    const actorRow = screen.getByText("admin@example.com").closest("tr")
    expect(actorRow).toBeTruthy()

    const cells = actorRow?.querySelectorAll("td")
    const hasEmptyTarget = Array.from(cells || []).some((cell) => cell.textContent?.trim() === "-")
    expect(hasEmptyTarget).toBe(true)
  })

  it("should handle clear logs errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)

    vi.mocked(actions.fetchAuditLogs).mockResolvedValue(mockLogs)
    vi.mocked(actions.clearAuditLogs).mockRejectedValue(new Error("Clear failed"))

    const user = userEvent.setup()
    render(<AuditLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("admin@example.com")).toBeInTheDocument()
    })

    const clearButton = screen.getByRole("button", { name: /clear all logs/i })
    await user.click(clearButton)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to clear audit logs:", expect.any(Error))
    })

    consoleErrorSpy.mockRestore()
    confirmSpy.mockRestore()
  })
})
