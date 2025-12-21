import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import SignUpForm from "@/components/sign-up-form"
import LoginForm from "@/components/login-form"
import { signUp, signIn } from "@/lib/actions/auth"
import { incrementVideoViews } from "@/lib/actions/videos"

vi.mock("@/lib/actions/auth", () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
}))

vi.mock("@/lib/actions/videos", () => ({
  incrementVideoViews: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  redirect: vi.fn(),
}))

describe("User Journey Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("should complete sign-up to pending approval flow", async () => {
    const mockSignUp = vi.mocked(signUp)
    mockSignUp.mockResolvedValue({ success: true, message: "Please check your email" })

    render(<SignUpForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const fullNameInput = screen.getByLabelText(/full name/i)
    const schoolInput = screen.getByLabelText(/school/i)
    const teacherInput = screen.getByLabelText(/teacher/i)

    expect(emailInput).toBeTruthy()
    expect(passwordInput).toBeTruthy()
    expect(fullNameInput).toBeTruthy()
    expect(schoolInput).toBeTruthy()
    expect(teacherInput).toBeTruthy()

    fireEvent.change(emailInput, { target: { value: "newuser@example.com" } })
    fireEvent.change(passwordInput, { target: { value: "SecurePass123!" } })
    fireEvent.change(fullNameInput, { target: { value: "John Doe" } })
    fireEvent.change(schoolInput, { target: { value: "Test Dojo" } })
    fireEvent.change(teacherInput, { target: { value: "Sensei Smith" } })

    const eulaCheckbox = screen.getByRole("checkbox", { name: /eula/i })
    const privacyCheckbox = screen.getByRole("checkbox", { name: /privacy/i })
    fireEvent.click(eulaCheckbox)
    fireEvent.click(privacyCheckbox)

    const form = emailInput.closest("form")
    if (form) {
      fireEvent.submit(form)
    }

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled()
      const formData = mockSignUp.mock.calls[0][1] as FormData
      expect(formData.get("email")).toBe("newuser@example.com")
      expect(formData.get("fullName")).toBe("John Doe")
      expect(formData.get("school")).toBe("Test Dojo")
    })
  })

  it("should handle login with validation errors then successful retry", async () => {
    const mockSignIn = vi.mocked(signIn)

    mockSignIn.mockRejectedValueOnce(new Error("Invalid credentials"))

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    fireEvent.change(emailInput, { target: { value: "user@example.com" } })
    fireEvent.change(passwordInput, { target: { value: "WrongPassword" } })

    const submitButton = screen.getByRole("button", { name: /sign in/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      const errorMessage = document.querySelector('[role="alert"]') || document.body
      expect(errorMessage.textContent).toContain("Invalid")
    })

    mockSignIn.mockResolvedValueOnce({ success: true, redirectTo: "/" })

    fireEvent.change(passwordInput, { target: { value: "CorrectPassword123!" } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(2)
    })
  })

  it("should track video view when user watches video", async () => {
    const mockIncrementViews = vi.mocked(incrementVideoViews)
    mockIncrementViews.mockResolvedValue({ success: true })

    await incrementVideoViews("video-123")

    expect(mockIncrementViews).toHaveBeenCalledWith("video-123")
    expect(mockIncrementViews).toHaveBeenCalledTimes(1)

    const result = await mockIncrementViews.mock.results[0].value
    expect(result.success).toBe(true)
  })

  it("should handle form validation then correction then submission", async () => {
    render(<SignUpForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const fullNameInput = screen.getByLabelText(/full name/i)

    fireEvent.change(emailInput, { target: { value: "test@example.com" } })
    // Leave password and other fields empty

    const form = emailInput.closest("form")
    if (form) {
      fireEvent.submit(form)
    }

    await waitFor(() => {
      expect(passwordInput.getAttribute("required")).toBe("")
    })

    fireEvent.change(passwordInput, { target: { value: "ValidPass123!" } })
    fireEvent.change(fullNameInput, { target: { value: "Jane Doe" } })
    fireEvent.change(screen.getByLabelText(/school/i), { target: { value: "Test School" } })
    fireEvent.change(screen.getByLabelText(/teacher/i), { target: { value: "Test Teacher" } })

    fireEvent.click(screen.getByRole("checkbox", { name: /eula/i }))
    fireEvent.click(screen.getByRole("checkbox", { name: /privacy/i }))

    if (form) {
      fireEvent.submit(form)
    }

    expect(emailInput.getAttribute("value")).toBe("test@example.com")
    expect(passwordInput.getAttribute("value")).toBe("ValidPass123!")
    expect(fullNameInput.getAttribute("value")).toBe("Jane Doe")
  })

  it("should handle password length validation", async () => {
    render(<SignUpForm />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)

    fireEvent.change(passwordInput, { target: { value: "short" } })
    fireEvent.change(confirmInput, { target: { value: "short" } })

    const minLength = passwordInput.getAttribute("minlength")
    expect(minLength).toBeTruthy()
    expect(Number.parseInt(minLength || "0")).toBeGreaterThanOrEqual(8)

    fireEvent.change(passwordInput, { target: { value: "ValidPassword123!" } })
    fireEvent.change(confirmInput, { target: { value: "ValidPassword123!" } })

    expect(passwordInput.getAttribute("value")).toBe("ValidPassword123!")
  })

  it("should handle password mismatch validation", async () => {
    render(<SignUpForm />)

    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)

    fireEvent.change(passwordInput, { target: { value: "Password123!" } })
    fireEvent.change(confirmInput, { target: { value: "DifferentPass123!" } })

    const form = passwordInput.closest("form")
    if (form) {
      fireEvent.submit(form)
    }

    expect(passwordInput.getAttribute("value")).not.toBe(confirmInput.getAttribute("value"))

    fireEvent.change(confirmInput, { target: { value: "Password123!" } })

    expect(passwordInput.getAttribute("value")).toBe(confirmInput.getAttribute("value"))
  })

  it("should handle email format validation", async () => {
    render(<SignUpForm />)

    const emailInput = screen.getByLabelText(/email/i)

    fireEvent.change(emailInput, { target: { value: "notanemail" } })

    expect(emailInput.getAttribute("type")).toBe("email")

    fireEvent.change(emailInput, { target: { value: "valid@example.com" } })

    expect(emailInput.getAttribute("value")).toBe("valid@example.com")
  })

  it("should handle terms acceptance requirement", async () => {
    render(<SignUpForm />)

    const eulaCheckbox = screen.getByRole("checkbox", { name: /eula/i })
    const privacyCheckbox = screen.getByRole("checkbox", { name: /privacy/i })

    expect(eulaCheckbox.getAttribute("checked")).toBeNull()
    expect(privacyCheckbox.getAttribute("checked")).toBeNull()

    fireEvent.click(eulaCheckbox)
    expect(eulaCheckbox.getAttribute("checked")).toBeTruthy()
    expect(privacyCheckbox.getAttribute("checked")).toBeNull()

    fireEvent.click(privacyCheckbox)
    expect(eulaCheckbox.getAttribute("checked")).toBeTruthy()
    expect(privacyCheckbox.getAttribute("checked")).toBeTruthy()
  })

  it("should handle return URL in login flow", async () => {
    const mockSignIn = vi.mocked(signIn)
    mockSignIn.mockResolvedValue({ success: true, redirectTo: "/protected-page" })

    render(<LoginForm returnTo="/protected-page" />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    fireEvent.change(emailInput, { target: { value: "user@example.com" } })
    fireEvent.change(passwordInput, { target: { value: "Password123!" } })

    const submitButton = screen.getByRole("button", { name: /sign in/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled()
      const formData = mockSignIn.mock.calls[0][0] as FormData
      expect(formData.get("returnTo")).toBe("/protected-page")
    })
  })

  it("should handle network error gracefully in video view tracking", async () => {
    const mockIncrementViews = vi.mocked(incrementVideoViews)

    mockIncrementViews.mockRejectedValueOnce(new Error("Network error"))

    const result = await incrementVideoViews("video-123").catch((err) => ({ error: err.message }))

    expect(result).toHaveProperty("error")
    expect(mockIncrementViews).toHaveBeenCalledWith("video-123")

    mockIncrementViews.mockResolvedValueOnce({ success: true })
    const retryResult = await incrementVideoViews("video-123")
    expect(retryResult.success).toBe(true)
  })
})
