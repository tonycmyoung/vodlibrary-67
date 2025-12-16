import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  updatePendingUserFields,
  updateUserFields,
  updateProfile,
  inviteUser,
  approveUserServerAction,
  rejectUserServerAction,
  fetchPendingUsers,
  fetchUnconfirmedEmailUsers,
  resendConfirmationEmail,
  fetchStudentsForHeadTeacher,
  adminResetUserPassword,
} from "@/lib/actions/users"
import { createClient as createServerClient } from "@supabase/supabase-js"

// Mock Next.js modules
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}))

describe("User Actions", () => {
  const mockServiceClient = {
    from: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
      single: vi.fn(),
    })),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServerClient).mockReturnValue(mockServiceClient as any)
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
        eq: vi.fn().mockResolvedValue({ error: { message: "Database error" } }),
      })

      const result = await updatePendingUserFields("user-123", "John Doe", "Teacher", "School")

      expect(result).toEqual({ error: "Failed to update pending user fields" })
    })

    it("should trim whitespace from input fields", async () => {
      const updateMock = vi.fn().mockReturnThis()
      mockServiceClient.from.mockReturnValue({
        update: updateMock,
        eq: vi.fn().mockResolvedValue({ error: null }),
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
        eq: vi.fn().mockResolvedValue({ error: null }),
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
        eq: vi.fn().mockResolvedValue({ error: null }),
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
        eq: vi.fn().mockResolvedValue({ error: { message: "Database error" } }),
      })

      const result = await updateUserFields("user-123", "John Doe", "Teacher", "School")

      expect(result).toEqual({ error: "Failed to update user fields" })
    })
  })

  describe("updateProfile", () => {
    it("should successfully update user profile", async () => {
      mockServiceClient.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
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
        eq: vi.fn().mockResolvedValue({ error: { message: "Database error" } }),
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

  describe("inviteUser", () => {
    const mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      })),
    }

    beforeEach(() => {
      vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any)
    })

    it("should successfully send invitation", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { full_name: "Admin User", email: "admin@example.com" },
        }),
      })

      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === "invitations") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      const result = await inviteUser("newuser@example.com")

      expect(result).toEqual({ success: "Invitation sent successfully" })
    })

    it("should return error when not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      const result = await inviteUser("test@example.com")

      expect(result).toEqual({ error: "Not authenticated" })
    })

    it("should return error when user already registered", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123" } },
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { full_name: "Admin" },
        }),
      })

      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "existing-123", email: "test@example.com" },
              error: null,
            }),
          }
        }
        return {}
      })

      const result = await inviteUser("test@example.com")

      expect(result).toEqual({ error: "This user is already registered. No invitation needed." })
    })

    it("should return error when invitation already exists", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123" } },
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { full_name: "Admin" } }),
      })

      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === "invitations") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "inv-123", expires_at: new Date(Date.now() + 86400000).toISOString() },
              error: null,
            }),
          }
        }
        return {}
      })

      const result = await inviteUser("test@example.com")

      expect(result).toEqual({ error: "An invitation has already been sent to this email address." })
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

    it("should return error when not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      const result = await approveUserServerAction("user-123")

      expect(result).toEqual({ error: "Not authenticated" })
    })

    it("should return error when user not found", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123" } },
      })

      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Not found" },
            }),
          }
        }
        return {}
      })

      const result = await approveUserServerAction("user-123")

      expect(result).toEqual({ error: "User not found" })
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

    it("should return error when not authenticated", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      })

      const result = await adminResetUserPassword("user-123", "NewPassword123!")

      expect(result).toEqual({ error: "Not authenticated" })
    })

    it("should return error when not admin", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "user@example.com" } },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { full_name: "Regular User", role: "Student" },
              error: null,
            }),
          }),
        }),
      })

      const result = await adminResetUserPassword("user-123", "NewPassword123!")

      expect(result).toEqual({ error: "Unauthorized - Admin access required" })
    })

    it("should return error when password too short", async () => {
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

  describe("updateUserBelt", () => {})
})
