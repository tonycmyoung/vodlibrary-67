import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import SendMessageForm from "@/components/send-message-form"

// Mock the server action
const mockSendNotificationWithEmail = vi.fn()

vi.mock("@/lib/actions", () => ({
  sendNotificationWithEmail: mockSendNotificationWithEmail,
}))

describe("SendMessageForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render form with user information", () => {
    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    expect(screen.getByText(/send message to admin/i)).toBeInTheDocument()
    expect(screen.getByText(/from: john doe/i)).toBeInTheDocument()
  })

  it("should display Unknown User when userName is null", () => {
    render(<SendMessageForm userId="user-123" userName={null} />)

    expect(screen.getByText(/from: unknown user/i)).toBeInTheDocument()
  })

  it("should have textarea with correct placeholder", () => {
    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const textarea = screen.getByPlaceholderText(/type your message here/i)
    expect(textarea).toBeInTheDocument()
  })

  it("should show character counter", () => {
    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    expect(screen.getByText(/0\/500 characters/i)).toBeInTheDocument()
  })

  it("should update character counter when typing", () => {
    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const textarea = screen.getByPlaceholderText(/type your message here/i)
    fireEvent.change(textarea, { target: { value: "Hello!" } })

    expect(screen.getByText(/6\/500 characters/i)).toBeInTheDocument()
  })

  it("should disable send button when message is empty", () => {
    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const sendButton = screen.getByRole("button", { name: /send message/i })
    expect(sendButton).toBeDisabled()
  })

  it("should enable send button when message has content", () => {
    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const textarea = screen.getByPlaceholderText(/type your message here/i)
    fireEvent.change(textarea, { target: { value: "Test message" } })

    const sendButton = screen.getByRole("button", { name: /send message/i })
    expect(sendButton).not.toBeDisabled()
  })

  it("should show error when trying to send empty message", () => {
    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const form = screen.getByRole("button", { name: /send message/i }).closest("form")
    if (form) {
      fireEvent.submit(form)
    }

    expect(screen.getByText(/please enter a message/i)).toBeInTheDocument()
  })

  it("should call sendNotificationWithEmail on submit", async () => {
    mockSendNotificationWithEmail.mockResolvedValue({ success: true })

    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const textarea = screen.getByPlaceholderText(/type your message here/i)
    fireEvent.change(textarea, { target: { value: "Test message" } })

    const sendButton = screen.getByRole("button", { name: /send message/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(mockSendNotificationWithEmail).toHaveBeenCalledWith({
        recipientId: "admin",
        message: "Test message",
        isBroadcast: false,
      })
    })
  })

  it("should show success message after sending", async () => {
    mockSendNotificationWithEmail.mockResolvedValue({ success: true })

    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const textarea = screen.getByPlaceholderText(/type your message here/i)
    fireEvent.change(textarea, { target: { value: "Test message" } })

    const sendButton = screen.getByRole("button", { name: /send message/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/message sent successfully/i)).toBeInTheDocument()
    })
  })

  it("should clear form after successful send", async () => {
    mockSendNotificationWithEmail.mockResolvedValue({ success: true })

    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const textarea = screen.getByPlaceholderText(/type your message here/i)
    fireEvent.change(textarea, { target: { value: "Test message" } })

    const sendButton = screen.getByRole("button", { name: /send message/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(textarea).toHaveValue("")
    })
  })

  it("should show error message on failure", async () => {
    mockSendNotificationWithEmail.mockResolvedValue({ error: "Failed to send" })

    render(<SendMessageForm userId="user-123" userName="John Doe" />)

    const textarea = screen.getByPlaceholderText(/type your message here/i)
    fireEvent.change(textarea, { target: { value: "Test message" } })

    const sendButton = screen.getByRole("button", { name: /send message/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/failed to send message/i)).toBeInTheDocument()
    })
  })
})
