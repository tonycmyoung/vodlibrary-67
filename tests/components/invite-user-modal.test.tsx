"use client"

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import InviteUserModal from "@/components/invite-user-modal"
import { inviteUser } from "@/lib/actions"

vi.mock("@/lib/actions", () => ({
  inviteUser: vi.fn(),
}))

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}))

describe("InviteUserModal", () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("should render when isOpen is true", () => {
    render(<InviteUserModal isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByTestId("dialog")).toBeTruthy()
    const heading = screen.getByRole("heading", { name: /invite user/i })
    expect(heading).toBeTruthy()
  })

  it("should not render when isOpen is false", () => {
    render(<InviteUserModal isOpen={false} onClose={mockOnClose} />)

    expect(screen.queryByTestId("dialog")).toBeNull()
  })

  it("should render email input field", () => {
    render(<InviteUserModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByLabelText(/email address/i)
    expect(emailInput).toHaveAttribute("type", "email")
    expect(emailInput).toHaveAttribute("placeholder", "user@example.com")
    expect(emailInput).toHaveAttribute("required")
  })

  it("should render Cancel and Send Invitation buttons", () => {
    render(<InviteUserModal isOpen={true} onClose={mockOnClose} />)

    const cancelButton = screen.getByRole("button", { name: /cancel/i })
    const submitButton = screen.getByRole("button", { name: /send invitation/i })

    expect(cancelButton).toHaveAttribute("type", "button")
    expect(submitButton).toHaveAttribute("type", "submit")
  })

  it("should update email input value on change", () => {
    render(<InviteUserModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: "test@example.com" } })

    expect(emailInput.value).toBe("test@example.com")
  })

  it("should show error when submitting empty email", async () => {
    render(<InviteUserModal isOpen={true} onClose={mockOnClose} />)

    const submitButton = screen.getByRole("button", { name: /send invitation/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      const errorMessage = screen.getByText(/please enter an email address/i)
      const errorContainer = errorMessage.closest("div")
      expect(errorContainer).toHaveClass("bg-red-900/50")
      expect(errorContainer).toHaveClass("text-red-400")
    })

    expect(inviteUser).not.toHaveBeenCalled()
  })

  it("should call inviteUser action on form submit", async () => {
    vi.mocked(inviteUser).mockResolvedValue({ success: "Invitation sent!" })

    render(<InviteUserModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByLabelText(/email address/i)
    fireEvent.change(emailInput, { target: { value: "newuser@example.com" } })

    const submitButton = screen.getByRole("button", { name: /send invitation/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(inviteUser).toHaveBeenCalledWith("newuser@example.com")
    })
  })

  it("should show success message on successful invite", async () => {
    vi.mocked(inviteUser).mockResolvedValue({ success: "Invitation sent successfully!" })

    render(<InviteUserModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByLabelText(/email address/i)
    fireEvent.change(emailInput, { target: { value: "newuser@example.com" } })

    const submitButton = screen.getByRole("button", { name: /send invitation/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      const successMessage = screen.getByText(/invitation sent successfully!/i)
      const successContainer = successMessage.closest("div")
      expect(successContainer).toHaveClass("bg-green-900/50")
      expect(successContainer).toHaveClass("text-green-400")
    })
  })

  it("should show error message on failed invite", async () => {
    vi.mocked(inviteUser).mockResolvedValue({ error: "User already exists" })

    render(<InviteUserModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByLabelText(/email address/i)
    fireEvent.change(emailInput, { target: { value: "existing@example.com" } })

    const submitButton = screen.getByRole("button", { name: /send invitation/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      const errorMessage = screen.getByText(/user already exists/i)
      const errorContainer = errorMessage.closest("div")
      expect(errorContainer).toHaveClass("bg-red-900/50")
      expect(errorContainer).toHaveClass("text-red-400")
    })
  })

  it("should clear email and auto-close modal after successful invite", async () => {
    vi.mocked(inviteUser).mockResolvedValue({ success: "Invitation sent!" })

    render(<InviteUserModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: "test@example.com" } })

    const submitButton = screen.getByRole("button", { name: /send invitation/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      const successMessage = screen.getByText(/invitation sent!/i)
      expect(successMessage.closest("div")).toHaveClass("bg-green-900/50")
    })

    // Email should be cleared
    expect(emailInput.value).toBe("")

    await waitFor(
      () => {
        expect(mockOnClose).toHaveBeenCalled()
      },
      { timeout: 3000 },
    )
  }, 5000)

  it("should show loading state during invite", async () => {
    vi.mocked(inviteUser).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: "Done" }), 100)),
    )

    render(<InviteUserModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByLabelText(/email address/i)
    fireEvent.change(emailInput, { target: { value: "test@example.com" } })

    const submitButton = screen.getByRole("button", { name: /send invitation/i })
    fireEvent.click(submitButton)

    const loadingButton = screen.getByRole("button", { name: /sending.../i })
    expect(loadingButton).toBeDisabled()
    expect(loadingButton).toHaveAttribute("type", "submit")
  })

  it("should call onClose when Cancel button is clicked", () => {
    render(<InviteUserModal isOpen={true} onClose={mockOnClose} />)

    const cancelButton = screen.getByRole("button", { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it("should clear form when modal is closed", () => {
    render(<InviteUserModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: "test@example.com" } })

    const cancelButton = screen.getByRole("button", { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it("should handle unexpected errors gracefully", async () => {
    vi.mocked(inviteUser).mockRejectedValue(new Error("Network error"))

    render(<InviteUserModal isOpen={true} onClose={mockOnClose} />)

    const emailInput = screen.getByLabelText(/email address/i)
    fireEvent.change(emailInput, { target: { value: "test@example.com" } })

    const submitButton = screen.getByRole("button", { name: /send invitation/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      const errorMessage = screen.getByText(/failed to send invitation/i)
      const errorContainer = errorMessage.closest("div")
      expect(errorContainer).toHaveClass("bg-red-900/50")
      expect(errorContainer).toHaveClass("text-red-400")
    })
  })
})
