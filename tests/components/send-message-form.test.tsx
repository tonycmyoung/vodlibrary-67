import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import SendMessageForm from "@/components/send-message-form"

vi.mock("@/lib/actions", () => ({
  sendNotificationWithEmail: vi.fn(),
}))

// Import the mocked function after the mock is defined
import { sendNotificationWithEmail } from "@/lib/actions"

describe("SendMessageForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render form with user information", () => {
    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    // Verify card title exists
    const title = screen.getByRole("heading", { name: /send message to admin/i })
    expect(title).toBeTruthy()
    // Verify user name appears in the from label
    const fromLabel = screen.getByText(/from:/i).closest("p")
    expect(fromLabel?.textContent).toContain("John Doe")
  })

  it("should display Unknown User when userName is null", () => {
    render(<SendMessageForm userId="user-123" userName={null} />)

    const fromLabel = screen.getByText(/from:/i).closest("p")
    expect(fromLabel?.textContent).toContain("Unknown User")
  })

  it("should have textarea with correct placeholder", () => {
    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const textarea = screen.getByPlaceholderText(/type your message here/i) as HTMLTextAreaElement
    expect(textarea.tagName).toBe("TEXTAREA")
    expect(textarea.maxLength).toBe(500)
  })

  it("should show character counter", () => {
    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const counter = screen.getByText(/0\/500 characters/i)
    expect(counter.className).toContain("text-xs")
  })

  it("should update character counter when typing", () => {
    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const textarea = screen.getByPlaceholderText(/type your message here/i)
    fireEvent.change(textarea, { target: { value: "Hello!" } })

    const counter = screen.getByText(/6\/500 characters/i)
    expect(counter).toBeTruthy()
  })

  it("should disable send button when message is empty", () => {
    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const sendButton = screen.getByRole("button", { name: /send message/i })
    expect(sendButton.hasAttribute("disabled")).toBe(true)
  })

  it("should enable send button when message has content", () => {
    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const textarea = screen.getByPlaceholderText(/type your message here/i)
    fireEvent.change(textarea, { target: { value: "Test message" } })

    const sendButton = screen.getByRole("button", { name: /send message/i })
    expect(sendButton.hasAttribute("disabled")).toBe(false)
  })

  it("should show error when trying to send empty message", () => {
    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const form = screen.getByRole("button", { name: /send message/i }).closest("form")
    if (form) {
      fireEvent.submit(form)
    }

    const errorMessage = screen.getByText(/please enter a message/i)
    // Verify it's in an error styled container
    expect(errorMessage.closest("div")?.className).toContain("red-500")
  })

  it("should call sendNotificationWithEmail on submit", async () => {
    vi.mocked(sendNotificationWithEmail).mockResolvedValue({ success: true })

    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const textarea = screen.getByPlaceholderText(/type your message here/i)
    fireEvent.change(textarea, { target: { value: "Test message" } })

    const sendButton = screen.getByRole("button", { name: /send message/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(sendNotificationWithEmail).toHaveBeenCalledWith({
        recipientId: "admin",
        message: "Test message",
        isBroadcast: false,
      })
    })
  })

  it("should show success message after sending", async () => {
    vi.mocked(sendNotificationWithEmail).mockResolvedValue({ success: true })

    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const textarea = screen.getByPlaceholderText(/type your message here/i)
    fireEvent.change(textarea, { target: { value: "Test message" } })

    const sendButton = screen.getByRole("button", { name: /send message/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      const successMessage = screen.getByText(/message sent successfully/i)
      // Verify it's in a success styled container
      expect(successMessage.closest("div")?.className).toContain("green-500")
    })
  })

  it("should clear form after successful send", async () => {
    vi.mocked(sendNotificationWithEmail).mockResolvedValue({ success: true })

    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const textarea = screen.getByPlaceholderText(/type your message here/i) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: "Test message" } })

    const sendButton = screen.getByRole("button", { name: /send message/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(textarea.value).toBe("")
    })
  })

  it("should show error message on failure", async () => {
    vi.mocked(sendNotificationWithEmail).mockResolvedValue({ error: "Failed to send" })

    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const textarea = screen.getByPlaceholderText(/type your message here/i)
    fireEvent.change(textarea, { target: { value: "Test message" } })

    const sendButton = screen.getByRole("button", { name: /send message/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      const errorMessage = screen.getByText(/failed to send message/i)
      // Verify it's in an error styled container
      expect(errorMessage.closest("div")?.className).toContain("red-500")
    })
  })
})
