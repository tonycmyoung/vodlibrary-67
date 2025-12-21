import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import ResetPasswordForm from "@/components/reset-password-form"

// Mock Supabase client
const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockUnsubscribe = vi.fn()

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  })),
}))

// Mock the server action
vi.mock("@/lib/actions", () => ({
  updatePassword: vi.fn(),
}))

// Mock useFormState and useFormStatus
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom")
  return {
    ...actual,
    useFormState: vi.fn((action, initialState) => [null, vi.fn()]),
    useFormStatus: vi.fn(() => ({ pending: false })),
  }
})

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })
  })

  it("should show loading state initially", () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<ResetPasswordForm />)

    expect(screen.getByText(/verifying password reset link/i)).toBeInTheDocument()
  })

  it("should show form when session exists", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    })

    render(<ResetPasswordForm />)

    await waitFor(
      () => {
        expect(screen.getByText(/reset your password/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
      },
      { timeout: 2000 },
    )
  })

  it("should show error when no session after timeout", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<ResetPasswordForm />)

    await waitFor(
      () => {
        expect(screen.getByText(/auth session missing/i)).toBeInTheDocument()
        expect(screen.getByText(/unable to verify password reset link/i)).toBeInTheDocument()
      },
      { timeout: 6000 },
    )
  })

  it("should toggle password visibility", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    })

    render(<ResetPasswordForm />)

    await waitFor(() => {
      const passwordInput = screen.getByLabelText(/new password/i)
      expect(passwordInput).toHaveAttribute("type", "password")

      const toggleButton = passwordInput.parentElement?.querySelector("button")
      if (toggleButton) {
        fireEvent.click(toggleButton)
      }

      expect(passwordInput).toHaveAttribute("type", "text")
    })
  })

  it("should show validation indicators", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    })

    render(<ResetPasswordForm />)

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
      expect(screen.getByText(/passwords match/i)).toBeInTheDocument()
    })
  })

  it("should update validation when password is entered", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    })

    render(<ResetPasswordForm />)

    await waitFor(async () => {
      const passwordInput = screen.getByLabelText(/new password/i)
      fireEvent.change(passwordInput, { target: { value: "password123" } })

      const minLengthIndicator = screen.getByText(/at least 8 characters/i)
      expect(minLengthIndicator).toHaveClass("text-green-500")
    })
  })

  it("should have Return to Login button in error state", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<ResetPasswordForm />)

    await waitFor(
      () => {
        const returnButton = screen.getByRole("button", { name: /return to login/i })
        expect(returnButton).toBeInTheDocument()
      },
      { timeout: 6000 },
    )
  })
})
