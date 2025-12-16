import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import LoginForm from "@/components/login-form"
import { createClient } from "@/lib/supabase/client"

// Mock dependencies
vi.mock("@/lib/actions", () => ({
  signIn: vi.fn(),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom")
  return {
    ...actual,
    useFormStatus: vi.fn(() => ({ pending: false })),
  }
})

describe("LoginForm", () => {
  const mockSupabase = {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
  })

  it("should render login form with all fields", () => {
    render(<LoginForm />)

    expect(screen.getByText(/Welcome to the/)).toBeInTheDocument()
    expect(screen.getByText(/Okinawa Kobudo Library/)).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument()
  })

  it("should display error message when error prop is provided", () => {
    render(<LoginForm error="Invalid credentials" />)

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument()
  })

  it("should render password reset link", () => {
    render(<LoginForm />)

    const resetLink = screen.getByRole("button", { name: /Forgot your password?/i })
    expect(resetLink).toBeInTheDocument()
  })

  it("should show password reset input when forgot password is clicked", () => {
    render(<LoginForm />)

    const resetLink = screen.getByRole("button", { name: /Forgot your password?/i })
    fireEvent.click(resetLink)

    expect(screen.getByPlaceholderText("Enter email for reset")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Send Reset/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
  })

  it("should hide password reset input when cancel is clicked", () => {
    render(<LoginForm />)

    const resetLink = screen.getByRole("button", { name: /Forgot your password?/i })
    fireEvent.click(resetLink)

    const cancelButton = screen.getByRole("button", { name: /Cancel/i })
    fireEvent.click(cancelButton)

    expect(screen.queryByPlaceholderText("Enter email for reset")).not.toBeInTheDocument()
  })

  it("should toggle password visibility", () => {
    render(<LoginForm />)

    const passwordInput = screen.getByLabelText("Password")
    expect(passwordInput).toHaveAttribute("type", "password")

    const toggleButton = screen.getByRole("button", { name: "" })
    fireEvent.click(toggleButton)

    expect(passwordInput).toHaveAttribute("type", "text")

    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute("type", "password")
  })

  it("should call resetPasswordForEmail when reset form is submitted", async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    render(<LoginForm />)

    const resetLink = screen.getByRole("button", { name: /Forgot your password?/i })
    fireEvent.click(resetLink)

    const emailInput = screen.getByPlaceholderText("Enter email for reset")
    fireEvent.change(emailInput, { target: { value: "test@example.com" } })

    const sendButton = screen.getByRole("button", { name: /Send Reset/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith("test@example.com", {
        redirectTo: expect.stringContaining("/auth/reset-password"),
      })
    })
  })

  it("should show success message after successful password reset", async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    render(<LoginForm />)

    const resetLink = screen.getByRole("button", { name: /Forgot your password?/i })
    fireEvent.click(resetLink)

    const emailInput = screen.getByPlaceholderText("Enter email for reset")
    fireEvent.change(emailInput, { target: { value: "test@example.com" } })

    const sendButton = screen.getByRole("button", { name: /Send Reset/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/Password reset email sent!/i)).toBeInTheDocument()
    })
  })

  it("should show error message when password reset fails", async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "Error" } })
    render(<LoginForm />)

    const resetLink = screen.getByRole("button", { name: /Forgot your password?/i })
    fireEvent.click(resetLink)

    const emailInput = screen.getByPlaceholderText("Enter email for reset")
    fireEvent.change(emailInput, { target: { value: "test@example.com" } })

    const sendButton = screen.getByRole("button", { name: /Send Reset/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/Failed to send reset email/i)).toBeInTheDocument()
    })
  })

  it("should show validation error when reset email is empty", async () => {
    render(<LoginForm />)

    const resetLink = screen.getByRole("button", { name: /Forgot your password?/i })
    fireEvent.click(resetLink)

    const sendButton = screen.getByRole("button", { name: /Send Reset/i })
    const form = sendButton.closest("form")
    if (form) {
      fireEvent.submit(form)
    }

    await waitFor(() => {
      expect(screen.getByText(/Please enter your email address/i)).toBeInTheDocument()
    })
  })

  it("should render sign up link", () => {
    render(<LoginForm />)

    const signUpLink = screen.getByRole("link", { name: /Request one/i })
    expect(signUpLink).toBeInTheDocument()
    expect(signUpLink).toHaveAttribute("href", "/auth/sign-up")
  })

  it("should include returnTo in hidden input when provided", () => {
    render(<LoginForm returnTo="/dashboard" />)

    const returnToInput = document.querySelector('input[name="returnTo"]')
    expect(returnToInput).toBeInTheDocument()
    expect(returnToInput).toHaveAttribute("value", "/dashboard")
  })

  it("should render EULA text", () => {
    render(<LoginForm />)

    expect(screen.getByText(/End User License Agreement/i)).toBeInTheDocument()
    expect(screen.getByText(/Tony Young/i)).toBeInTheDocument()
  })
})
