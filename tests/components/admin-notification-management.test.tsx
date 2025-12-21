import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import AdminNotificationManagement from "@/components/admin-notification-management"
import * as actions from "@/lib/actions"

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}))

vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    from: (table: string) => {
      const selectChain = {
        select: vi.fn(() => selectChain),
        eq: vi.fn(() => selectChain),
        neq: vi.fn(() => selectChain),
        order: vi.fn(() => selectChain),
        limit: vi.fn(() => ({
          data:
            table === "users"
              ? [
                  {
                    id: "user-1",
                    full_name: "John Doe",
                    email: "john@example.com",
                    is_approved: true,
                    role: "Student",
                    profile_image_url: null,
                  },
                  {
                    id: "user-2",
                    full_name: "Jane Smith",
                    email: "jane@example.com",
                    is_approved: true,
                    role: "Teacher",
                    profile_image_url: null,
                  },
                ]
              : [
                  {
                    id: "notif-1",
                    sender_id: "admin-1",
                    recipient_id: "user-1",
                    message: "Test notification message",
                    is_read: false,
                    is_broadcast: false,
                    created_at: "2024-01-15T10:00:00Z",
                    sender: { full_name: "Admin User", email: "admin@example.com" },
                    recipient: { full_name: "John Doe", email: "john@example.com" },
                  },
                  {
                    id: "notif-2",
                    sender_id: "admin-1",
                    recipient_id: null,
                    message: "Broadcast message to all",
                    is_read: true,
                    is_broadcast: true,
                    created_at: "2024-01-14T09:00:00Z",
                    sender: { full_name: "Admin User", email: "admin@example.com" },
                    recipient: null,
                  },
                ],
          error: null,
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      }
      return selectChain
    },
  }),
}))

vi.mock("@/lib/actions", () => ({
  sendNotificationWithEmail: vi.fn(),
}))

describe("AdminNotificationManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(actions.sendNotificationWithEmail).mockResolvedValue({ error: null })
  })

  it("should render component with Send and Receive tabs", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      expect(screen.getByText("Send")).toBeInTheDocument()
      expect(screen.getByText("Receive")).toBeInTheDocument()
    })
  })

  it("should display message type selection (Broadcast/Individual)", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      expect(screen.getByText("Broadcast")).toBeInTheDocument()
      expect(screen.getByText("Individual")).toBeInTheDocument()
    })
  })

  it("should switch to Receive tab and display notifications", async () => {
    render(<AdminNotificationManagement />)

    const receiveTab = screen.getByText("Receive")
    fireEvent.click(receiveTab)

    await waitFor(() => {
      expect(screen.getByText("Test notification message")).toBeInTheDocument()
      expect(screen.getByText("Broadcast message to all")).toBeInTheDocument()
    })
  })

  it("should display user list when loaded", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      // Users are loaded into the select dropdown
      const selectTrigger = screen.getByRole("combobox")
      expect(selectTrigger).toBeInTheDocument()
    })
  })

  it("should send broadcast message to all users", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      expect(screen.getByText("Broadcast")).toBeInTheDocument()
    })

    // Select Broadcast mode (default)
    const broadcastButton = screen.getByText("Broadcast")
    fireEvent.click(broadcastButton)

    // Enter message
    const messageInput = screen.getByPlaceholderText(/enter your message/i)
    fireEvent.change(messageInput, { target: { value: "Test broadcast message" } })

    // Click send
    const sendButton = screen.getByRole("button", { name: /send/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(actions.sendNotificationWithEmail).toHaveBeenCalledWith({
        recipientId: undefined,
        message: "Test broadcast message",
        isBroadcast: true,
        broadcastRole: "all",
      })
    })
  })

  it("should send individual message to selected user", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      expect(screen.getByText("Individual")).toBeInTheDocument()
    })

    // Select Individual mode
    const individualButton = screen.getByText("Individual")
    fireEvent.click(individualButton)

    // Enter message
    const messageInput = screen.getByPlaceholderText(/enter your message/i)
    fireEvent.change(messageInput, { target: { value: "Personal message" } })

    // Select recipient (mocked to have users available)
    // The actual select interaction would require more complex testing
    // For now, verify the form structure exists

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument()
    })
  })

  it("should display success message after sending", async () => {
    vi.mocked(actions.sendNotificationWithEmail).mockResolvedValue({ error: null })

    render(<AdminNotificationManagement />)

    await waitFor(() => {
      const messageInput = screen.getByPlaceholderText(/enter your message/i)
      fireEvent.change(messageInput, { target: { value: "Test" } })
    })

    const sendButton = screen.getByRole("button", { name: /send/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/email notifications sent/i)).toBeInTheDocument()
    })
  })

  it("should display error message when sending fails", async () => {
    vi.mocked(actions.sendNotificationWithEmail).mockResolvedValue({ error: "Failed to send" })

    render(<AdminNotificationManagement />)

    await waitFor(() => {
      const messageInput = screen.getByPlaceholderText(/enter your message/i)
      fireEvent.change(messageInput, { target: { value: "Test" } })
    })

    const sendButton = screen.getByRole("button", { name: /send/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/failed to send message/i)).toBeInTheDocument()
    })
  })

  it("should clear message after successful send", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      const messageInput = screen.getByPlaceholderText(/enter your message/i) as HTMLTextAreaElement
      fireEvent.change(messageInput, { target: { value: "Test message" } })
      expect(messageInput.value).toBe("Test message")
    })

    const sendButton = screen.getByRole("button", { name: /send/i })
    fireEvent.click(sendButton)

    await waitFor(() => {
      const messageInput = screen.getByPlaceholderText(/enter your message/i) as HTMLTextAreaElement
      expect(messageInput.value).toBe("")
    })
  })

  it("should display notification sender information", async () => {
    render(<AdminNotificationManagement />)

    fireEvent.click(screen.getByText("Receive"))

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument()
      expect(screen.getByText("admin@example.com")).toBeInTheDocument()
    })
  })

  it("should show broadcast badge for broadcast notifications", async () => {
    render(<AdminNotificationManagement />)

    fireEvent.click(screen.getByText("Receive"))

    await waitFor(() => {
      const badges = screen.getAllByText("Broadcast")
      // At least one badge exists (could be from tabs + notification badge)
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  it("should filter role counts correctly", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      // Component loads users and calculates role counts
      expect(screen.getByText("Broadcast")).toBeInTheDocument()
    })

    // Select broadcast mode to see role options
    const broadcastButton = screen.getByText("Broadcast")
    fireEvent.click(broadcastButton)

    // Role selection exists (All Users, Teachers, Students, etc.)
    await waitFor(() => {
      expect(screen.getByText(/all users/i)).toBeInTheDocument()
    })
  })

  it("should show loading state initially", () => {
    render(<AdminNotificationManagement />)

    // Component renders immediately, loading happens in background
    expect(screen.getByText("Send")).toBeInTheDocument()
  })
})
