import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import NotificationBell from "@/components/notification-bell"
import { createClient } from "@/lib/supabase/client"
import { fetchNotificationsWithSenders } from "@/lib/actions"
import { useRouter } from "next/navigation"

vi.mock("@/lib/supabase/client")
vi.mock("@/lib/actions")
vi.mock("next/navigation")
vi.mock("@/lib/utils/date", () => ({
  formatTimeAgo: (date: string) => "2 hours ago",
}))

const mockPush = vi.fn()
const mockFrom = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockIn = vi.fn()
const mockSelect = vi.fn()

const mockNotifications = [
  {
    id: "notif-1",
    sender_id: "user-1",
    message: "Test notification 1",
    is_read: false,
    created_at: "2024-01-01T00:00:00Z",
    sender: {
      full_name: "John Doe",
      email: "john@example.com",
      profile_image_url: null,
    },
  },
  {
    id: "notif-2",
    sender_id: "user-2",
    message: "Test notification 2",
    is_read: true,
    created_at: "2024-01-02T00:00:00Z",
    sender: {
      full_name: "Jane Smith",
      email: "jane@example.com",
      profile_image_url: null,
    },
  },
]

describe("NotificationBell", () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any)
    vi.mocked(fetchNotificationsWithSenders).mockResolvedValue({
      data: mockNotifications,
      error: null,
    })

    mockEq.mockResolvedValue({ data: null, error: null })
    mockIn.mockReturnValue({ select: mockSelect })
    mockSelect.mockResolvedValue({ data: null, error: null })
    mockUpdate.mockReturnValue({ eq: mockEq, in: mockIn })
    mockDelete.mockReturnValue({ eq: mockEq, in: mockIn })

    mockFrom.mockReturnValue({
      update: mockUpdate,
      delete: mockDelete,
    })

    vi.mocked(createClient).mockReturnValue({
      from: mockFrom,
    } as any)
  })

  it("should render notification bell button", () => {
    render(<NotificationBell userId="user-123" />)
    expect(screen.getByRole("button")).toBeTruthy()
  })

  it("should display unread count badge", async () => {
    render(<NotificationBell userId="user-123" />)

    await waitFor(() => {
      expect(screen.getByText("1")).toBeTruthy()
    })
  })

  it("should not display badge when no unread notifications", async () => {
    vi.mocked(fetchNotificationsWithSenders).mockResolvedValue({
      data: mockNotifications.map((n) => ({ ...n, is_read: true })),
      error: null,
    })

    render(<NotificationBell userId="user-123" />)

    await waitFor(() => {
      expect(fetchNotificationsWithSenders).toHaveBeenCalled()
    })

    expect(screen.queryByText("1")).toBeNull()
  })

  it("should open dropdown when bell is clicked", async () => {
    render(<NotificationBell userId="user-123" />)

    await user.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeTruthy()
    })
  })

  it("should display all notifications in dropdown", async () => {
    render(<NotificationBell userId="user-123" />)

    await user.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByText("Test notification 1")).toBeTruthy()
      expect(screen.getByText("Test notification 2")).toBeTruthy()
    })
  })

  it("should show sender names", async () => {
    render(<NotificationBell userId="user-123" />)

    await user.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
      expect(screen.getByText("Jane Smith")).toBeTruthy()
    })
  })

  it("should mark notification as read when check button is clicked", async () => {
    render(<NotificationBell userId="user-123" />)

    await user.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByText("Test notification 1")).toBeTruthy()
    })

    const checkButtons = screen.getAllByTitle("Mark as read")
    await user.click(checkButtons[0])

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith("id", "notif-1")
    })
  })

  it("should delete notification when delete button is clicked", async () => {
    render(<NotificationBell userId="user-123" />)

    await user.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByText("Test notification 1")).toBeTruthy()
    })

    const deleteButtons = screen.getAllByTitle("Delete notification")
    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled()
    })
  })

  it("should mark all notifications as read", async () => {
    render(<NotificationBell userId="user-123" />)

    await user.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByText(/1 unread/)).toBeTruthy()
    })

    await user.click(screen.getByText(/all read/i))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockIn).toHaveBeenCalledWith("id", ["notif-1"])
    })
  })

  it("should delete all notifications", async () => {
    render(<NotificationBell userId="user-123" />)

    await user.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByText("Test notification 1")).toBeTruthy()
    })

    await user.click(screen.getByText(/clear all/i))

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled()
      expect(mockIn).toHaveBeenCalledWith("id", ["notif-1", "notif-2"])
    })
  })

  it("should show empty state when no notifications", async () => {
    vi.mocked(fetchNotificationsWithSenders).mockResolvedValue({
      data: [],
      error: null,
    })

    render(<NotificationBell userId="user-123" />)

    await user.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByText("No notifications yet")).toBeTruthy()
    })
  })

  it("should navigate to admin notifications on reply for admin users", async () => {
    render(<NotificationBell userId="user-123" isAdmin={true} />)

    await user.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByText("Test notification 1")).toBeTruthy()
    })

    const replyButtons = screen.getAllByTitle("Reply")
    await user.click(replyButtons[0])

    expect(mockPush).toHaveBeenCalledWith("/admin/notifications?replyTo=user-1")
  })

  it("should navigate to contact page on reply for regular users", async () => {
    render(<NotificationBell userId="user-123" isAdmin={false} />)

    await user.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByText("Test notification 1")).toBeTruthy()
    })

    const replyButtons = screen.getAllByTitle("Reply")
    await user.click(replyButtons[0])

    expect(mockPush).toHaveBeenCalledWith("/contact")
  })

  it("should display purple badge for admin users", () => {
    render(<NotificationBell userId="user-123" isAdmin={true} />)
    const button = screen.getByRole("button")
    expect(button).toHaveClass("hover:ring-purple-500/50")
  })

  it("should display red badge for regular users", () => {
    render(<NotificationBell userId="user-123" isAdmin={false} />)
    const button = screen.getByRole("button")
    expect(button).toHaveClass("hover:ring-yellow-400/50")
  })

  it("should not fetch notifications with invalid userId", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    render(<NotificationBell userId="" />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid userId"), expect.anything())
    })

    consoleSpy.mockRestore()
  })
})
