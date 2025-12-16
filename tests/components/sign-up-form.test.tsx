import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import SignUpForm from "@/components/sign-up-form"

// Mock dependencies
vi.mock("@/lib/actions", () => ({
  signUp: vi.fn(),
}))

vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom")
  return {
    ...actual,
    useFormStatus: vi.fn(() => ({ pending: false })),
  }
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}))

describe("SignUpForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render sign up form with all fields", () => {
    render(<SignUpForm />)

    expect(screen.getByText(/Join Okinawa Kobudo Library/)).toBeInTheDocument()
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Teacher")).toBeInTheDocument()
    expect(screen.getByLabelText("School")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Create Account/i })).toBeInTheDocument()
  })

  it("should render legal agreement checkboxes", () => {
    render(<SignUpForm />)

    expect(screen.getByLabelText(/End User License Agreement/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Privacy Policy/i)).toBeInTheDocument()
  })

  it("should disable submit button when legal agreements are not checked", () => {
    render(<SignUpForm />)

    const submitButton = screen.getByRole("button", { name: /Create Account/i })
    expect(submitButton).toBeDisabled()
  })

  it("should enable submit button when both legal agreements are checked", () => {
    render(<SignUpForm />)

    const eulaCheckbox = screen.getByLabelText(/End User License Agreement/i)
    const privacyCheckbox = screen.getByLabelText(/Privacy Policy/i)

    fireEvent.click(eulaCheckbox)
    fireEvent.click(privacyCheckbox)

    const submitButton = screen.getByRole("button", { name: /Create Account/i })
    expect(submitButton).not.toBeDisabled()
  })

  it("should show warning when legal agreements are not accepted", () => {
    render(<SignUpForm />)

    expect(screen.getByText(/You must accept both the EULA and Privacy Policy/i)).toBeInTheDocument()
  })

  it("should hide warning when legal agreements are accepted", () => {
    render(<SignUpForm />)

    const eulaCheckbox = screen.getByLabelText(/End User License Agreement/i)
    const privacyCheckbox = screen.getByLabelText(/Privacy Policy/i)

    fireEvent.click(eulaCheckbox)
    fireEvent.click(privacyCheckbox)

    expect(screen.queryByText(/You must accept both the EULA and Privacy Policy/i)).not.toBeInTheDocument()
  })

  it("should toggle password visibility", () => {
    render(<SignUpForm />)

    const passwordInput = screen.getByLabelText("Password")
    expect(passwordInput).toHaveAttribute("type", "password")

    const toggleButtons = screen.getAllByRole("button")
    const toggleButton = toggleButtons.find((btn) => btn.querySelector("svg"))

    if (toggleButton) {
      fireEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute("type", "text")

      fireEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute("type", "password")
    }
  })

  it("should update form data when inputs change", () => {
    render(<SignUpForm />)

    const fullNameInput = screen.getByLabelText("Full Name")
    const emailInput = screen.getByLabelText("Email")
    const teacherInput = screen.getByLabelText("Teacher")
    const schoolInput = screen.getByLabelText("School")
    const passwordInput = screen.getByLabelText("Password")

    fireEvent.change(fullNameInput, { target: { value: "John Doe" } })
    fireEvent.change(emailInput, { target: { value: "john@example.com" } })
    fireEvent.change(teacherInput, { target: { value: "Sensei Smith" } })
    fireEvent.change(schoolInput, { target: { value: "Dojo ABC" } })
    fireEvent.change(passwordInput, { target: { value: "Password123!" } })

    expect(fullNameInput).toHaveValue("John Doe")
    expect(emailInput).toHaveValue("john@example.com")
    expect(teacherInput).toHaveValue("Sensei Smith")
    expect(schoolInput).toHaveValue("Dojo ABC")
    expect(passwordInput).toHaveValue("Password123!")
  })

  it("should display password requirements text", () => {
    render(<SignUpForm />)

    expect(screen.getByText(/min 6 characters with uppercase, lowercase, number, and symbol/i)).toBeInTheDocument()
  })

  it("should display admin approval notice", () => {
    render(<SignUpForm />)

    expect(screen.getByText(/Your account will require admin approval/i)).toBeInTheDocument()
  })

  it("should render sign in link", () => {
    render(<SignUpForm />)

    const signInLink = screen.getByRole("link", { name: /Sign in/i })
    expect(signInLink).toBeInTheDocument()
    expect(signInLink).toHaveAttribute("href", "/auth/login")
  })

  it("should render EULA and Privacy Policy links", () => {
    render(<SignUpForm />)

    const eulaLink = screen.getByRole("link", { name: /End User License Agreement.*EULA/i })
    const privacyLink = screen.getByRole("link", { name: /Privacy Policy/i })

    expect(eulaLink).toBeInTheDocument()
    expect(eulaLink).toHaveAttribute("href", "/eula")
    expect(privacyLink).toBeInTheDocument()
    expect(privacyLink).toHaveAttribute("href", "/privacy-policy")
  })
})
