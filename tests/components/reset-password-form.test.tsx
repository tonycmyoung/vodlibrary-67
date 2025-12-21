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

    expect(screen.getByText(/verifying password reset link/i)).toBeTruthy()
  })

  it("should show form when session exists", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    })

    render(<ResetPasswordForm />)

    await waitFor(
      () => {
        const titleElement = document.querySelector('[data-slot="card-title"]')
        expect(titleElement?.textContent).toMatch(/reset your password/i)
        // Verify both password inputs exist by their specific labels
        expect(screen.getByLabelText("New Password")).toBeTruthy()
        expect(screen.getByLabelText("Confirm New Password")).toBeTruthy()
      },
      { timeout: 2000 },
    )
  })

  it("should show error when no session after timeout", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<ResetPasswordForm />)

    await waitFor(
      () => {
        expect(screen.getByText(/auth session missing/i)).toBeTruthy()
        expect(screen.getByText(/unable to verify password reset link/i)).toBeTruthy()
      },
      { timeout: 7000 },
    )
  }, 10000) // Add test timeout as parameter to it() function

  it("should toggle password visibility", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    })

    render(<ResetPasswordForm />)

    await waitFor(() => {
      const passwordInput = screen.getByLabelText("New Password") as HTMLInputElement
      expect(passwordInput.type).toBe("password")

      const toggleButton = passwordInput.parentElement?.querySelector("button")
      if (toggleButton) {
        fireEvent.click(toggleButton)
        expect(passwordInput.type).toBe("text")
      }
    })
  })

  it("should show validation indicators", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    })

    render(<ResetPasswordForm />)

    await waitFor(() => {
      // Find validation indicators by their specific structure
      const minLengthText = screen.getByText(/at least 8 characters/i)
      const passwordsMatchText = screen.getByText(/passwords match/i)

      // Verify they exist in the validation section
      expect(minLengthText).toBeTruthy()
      expect(passwordsMatchText).toBeTruthy()
    })
  })

  it("should update validation when password is entered", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-123" } } },
      error: null,
    })

    render(<ResetPasswordForm />)

    await waitFor(async () => {
      const passwordInput = screen.getByLabelText("New Password") as HTMLInputElement
      fireEvent.change(passwordInput, { target: { value: "password123" } })

      const minLengthIndicator = screen.getByText(/at least 8 characters/i)
      // Verify the indicator has the success color class
      expect(minLengthIndicator.className).toContain("text-green-500")
    })
  })

  it("should have Return to Login button in error state", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })

    render(<ResetPasswordForm />)

    await waitFor(
      () => {
        const returnButton = screen.getByRole("button", { name: /return to login/i })
        expect(returnButton).toBeTruthy()
      },
      { timeout: 7000 },
    )
  }, 10000) // Add test timeout as parameter to it() function
})
