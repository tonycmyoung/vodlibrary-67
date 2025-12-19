import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { vi, describe, it, expect, beforeEach } from "vitest"
import UnconfirmedEmailUsers from "@/components/unconfirmed-email-users"
import * as actions from "@/lib/actions"

vi.mock("@/lib/actions", () => ({
  fetchUnconfirmedEmailUsers: vi.fn(),
  resendConfirmationEmail: vi.fn(),
}))

describe("UnconfirmedEmailUsers", () => {
  const mockUsers = [
    {
      id: "user-1",
      email: "john@example.com",
      full_name: "John Doe",
      teacher: "Mr. Smith",
      school: "Lincoln High",
      created_at: "2024-01-15T10:00:00Z",
      confirmation_sent_at: null,
    },
    {
      id: "user-2",
      email: "jane@example.com",
      full_name: null,
      teacher: null,
      school: "Madison School",
      created_at: "2024-01-20T14:30:00Z",
      confirmation_sent_at: "2024-01-20T14:35:00Z",
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(actions.fetchUnconfirmedEmailUsers).mockResolvedValue({
      data: mockUsers,
      error: null,
    })
  })

  it("should render loading state initially", () => {
    render(<UnconfirmedEmailUsers />)
    expect(screen.getByText("Loading unconfirmed users...")).toBeInTheDocument()
  })

  it("should render unconfirmed users list after loading", async () => {
    render(<UnconfirmedEmailUsers />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
      expect(screen.getByText("john@example.com")).toBeInTheDocument()
      expect(screen.getByText("jane@example.com")).toBeInTheDocument()
    })
  })

  it("should display user count badge", async () => {
    render(<UnconfirmedEmailUsers />)

    await waitFor(() => {
      expect(screen.getByText("2 unconfirmed")).toBeInTheDocument()
    })
  })

  it("should display empty state when no unconfirmed users", async () => {
    vi.mocked(actions.fetchUnconfirmedEmailUsers).mockResolvedValue({
      data: [],
      error: null,
    })

    render(<UnconfirmedEmailUsers />)

    await waitFor(() => {
      expect(screen.getByText("No users with unconfirmed emails")).toBeInTheDocument()
    })
  })

  it("should display user initials for users without names", async () => {
    render(<UnconfirmedEmailUsers />)

    await waitFor(() => {
      const avatars = screen.getAllByText(/^[A-Z]$/)
      expect(avatars.length).toBeGreaterThan(0)
    })
  })

  it("should display teacher and school information", async () => {
    render(<UnconfirmedEmailUsers />)

    await waitFor(() => {
      const teacherElements = screen.getAllByText(/Mr\. Smith/)
      expect(teacherElements.length).toBeGreaterThan(0)

      const schoolElements = screen.getAllByText(/Lincoln High/)
      expect(schoolElements.length).toBeGreaterThan(0)

      const madisonSchool = screen.getAllByText(/Madison School/)
      expect(madisonSchool.length).toBeGreaterThan(0)
    })
  })

  it("should display 'Not specified' for missing teacher", async () => {
    render(<UnconfirmedEmailUsers />)

    await waitFor(() => {
      expect(screen.getByText(/Not specified/)).toBeInTheDocument()
    })
  })

  it("should allow resending confirmation email", async () => {
    const user = userEvent.setup()
    vi.mocked(actions.resendConfirmationEmail).mockResolvedValue({
      success: true,
      error: null,
    })

    render(<UnconfirmedEmailUsers />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const resendButtons = screen.getAllByRole("button", { name: /resend/i })
    await user.click(resendButtons[0])

    await waitFor(() => {
      expect(actions.resendConfirmationEmail).toHaveBeenCalledWith("john@example.com")
    })
  })

  it("should show success message after resending email", async () => {
    const user = userEvent.setup()
    vi.mocked(actions.resendConfirmationEmail).mockResolvedValue({
      success: true,
      error: null,
    })

    render(<UnconfirmedEmailUsers />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const resendButtons = screen.getAllByRole("button", { name: /resend/i })
    await user.click(resendButtons[0])

    await waitFor(() => {
      expect(screen.getByText("Confirmation email sent!")).toBeInTheDocument()
    })
  })

  it("should show error message when resend fails", async () => {
    const user = userEvent.setup()
    vi.mocked(actions.resendConfirmationEmail).mockResolvedValue({
      success: false,
      error: "Failed to send email",
    })

    render(<UnconfirmedEmailUsers />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const resendButtons = screen.getAllByRole("button", { name: /resend/i })
    await user.click(resendButtons[0])

    await waitFor(() => {
      expect(screen.getByText("Failed to send email")).toBeInTheDocument()
    })
  })

  it("should display loading spinner while resending", async () => {
    const user = userEvent.setup()
    vi.mocked(actions.resendConfirmationEmail).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true, error: null }), 100)),
    )

    render(<UnconfirmedEmailUsers />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    const resendButtons = screen.getAllByRole("button", { name: /resend/i })
    await user.click(resendButtons[0])

    await waitFor(
      () => {
        expect(screen.getByText("Sending...")).toBeInTheDocument()
      },
      { timeout: 200 },
    )
  })

  it("should display last sent timestamp", async () => {
    render(<UnconfirmedEmailUsers />)

    await waitFor(() => {
      expect(screen.getAllByText(/Last sent:/)).toBeTruthy()
    })
  })

  it("should handle fetch error gracefully", async () => {
    vi.mocked(actions.fetchUnconfirmedEmailUsers).mockResolvedValue({
      data: null,
      error: "Database error",
    })

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    render(<UnconfirmedEmailUsers />)

    await waitFor(() => {
      expect(screen.getByText("No users with unconfirmed emails")).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })
})
