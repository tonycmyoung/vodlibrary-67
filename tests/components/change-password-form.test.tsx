import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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

    expect(screen.getByText("Change Password")).toBeTruthy()
    expect(screen.getByLabelText("Current Password")).toBeTruthy()
    expect(screen.getByLabelText("New Password")).toBeTruthy()
    expect(screen.getByLabelText("Confirm New Password")).toBeTruthy()
    expect(screen.getByRole("button", { name: /Update Password/i })).toBeTruthy()
  })

  it("should toggle current password visibility", async () => {
    const user = userEvent.setup()
    render(<ChangePasswordForm />)

    const currentPasswordInput = screen.getByLabelText("Current Password") as HTMLInputElement
    const toggleButton = currentPasswordInput.parentElement?.querySelector("button")!

    expect(currentPasswordInput.type).toBe("password")

    await user.click(toggleButton)
    expect(currentPasswordInput.type).toBe("text")

    await user.click(toggleButton)
    expect(currentPasswordInput.type).toBe("password")
  })

  it("should show error when fields are empty", async () => {
    const user = userEvent.setup()
    render(<ChangePasswordForm />)

    const form = screen.getByRole("button", { name: /Update Password/i }).closest("form")!
    await user.pointer({ keys: "[Enter]", target: form })

    await waitFor(() => {
      expect(screen.getByText("All fields are required")).toBeTruthy()
    })
  })

  it("should show error when new passwords don't match", async () => {
    const user = userEvent.setup()
    render(<ChangePasswordForm />)

    const currentPasswordInput = screen.getByLabelText("Current Password")
    const newPasswordInput = screen.getByLabelText("New Password")
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password")

    await user.type(currentPasswordInput, "oldpass123")
    await user.type(newPasswordInput, "newpass123")
    await user.type(confirmPasswordInput, "differentpass")

    const submitButton = screen.getByRole("button", { name: /Update Password/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("New passwords do not match")).toBeTruthy()
    })
  })

  it("should show error when password is too short", async () => {
    const user = userEvent.setup()
    render(<ChangePasswordForm />)

    const currentPasswordInput = screen.getByLabelText("Current Password")
    const newPasswordInput = screen.getByLabelText("New Password")
    const confirmPasswordInput = screen.getByLabelText("Confirm New Password")

    await user.type(currentPasswordInput, "oldpass")
    await user.type(newPasswordInput, "short")
    await user.type(confirmPasswordInput, "short")

    const submitButton = screen.getByRole("button", { name: /Update Password/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 6 characters long")).toBeTruthy()
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
      expect(screen.getByText("Current password is incorrect")).toBeTruthy()
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
      expect(screen.getByText("Password changed successfully! Redirecting...")).toBeTruthy()
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
      expect(screen.getByText("Updating password...")).toBeTruthy()
    })
  })
})
