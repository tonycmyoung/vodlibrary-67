import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchNotificationsWithSenders, sendNotificationWithEmail } from "@/lib/actions/notifications"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"

// Mock Next.js modules
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

// Mock Supabase
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}))

// Mock helper functions
vi.mock("@/lib/utils/helpers", () => ({
  sanitizeHtml: vi.fn((str: string) => str),
  siteTitle: "Test Site",
}))

vi.mock("@/lib/actions/email", () => ({
  sendEmail: vi.fn(),
}))

describe("Notification Actions", () => {
  const mockServiceClient = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  }

  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockReturnValue(mockServiceClient as any)
    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any)
  })

  describe("fetchNotificationsWithSenders", () => {
    it("should successfully fetch notifications with sender details", async () => {
      const mockNotifications = [
        {
          id: "notif-1",
          sender_id: "user-1",
          message: "Test notification",
          is_read: false,
          created_at: new Date().toISOString(),
          sender: {
            full_name: "John Doe",
            email: "john@example.com",
            profile_image_url: "https://example.com/image.jpg",
          },
        },
      ]

      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockNotifications, error: null }),
      })

      const result = await fetchNotificationsWithSenders("user-123")

      expect(result).toEqual({ data: mockNotifications, error: null })
      expect(mockServiceClient.from).toHaveBeenCalledWith("notifications")
    })

    it("should handle database errors", async () => {
      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: "Database error" } }),
      })

      const result = await fetchNotificationsWithSenders("user-123")

      expect(result).toEqual({ error: "Failed to fetch notifications", data: [] })
    })

    it("should return empty array when no notifications found", async () => {
      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })

      const result = await fetchNotificationsWithSenders("user-123")

      expect(result).toEqual({ data: [], error: null })
    })
  })

  describe("sendNotificationWithEmail", () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "sender-123" } },
        error: null,
      })

      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { full_name: "Sender Name" },
          error: null,
        }),
      })
    })

    it("should return error when message is missing", async () => {
      const result = await sendNotificationWithEmail({
        recipientId: "user-123",
        message: "",
        isBroadcast: false,
      })

      expect(result).toEqual({ error: "Message is required" })
    })

    it("should return error when user is not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await sendNotificationWithEmail({
        recipientId: "user-123",
        message: "Test message",
        isBroadcast: false,
      })

      expect(result).toEqual({ error: "Not authenticated" })
    })

    it("should successfully send individual notification", async () => {
      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: "user-123", email: "recipient@example.com", full_name: "Recipient Name" },
              error: null,
            }),
          }
        }
        if (table === "notifications") {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return mockServiceClient.from()
      })

      const result = await sendNotificationWithEmail({
        recipientId: "user-123",
        message: "Test message",
        isBroadcast: false,
      })

      expect(result).toEqual({ success: "Notification sent successfully" })
    })

    it("should successfully send broadcast notification to all users", async () => {
      const mockUsers = [
        { id: "user-1", email: "user1@example.com", full_name: "User 1" },
        { id: "user-2", email: "user2@example.com", full_name: "User 2" },
      ]

      let fromCallCount = 0
      mockServiceClient.from.mockImplementation((table: string) => {
        fromCallCount++

        if (fromCallCount === 1) {
          // Get sender profile
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { full_name: "Sender Name" },
                  error: null,
                }),
              }),
            }),
          }
        } else if (fromCallCount === 2) {
          // Get all users
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockUsers, error: null }),
            }),
          }
        } else {
          // Insert notifications
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
      })

      const result = await sendNotificationWithEmail({
        message: "Broadcast message",
        isBroadcast: true,
        broadcastRole: "all",
      })

      expect(result).toEqual({ success: "Notification sent successfully" })
    })

    it("should handle sending to admin when recipientId is 'admin'", async () => {
      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          const callIndex = vi.mocked(mockServiceClient.from).mock.calls.length
          if (callIndex === 2) {
            // Second call to find admin
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: "admin-123" },
                error: null,
              }),
            }
          }
          if (callIndex === 3) {
            // Third call to get recipient details
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { email: "admin@example.com", full_name: "Admin" },
                error: null,
              }),
            }
          }
          // First call to get sender
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { full_name: "Sender Name" },
              error: null,
            }),
          }
        }
        if (table === "notifications") {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return mockServiceClient.from()
      })

      const result = await sendNotificationWithEmail({
        recipientId: "admin",
        message: "Message to admin",
        isBroadcast: false,
      })

      expect(result).toEqual({ success: "Notification sent successfully" })
    })
  })
})
