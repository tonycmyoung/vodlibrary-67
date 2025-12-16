import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  updatePendingUserFields,
  updateUserFields,
  updateProfile,
  inviteUser,
  approveUserServerAction,
  rejectUserServerAction,
  deleteUserCompletely,
  updateUserBelt,
  fetchPendingUsers,
  fetchUnconfirmedEmailUsers,
  resendConfirmationEmail,
  fetchStudentsForHeadTeacher,
  adminResetUserPassword,
} from "@/lib/actions/users"
import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createMockSupabaseClient } from "@/tests/mocks/supabase"

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/actions/email", () => ({
  sendEmail: vi.fn(),
}))

vi.mock("@/lib/actions/audit", () => ({
  logAuditEvent: vi.fn(),
}))

describe("User Actions", () => {
  let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>
  let mockServiceClient: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseClient = createMockSupabaseClient()
    mockServiceClient = createMockSupabaseClient()
    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any)
    vi.mocked(createSupabaseClient).mockReturnValue(mockServiceClient as any)
  })

  describe("updatePendingUserFields", () => {
    it("should successfully update pending user fields", async () => {
      const result = await updatePendingUserFields("user-123", "John Doe", "Teacher Name", "School Name")

      expect(result).toEqual({ success: "Pending user fields updated successfully" })
      expect(mockServiceClient.from).toHaveBeenCalledWith("users")
    })

    it("should handle database errors", async () => {
      mockServiceClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: "Database error" } }),
        single: vi.fn(),
      })

      const result = await updatePendingUserFields("user-123", "John Doe", "Teacher", "School")

      expect(result).toEqual({ error: "Failed to update pending user fields" })
    })

    it("should trim whitespace from input fields", async () => {
      const updateMock = vi.fn().mockReturnThis()
      mockServiceClient.from.mockReturnValue({
        update: updateMock,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        single: vi.fn(),
      })

      await updatePendingUserFields("user-123", "  John Doe  ", "  Teacher  ", "  School  ")

      expect(updateMock).toHaveBeenCalledWith({
        full_name: "John Doe",
        teacher: "Teacher",
        school: "School",
      })
    })
  })

  describe("updateUserFields", () => {
    it("should successfully update user fields without belt", async () => {
      const result = await updateUserFields("user-123", "John Doe", "Teacher", "School")

      expect(result).toEqual({ success: "User fields updated successfully" })
    })

    it("should successfully update user fields with belt", async () => {
      const updateMock = vi.fn().mockReturnThis()
      mockServiceClient.from.mockReturnValue({
        update: updateMock,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        single: vi.fn(),
      })

      await updateUserFields("user-123", "John Doe", "Teacher", "School", "belt-456")

      expect(updateMock).toHaveBeenCalledWith({
        full_name: "John Doe",
        teacher: "Teacher",
        school: "School",
        current_belt_id: "belt-456",
      })
    })

    it("should handle null belt ID correctly", async () => {
      const updateMock = vi.fn().mockReturnThis()
      mockServiceClient.from.mockReturnValue({
        update: updateMock,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        single: vi.fn(),
      })

      await updateUserFields("user-123", "John Doe", "Teacher", "School", null)

      expect(updateMock).toHaveBeenCalledWith({
        full_name: "John Doe",
        teacher: "Teacher",
        school: "School",
        current_belt_id: null,
      })
    })

    it("should handle database errors", async () => {
      mockServiceClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: "Database error" } }),
        single: vi.fn(),
      })

      const result = await updateUserFields("user-123", "John Doe", "Teacher", "School")

      expect(result).toEqual({ error: "Failed to update user fields" })
    })
  })

  describe("updateProfile", () => {
    it("should successfully update user profile", async () => {
      mockServiceClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        single: vi.fn(),
      })

      const result = await updateProfile({
        userId: "user-123",
        email: "test@example.com",
        fullName: "John Doe",
        profileImageUrl: "https://example.com/image.jpg",
      })

      expect(result).toEqual({ success: true })
    })

    it("should return error when full name is missing", async () => {
      const result = await updateProfile({
        userId: "user-123",
        email: "test@example.com",
        fullName: null,
        profileImageUrl: null,
      })

      expect(result).toEqual({ error: "Name is required", success: false })
    })

    it("should handle database errors", async () => {
      mockServiceClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: "Database error" } }),
        single: vi.fn(),
      })

      const result = await updateProfile({
        userId: "user-123",
        email: "test@example.com",
        fullName: "John Doe",
        profileImageUrl: null,
      })

      expect(result).toEqual({ error: "Failed to update profile", success: false })
    })
  })

  describe("fetchPendingUsers", () => {
    it("should successfully fetch pending users", async () => {
      const mockPendingUsers = [
        { id: "user-1", email: "user1@example.com", is_approved: false, inviter: { full_name: "Admin" } },
        { id: "user-2", email: "user2@example.com", is_approved: false, inviter: { full_name: "Admin" } },
      ]

      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPendingUsers, error: null }),
      })

      const result = await fetchPendingUsers()

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({ id: "user-1", is_approved: false }),
          expect.objectContaining({ id: "user-2", is_approved: false }),
        ]),
        error: null,
      })
      expect(mockServiceClient.from).toHaveBeenCalledWith("users")
    })

    it("should handle database errors", async () => {
      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: "Database error" } }),
      })

      const result = await fetchPendingUsers()

      expect(result).toEqual({ error: "Failed to fetch pending users", data: [] })
    })

    it("should return empty array when no pending users", async () => {
      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })

      const result = await fetchPendingUsers()

      expect(result).toEqual({ data: [], error: null })
    })
  })

  describe("fetchUnconfirmedEmailUsers", () => {
    it("should successfully fetch unconfirmed email users", async () => {
      const mockAuthUsers = {
        users: [
          { id: "user-1", email: "user1@example.com", email_confirmed_at: null, created_at: "2024-01-01" },
          { id: "user-2", email: "user2@example.com", email_confirmed_at: null, created_at: "2024-01-02" },
        ],
      }

      mockServiceClient.auth = {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: mockAuthUsers, error: null }),
        },
      } as any

      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { id: "user-1", full_name: "User One", teacher: "Teacher A", school: "School A" },
            { id: "user-2", full_name: "User Two", teacher: "Teacher B", school: "School B" },
          ],
          error: null,
        }),
      })

      const result = await fetchUnconfirmedEmailUsers()

      expect(result.data).toHaveLength(2)
      expect(result.error).toBeNull()
    })

    it("should return empty array when no unconfirmed users", async () => {
      mockServiceClient.auth = {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [{ id: "user-1", email_confirmed_at: "2024-01-01" }],
            },
            error: null,
          }),
        },
      } as any

      const result = await fetchUnconfirmedEmailUsers()

      expect(result).toEqual({ data: [], error: null })
    })

    it("should return error when auth users fetch fails", async () => {
      mockServiceClient.auth = {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: null, error: { message: "Auth error" } }),
        },
      } as any

      const result = await fetchUnconfirmedEmailUsers()

      expect(result).toEqual({ error: "Failed to fetch unconfirmed email users", data: [] })
    })
  })

  describe("approveUserServerAction", () => {
    const mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    }

    beforeEach(() => {
      vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any)
    })

    it("should successfully approve user", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
      })

      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { email: "user@example.com", full_name: "Test User" },
            }),
            update: vi.fn().mockReturnThis(),
          }
        }
        return {}
      })

      const result = await approveUserServerAction("user-123", "Student")

      expect(result).toEqual({ success: "User approved successfully" })
    })

    it("should default to Student role when role not provided", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
      })

      const mockUpdate = vi.fn().mockReturnThis()
      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { email: "user@example.com", full_name: "Test User" },
            }),
            update: mockUpdate,
          }
        }
        return {}
      })

      await approveUserServerAction("user-123")

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "Student",
        }),
      )
    })
  })

  describe("rejectUserServerAction", () => {
    it("should successfully reject user by deleting from both tables", async () => {
      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })

      mockServiceClient.auth = {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
        },
      } as any

      const result = await rejectUserServerAction("user-123")

      expect(result).toEqual({ success: "User rejected successfully" })
      expect(mockServiceClient.auth.admin.deleteUser).toHaveBeenCalledWith("user-123")
    })

    it("should return error when public users deletion fails", async () => {
      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
          }
        }
        return {}
      })

      const result = await rejectUserServerAction("user-123")

      expect(result).toEqual({ error: "Failed to reject user" })
    })

    it("should return error when auth deletion fails", async () => {
      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })

      mockServiceClient.auth = {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ error: { message: "Auth delete failed" } }),
        },
      } as any

      const result = await rejectUserServerAction("user-123")

      expect(result).toEqual({ error: "Failed to completely remove user" })
    })
  })

  describe("resendConfirmationEmail", () => {
    const mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    }

    beforeEach(() => {
      vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any)
    })

    it("should successfully resend confirmation email", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { full_name: "Admin User", role: "Admin" },
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.auth.resend = vi.fn().mockResolvedValue({
        data: {},
        error: null,
      })

      const result = await resendConfirmationEmail("user@example.com")

      expect(result).toEqual({ success: "Confirmation email resent successfully" })
    })

    it("should return error when email is missing", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { full_name: "Admin User", role: "Admin" },
              error: null,
            }),
          }),
        }),
      })

      const result = await resendConfirmationEmail("")

      expect(result).toEqual({ error: "Email is required" })
    })

    it("should return error when resend fails", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { full_name: "Admin User", role: "Admin" },
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.auth.resend = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Resend failed" },
      })

      const result = await resendConfirmationEmail("user@example.com")

      expect(result).toEqual({ error: "Failed to resend confirmation email" })
    })
  })

  describe("fetchStudentsForHeadTeacher", () => {
    it("should fetch students for head teacher successfully", async () => {
      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: "student-1", full_name: "Student One", school: "School A", role: "Student" },
                { id: "student-2", full_name: "Student Two", school: "School A", role: "Student" },
              ],
              error: null,
            }),
          }
        }
        if (table === "user_logins") {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ user_id: "student-1", login_time: "2024-01-15T10:00:00Z" }],
              error: null,
            }),
          }
        }
        if (table === "user_video_views") {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ user_id: "student-1", viewed_at: "2024-01-15T11:00:00Z" }],
              error: null,
            }),
          }
        }
        return {}
      })

      const result = await fetchStudentsForHeadTeacher("School A", "head-123")

      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toHaveProperty("last_login")
      expect(result.data[0]).toHaveProperty("login_count")
      expect(result.data[0]).toHaveProperty("view_count")
      expect(result.error).toBeNull()
    })

    it("should handle database errors gracefully", async () => {
      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }
        }
        return {}
      })

      const result = await fetchStudentsForHeadTeacher("School A", "head-123")

      expect(result).toEqual({ error: "Failed to fetch students", data: [] })
    })

    it("should return empty array when no students found", async () => {
      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }
        }
        if (table === "user_logins") {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === "user_video_views") {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        return {}
      })

      const result = await fetchStudentsForHeadTeacher("School A", "head-123")

      expect(result).toEqual({ data: [], error: null })
    })
  })

  describe("adminResetUserPassword", () => {
    const mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    }

    beforeEach(() => {
      vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any)
    })

    it("should successfully reset user password", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
      })

      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { full_name: "Admin User", role: "Admin" },
              error: null,
            }),
          }),
        }),
      })

      mockServiceClient.auth = {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        },
      } as any

      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { email: "user@example.com" },
              error: null,
            }),
          }),
        }),
      })

      const result = await adminResetUserPassword("user-123", "NewPassword123!")

      expect(result).toEqual({ success: "Password reset successfully" })
    })

    it("should return error when password too short", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
      })

      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { full_name: "Admin User", role: "Admin" },
              error: null,
            }),
          }),
        }),
      })

      const result = await adminResetUserPassword("user-123", "short")

      expect(result).toEqual({
        error: "Password must be at least 8 characters long",
      })
    })

    it("should return error when user not found", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
      })

      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { full_name: "Admin User", role: "Admin" },
              error: null,
            }),
          }),
        }),
      })

      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "User not found" },
            }),
          }),
        }),
      })

      const result = await adminResetUserPassword("nonexistent-123", "NewPassword123!")

      expect(result).toEqual({ error: "User not found" })
    })

    it("should return error when password update fails", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
      })

      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { full_name: "Admin User", role: "Admin" },
              error: null,
            }),
          }),
        }),
      })

      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { email: "user@example.com" },
              error: null,
            }),
          }),
        }),
      })

      mockServiceClient.auth = {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Update failed" },
          }),
        },
      } as any

      const result = await adminResetUserPassword("user-123", "NewPassword123!")

      expect(result).toEqual({ error: "Failed to update password" })
    })
  })

  describe("inviteUser", () => {
    it("should successfully invite user", async () => {
      const mockSendEmail = vi.fn().mockResolvedValue({ success: true })
      const mockLogAuditEvent = vi.fn().mockResolvedValue({ success: true })

      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          inviteUserByEmail: vi.fn().mockResolvedValue({ error: null }),
        },
      } as any)

      const result = await inviteUser("user@example.com", "John Doe", "School A")

      expect(result).toEqual({ success: "User invited successfully" })
      expect(mockSendEmail).toHaveBeenCalledWith("user@example.com", "John Doe", "School A")
      expect(mockLogAuditEvent).toHaveBeenCalledWith("user@example.com", "John Doe", "School A")
    })

    it("should return error when email is missing", async () => {
      const result = await inviteUser("", "John Doe", "School A")

      expect(result).toEqual({ error: "Email is required" })
    })

    it("should return error when sending email fails", async () => {
      const mockSendEmail = vi.fn().mockResolvedValue({ success: false })
      const mockLogAuditEvent = vi.fn().mockResolvedValue({ success: true })

      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          inviteUserByEmail: vi.fn().mockResolvedValue({ error: null }),
        },
      } as any)

      const result = await inviteUser("user@example.com", "John Doe", "School A")

      expect(result).toEqual({ error: "Failed to send invitation email" })
    })

    it("should return error when logging audit event fails", async () => {
      const mockSendEmail = vi.fn().mockResolvedValue({ success: true })
      const mockLogAuditEvent = vi.fn().mockResolvedValue({ success: false })

      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          inviteUserByEmail: vi.fn().mockResolvedValue({ error: null }),
        },
      } as any)

      const result = await inviteUser("user@example.com", "John Doe", "School A")

      expect(result).toEqual({ error: "Failed to log audit event" })
    })
  })

  describe("deleteUserCompletely", () => {
    it("should successfully delete user completely", async () => {
      const mockDeleteUser = vi.fn().mockResolvedValue({ error: null })
      const mockLogAuditEvent = vi.fn().mockResolvedValue({ success: true })

      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          admin: {
            deleteUser: mockDeleteUser,
          },
        },
      } as any)

      const result = await deleteUserCompletely("user-123")

      expect(result).toEqual({ success: "User deleted successfully" })
      expect(mockDeleteUser).toHaveBeenCalledWith("user-123")
      expect(mockLogAuditEvent).toHaveBeenCalledWith("user-123")
    })

    it("should return error when user deletion fails", async () => {
      const mockDeleteUser = vi.fn().mockResolvedValue({ error: { message: "Delete failed" } })
      const mockLogAuditEvent = vi.fn().mockResolvedValue({ success: true })

      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          admin: {
            deleteUser: mockDeleteUser,
          },
        },
      } as any)

      const result = await deleteUserCompletely("user-123")

      expect(result).toEqual({ error: "Failed to delete user" })
    })

    it("should return error when logging audit event fails", async () => {
      const mockDeleteUser = vi.fn().mockResolvedValue({ error: null })
      const mockLogAuditEvent = vi.fn().mockResolvedValue({ success: false })

      vi.mocked(createServerClient).mockReturnValue({
        auth: {
          admin: {
            deleteUser: mockDeleteUser,
          },
        },
      } as any)

      const result = await deleteUserCompletely("user-123")

      expect(result).toEqual({ error: "Failed to log audit event" })
    })
  })

  describe("updateUserBelt", () => {
    it("should successfully update user belt", async () => {
      const mockUpdate = vi.fn().mockReturnThis()
      const mockLogAuditEvent = vi.fn().mockResolvedValue({ success: true })

      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { email: "user@example.com", full_name: "Test User" },
              error: null,
            }),
          }),
        }),
        update: mockUpdate,
      })

      const result = await updateUserBelt("user-123", "belt-456")

      expect(result).toEqual({ success: "User belt updated successfully" })
      expect(mockUpdate).toHaveBeenCalledWith({
        current_belt_id: "belt-456",
      })
      expect(mockLogAuditEvent).toHaveBeenCalledWith("user-123", "belt-456")
    })

    it("should return error when user not found", async () => {
      const mockLogAuditEvent = vi.fn().mockResolvedValue({ success: true })

      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "User not found" },
            }),
          }),
        }),
        update: vi.fn().mockReturnThis(),
      })

      const result = await updateUserBelt("nonexistent-123", "belt-456")

      expect(result).toEqual({ error: "User not found" })
    })

    it("should return error when updating user belt fails", async () => {
      const mockUpdate = vi.fn().mockReturnThis()
      const mockLogAuditEvent = vi.fn().mockResolvedValue({ success: true })

      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { email: "user@example.com", full_name: "Test User" },
              error: null,
            }),
          }),
        }),
        update: mockUpdate,
      })

      const result = await updateUserBelt("user-123", "belt-456")

      expect(result).toEqual({ error: "Failed to update user belt" })
    })

    it("should return error when logging audit event fails", async () => {
      const mockUpdate = vi.fn().mockReturnThis()
      const mockLogAuditEvent = vi.fn().mockResolvedValue({ success: false })

      mockServiceClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { email: "user@example.com", full_name: "Test User" },
              error: null,
            }),
          }),
        }),
        update: mockUpdate,
      })

      const result = await updateUserBelt("user-123", "belt-456")

      expect(result).toEqual({ error: "Failed to log audit event" })
    })
  })
})
