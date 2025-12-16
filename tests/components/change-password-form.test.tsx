import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import ChangePasswordForm from "@/components/change-password-form"
import { createClient } from "@/lib/supabase/client"

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

describe("ChangePasswordForm", () => {
  const mockGetUser = vi.fn()
  const mockSignInWithPassword = vi.fn()
  const mockUpdateUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    const mockSupabaseClient = {
      auth: {
        getUser: mockGetUser,
        signInWithPassword: mockSignInWithPassword,
        updateUser: mockUpdateUser,
      },
    }

    vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any)
  })

  it("should render the form with all fields", () => {
    render(<ChangePasswordForm />)

    expect(screen.getByText("Change Password")).toBeInTheDocument()
    expect(screen.getByLabelText("Current Password")).toBeInTheDocument()
    expect(screen.getByLabelText("New Password")).toBeInTheDocument()
    expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Update Password/i })).toBeInTheDocument()
  })

  it("should toggle current password visibility", () => {
    render(<ChangePasswordForm />)

    const currentPasswordInput = screen.getByLabelText("Current Password") as HTMLInputElement
    const toggleButton = currentPasswordInput.parentElement?.querySelector("button")!

    expect(currentPasswordInput.type).toBe("password")

    fireEvent.click(toggleButton)
    expect(currentPasswordInput.type).toBe("text")

    fireEvent.click(toggleButton)
    expect(currentPasswordInput.type).toBe("password")
  })

  it("should show error when fields are empty", async () => {
    render(<ChangePasswordForm />)

    const submitButton = screen.getByRole("button", { name: /Update Password/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("All fields are required")).toBeInTheDocument()
    })
  })

  it("should show error when new passwords don't match", async () => {
    render(<ChangePasswordForm />)

    const currentPasswordInput = screen.getByLabelText("Current Password")
    const newPasswordInput = screen.getByLabelText("New Password")
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password")

    fireEvent.change(currentPasswordInput, { target: { value: "oldpass123" } })
    fireEvent.change(newPasswordInput, { target: { value: "newpass123" } })
    fireEvent.change(confirmPasswordInput, { target: { value: "differentpass" } })

    const submitButton = screen.getByRole("button", { name: /Update Password/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("New passwords do not match")).toBeInTheDocument()
    })
  })

  it("should show error when password is too short", async () => {
    render(<ChangePasswordForm />)

    const currentPasswordInput = screen.getByLabelText("Current Password")
    const newPasswordInput = screen.getByLabelText("New Password")
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password")

    fireEvent.change(currentPasswordInput, { target: { value: "oldpass" } })
    fireEvent.change(newPasswordInput, { target: { value: "short" } })
    fireEvent.change(confirmPasswordInput, { target: { value: "short" } })

    const submitButton = screen.getByRole("button", { name: /Update Password/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 6 characters long")).toBeInTheDocument()
    })
  })

  it("should show error when current password is incorrect", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
      error: null,
    })

    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: "Invalid credentials" },
    })

    render(<ChangePasswordForm />)

    const currentPasswordInput = screen.getByLabelText("Current Password")
    const newPasswordInput = screen.getByLabelText("New Password")
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password")

    fireEvent.change(currentPasswordInput, { target: { value: "wrongpass" } })
    fireEvent.change(newPasswordInput, { target: { value: "newpass123" } })
    fireEvent.change(confirmPasswordInput, { target: { value: "newpass123" } })

    const submitButton = screen.getByRole("button", { name: /Update Password/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("Current password is incorrect")).toBeInTheDocument()
    })
  })

  it("should successfully change password", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
      error: null,
    })

    mockSignInWithPassword.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
      error: null,
    })

    mockUpdateUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
      error: null,
    })

    render(<ChangePasswordForm />)

    const currentPasswordInput = screen.getByLabelText("Current Password")
    const newPasswordInput = screen.getByLabelText("New Password")
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password")

    fireEvent.change(currentPasswordInput, { target: { value: "oldpass123" } })
    fireEvent.change(newPasswordInput, { target: { value: "newpass123" } })
    fireEvent.change(confirmPasswordInput, { target: { value: "newpass123" } })

    const submitButton = screen.getByRole("button", { name: /Update Password/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("Password changed successfully! Redirecting...")).toBeInTheDocument()
    })

    expect(mockGetUser).toHaveBeenCalled()
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "oldpass123",
    })
    expect(mockUpdateUser).toHaveBeenCalledWith({
      password: "newpass123",
    })
  })

  it("should show loading state during submission", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
      error: null,
    })

    mockSignInWithPassword.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
      error: null,
    })

    mockUpdateUser.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: {}, error: null }), 100)),
    )

    render(<ChangePasswordForm />)

    const currentPasswordInput = screen.getByLabelText("Current Password")
    const newPasswordInput = screen.getByLabelText("New Password")
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password")

    fireEvent.change(currentPasswordInput, { target: { value: "oldpass123" } })
    fireEvent.change(newPasswordInput, { target: { value: "newpass123" } })
    fireEvent.change(confirmPasswordInput, { target: { value: "newpass123" } })

    const submitButton = screen.getByRole("button", { name: /Update Password/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("Updating password...")).toBeInTheDocument()
    })
  })
})
