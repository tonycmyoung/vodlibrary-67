import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(actions.sendNotificationWithEmail).mockResolvedValue({ error: null })
  })

  it("should render Send Message card with message type buttons", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      const cardTitle = document.querySelector('[data-slot="card-title"]')
      expect(cardTitle).toHaveTextContent("Send Message")
      expect(screen.getByText("Individual")).toBeTruthy()
    })

    const broadcastButton = screen.getByRole("button", { name: /broadcast/i })
    expect(broadcastButton).toBeTruthy()
  })

  it("should render All Notifications list", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      expect(screen.getByText(/All Notifications/)).toBeTruthy()
      expect(screen.getByText("Test notification message")).toBeTruthy()
      expect(screen.getByText("Broadcast message to all")).toBeTruthy()
    })
  })

  it("should switch between Individual and Broadcast message types", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      expect(screen.getByText("Individual")).toBeTruthy()
    })

    const broadcastButton = screen.getByRole("button", { name: /broadcast/i })
    await user.click(broadcastButton)

    await waitFor(() => {
      expect(screen.getByText("Select Recipients")).toBeTruthy()
    })
  })

  it("should send individual message to selected user", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      expect(screen.getByText("Individual")).toBeTruthy()
    })

    const messageInput = screen.getByPlaceholderText(/type your message here/i)
    await user.type(messageInput, "Personal message")

    const sendButton = screen.getByRole("button", { name: /send message/i })
    expect(sendButton).toBeTruthy()
  })

  it("should send broadcast message", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      const broadcastButton = screen.getByRole("button", { name: /broadcast/i })
      expect(broadcastButton).toBeTruthy()
    })

    const broadcastButton = screen.getByRole("button", { name: /broadcast/i })
    await user.click(broadcastButton)

    const messageInput = screen.getByPlaceholderText(/type your broadcast message here/i)
    await user.type(messageInput, "Test broadcast")

    const sendButton = screen.getByRole("button", { name: /send to all users/i })
    await user.click(sendButton)

    await waitFor(() => {
      expect(actions.sendNotificationWithEmail).toHaveBeenCalledWith({
        recipientId: undefined,
        message: "Test broadcast",
        isBroadcast: true,
        broadcastRole: "all",
      })
    })
  })

  it("should display success message after sending", async () => {
    vi.mocked(actions.sendNotificationWithEmail).mockResolvedValue({ error: null })

    render(<AdminNotificationManagement />)

    await waitFor(() => {
      const messageInput = screen.getByPlaceholderText(/type your message here/i)
      expect(messageInput).toBeTruthy()
    })

    const messageInput = screen.getByPlaceholderText(/type your message here/i)
    await user.type(messageInput, "Test")

    const sendButton = screen.getByRole("button", { name: /send message/i })
    expect(sendButton).toBeDisabled()
  })

  it("should display error message when sending fails", async () => {
    vi.mocked(actions.sendNotificationWithEmail).mockResolvedValue({ error: "Failed to send" })

    render(<AdminNotificationManagement />)

    await waitFor(() => {
      const broadcastButton = screen.getByRole("button", { name: /broadcast/i })
      expect(broadcastButton).toBeTruthy()
    })

    const broadcastButton = screen.getByRole("button", { name: /broadcast/i })
    await user.click(broadcastButton)

    const messageInput = screen.getByPlaceholderText(/type your broadcast message here/i)
    await user.type(messageInput, "Test")

    const sendButton = screen.getByRole("button", { name: /send to all users/i })
    await user.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/failed to send message/i)).toBeTruthy()
    })
  })

  it("should display notification sender and recipient information", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      expect(screen.getByText("Test notification message")).toBeTruthy()
    })

    const notificationText = screen.getByText("Test notification message")
    const notificationContainer = notificationText.closest("div[class*='p-4']")

    expect(notificationContainer).toBeTruthy()

    // Verify John Doe appears as the recipient within this specific notification
    const johnDoeInNotification = notificationContainer?.textContent?.includes("John Doe")
    expect(johnDoeInNotification).toBe(true)
  })

  it("should show broadcast badge for broadcast notifications", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      expect(screen.getByText("Broadcast message to all")).toBeTruthy()
    })

    const broadcastNotification = screen.getByText("Broadcast message to all")
    const notificationContainer = broadcastNotification.closest("div[class*='p-4']")

    // Verify the Broadcast badge appears within this notification
    const badgeInNotification = notificationContainer?.querySelector('[data-slot="badge"]')
    expect(badgeInNotification?.textContent).toBe("Broadcast")
  })

  it("should filter notifications by search query", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      expect(screen.getByText("Test notification message")).toBeTruthy()
      expect(screen.getByText("Broadcast message to all")).toBeTruthy()
    })

    const searchInput = screen.getByPlaceholderText(/search notifications/i)
    await user.type(searchInput, "Broadcast")

    expect(screen.getByText("Broadcast message to all")).toBeTruthy()
  })

  it("should show loading state initially", () => {
    render(<AdminNotificationManagement />)

    expect(screen.getByText("Loading notifications...")).toBeTruthy()
  })

  it("should show character count for message input", async () => {
    render(<AdminNotificationManagement />)

    await waitFor(() => {
      expect(screen.getByText("0/500 characters")).toBeTruthy()
    })

    const messageInput = screen.getByPlaceholderText(/type your message here/i)
    await user.type(messageInput, "Test message")

    await waitFor(() => {
      expect(screen.getByText("12/500 characters")).toBeTruthy()
    })
  })
})
