import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  updatePendingUserFields,
  updateUserFields,
  updateStudentForHeadTeacher,
  updateProfile,
  inviteUser,
  approveUserServerAction,
  rejectUserServerAction,
  fetchPendingUsers,
  fetchUnconfirmedEmailUsers,
  resendConfirmationEmail,
  fetchStudentsForHeadTeacher,
  adminResetUserPassword,
  deleteUserCompletely,
  updateUserBelt,
} from "@/lib/actions/users"
import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createMockSupabaseClient } from "@/tests/mocks/supabase"

// Mock Next.js modules - cookies() is now async in Next.js 15
const mockCookieStore = {
  getAll: vi.fn(() => []),
  set: vi.fn(),
}
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

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

// Mock the supabase server helpers used by updateStudentForHeadTeacher
const mockAuthClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}
const mockServiceClientHelper = {
  from: vi.fn(),
}
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => Promise.resolve(mockAuthClient)),
  createServiceClient: vi.fn(() => mockServiceClientHelper),
}))

vi.mock("@/lib/utils/helpers", () => ({
  sanitizeHtml: vi.fn((str: string) => str),
  siteTitle: "Test Site",
  generateUUID: vi.fn(() => "test-uuid"),
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
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null }),
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
      mockServiceClient.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
      })

      const result = await rejectUserServerAction("user-123")

      expect(result).toEqual({ error: "Failed to reject user" })
    })

    it("should return error when auth deletion fails", async () => {
      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ error: null }),
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
    beforeEach(() => {
      // Set up proper auth mock for authenticated admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Admin" },
          error: null,
        }),
      })
    })

    it("should successfully resend confirmation email", async () => {
      mockServiceClient.auth.resend = vi.fn().mockResolvedValue({
        data: {},
        error: null,
      })

      const result = await resendConfirmationEmail("user@example.com")

      expect(result).toEqual({ success: "Confirmation email sent successfully" })
      expect(mockServiceClient.auth.resend).toHaveBeenCalledWith({
        type: "signup",
        email: "user@example.com",
        options: {
          emailRedirectTo: expect.any(String),
        },
      })
    })

    it("should return error when email is missing", async () => {
      // The function will attempt to resend with empty email, which should fail
      mockServiceClient.auth.resend = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Email is required" },
      })

      const result = await resendConfirmationEmail("")

      expect(result).toEqual({ error: "Failed to resend confirmation email" })
    })

    it("should return error when resend fails", async () => {
      mockServiceClient.auth.resend = vi.fn().mockResolvedValue({
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
            or: vi.fn().mockReturnThis(),
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
            or: vi.fn().mockReturnThis(),
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
            or: vi.fn().mockReturnThis(),
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
      let fromCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        fromCallCount++
        if (fromCallCount === 1) {
          // First call: admin profile check
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { full_name: "Admin User", role: "Admin" },
                  error: null,
                }),
              }),
            }),
          }
        } else {
          // Second call: target user details
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { email: "user@example.com", full_name: "Test User" },
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
      })

      mockServiceClient.auth = {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        },
      } as any

      const result = await adminResetUserPassword("user-123", "NewPassword123!")

      expect(result).toEqual({ success: "Password reset successfully" })
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
      let fromCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        fromCallCount++
        if (fromCallCount === 1) {
          // First call: admin profile check
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { full_name: "Admin User", role: "Admin" },
                  error: null,
                }),
              }),
            }),
          }
        } else {
          // Second call: target user details (not found)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
      })

      const result = await adminResetUserPassword("nonexistent-123", "NewPassword123!")

      expect(result).toEqual({ error: "User not found" })
    })

    it("should return error when password update fails", async () => {
      let fromCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        fromCallCount++
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { full_name: "Admin User", role: "Admin" },
                  error: null,
                }),
              }),
            }),
          }
        } else {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { email: "user@example.com", full_name: "Test User" },
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
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
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { full_name: "Admin User", email: "admin@example.com" },
          error: null,
        }),
      })
    })

    it("should successfully invite user", async () => {
      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === "invitations") {
          // First call: check existing invitation (returns null)
          const selectMock = vi.fn().mockReturnThis()
          const eqMock = vi.fn().mockReturnThis()
          const gtMock = vi.fn().mockReturnThis()
          const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null })

          return {
            select: selectMock,
            eq: eqMock,
            gt: gtMock,
            maybeSingle: maybeSingleMock,
            insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }
        }
        return {}
      })

      const result = await inviteUser("newuser@example.com")

      expect(result).toEqual({ success: "Invitation sent successfully" })
    })

    it("should return error when not authenticated", async () => {
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
        from: vi.fn(),
      }

      vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any)

      const result = await inviteUser("user@example.com")

      expect(result).toEqual({ error: "Not authenticated" })
    })

    it("should return error when user already exists", async () => {
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "admin-123", email: "admin@example.com" } },
            error: null,
          }),
        },
        from: vi.fn(),
      }

      vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any)

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { full_name: "Admin User", email: "admin@example.com" },
          error: null,
        }),
      } as any)

      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "existing-123", email: "user@example.com", is_approved: true },
              error: null,
            }),
          } as any
        }
        return {} as any
      })

      const result = await inviteUser("user@example.com")

      expect(result).toEqual({ error: "This user is already registered. No invitation needed." })
    })

    it("should return error when invitation already exists", async () => {
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "admin-123", email: "admin@example.com" } },
            error: null,
          }),
        },
        from: vi.fn(),
      }

      vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any)

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { full_name: "Admin User", email: "admin@example.com" },
          error: null,
        }),
      } as any)

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 3)

      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          } as any
        }
        if (table === "invitations") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "inv-123", expires_at: futureDate.toISOString() },
              error: null,
            }),
          } as any
        }
        return {} as any
      })

      const result = await inviteUser("user@example.com")

      expect(result).toEqual({ error: "An invitation has already been sent to this email address." })
    })
  })

  describe("deleteUserCompletely", () => {
    it("should successfully delete user from both database and auth", async () => {
      let fromCallCount = 0
      mockServiceClient.from.mockImplementation((table: string) => {
        fromCallCount++
        if (fromCallCount === 1 && table === "users") {
          // First call: fetch user to delete
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { email: "user@example.com", full_name: "Test User" },
              error: null,
            }),
          }
        } else if (fromCallCount === 2 && table === "users") {
          // Second call: fetch actor name
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { full_name: "Admin User" },
              error: null,
            }),
          }
        } else if (fromCallCount === 3 && table === "users") {
          // Third call: delete user
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })

      mockSupabaseClient.auth = {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-123", email: "admin@example.com" } },
          error: null,
        }),
      } as any

      mockServiceClient.auth = {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
        },
      } as any

      const result = await deleteUserCompletely("user-123")

      expect(result).toEqual({ success: "User deleted successfully" })
      expect(mockServiceClient.auth.admin.deleteUser).toHaveBeenCalledWith("user-123")
    })

    it("should return error if database deletion fails", async () => {
      let fromCallCount = 0
      mockServiceClient.from.mockImplementation((table: string) => {
        fromCallCount++
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { email: "user@example.com", full_name: "Test User" },
              error: null,
            }),
          }
        } else if (fromCallCount === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { full_name: "Admin User" },
              error: null,
            }),
          }
        } else {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: { message: "Database error" } }),
          }
        }
      })

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
      })

      const result = await deleteUserCompletely("user-123")

      expect(result).toEqual({ error: "Failed to delete user profile" })
    })

    it("should handle auth deletion errors gracefully", async () => {
      let fromCallCount = 0
      mockServiceClient.from.mockImplementation((table: string) => {
        fromCallCount++
        if (fromCallCount === 1 && table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { email: "user@example.com", full_name: "Test User" },
              error: null,
            }),
          }
        } else if (fromCallCount === 2 && table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { full_name: "Admin User" },
              error: null,
            }),
          }
        } else if (fromCallCount === 3 && table === "users") {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })

      mockSupabaseClient.auth = {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-123", email: "admin@example.com" } },
          error: null,
        }),
      } as any

      mockServiceClient.auth = {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ error: { message: "Auth error" } }),
        },
      } as any

      const result = await deleteUserCompletely("user-123")

      // Should still succeed even if auth deletion fails
      expect(result).toEqual({ success: "User deleted successfully" })
    })
  })

  describe("updateUserBelt", () => {
    it("should return error if not authenticated", async () => {
      mockSupabaseClient.auth = {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      } as any

      const result = await updateUserBelt("user-123", "belt-456")

      expect(result).toEqual({ error: "Not authenticated", success: false })
    })

    it("should allow admin to update any user's belt", async () => {
      mockSupabaseClient.auth = {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-123", email: "admin@example.com" } },
          error: null,
        }),
      } as any

      let fromCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        fromCallCount++
        if (fromCallCount === 1 && table === "users") {
          // Current user profile check
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: "Admin", school: "School A" },
              error: null,
            }),
          }
        } else if (fromCallCount === 2 && table === "users") {
          // Target user check
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { school: "School B" },
              error: null,
            }),
          }
        }
        return {}
      })

      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })

      const result = await updateUserBelt("user-123", "belt-456")

      expect(result).toEqual({ success: true })
    })

    it("should allow user to update their own belt", async () => {
      mockSupabaseClient.auth = {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: "user@example.com" } },
          error: null,
        }),
      } as any

      let fromCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        fromCallCount++
        if (fromCallCount === 1 && table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: "Student", school: "School A" },
              error: null,
            }),
          }
        } else if (fromCallCount === 2 && table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { school: "School A" },
              error: null,
            }),
          }
        }
        return {}
      })

      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })

      const result = await updateUserBelt("user-123", "belt-456")

      expect(result).toEqual({ success: true })
    })

    it("should allow teacher to update student belt in same school", async () => {
      mockSupabaseClient.auth = {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "teacher-123", email: "teacher@example.com" } },
          error: null,
        }),
      } as any

      let fromCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        fromCallCount++
        if (fromCallCount === 1 && table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: "Teacher", school: "School A" },
              error: null,
            }),
          }
        } else if (fromCallCount === 2 && table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { school: "School A" },
              error: null,
            }),
          }
        }
        return {}
      })

      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })

      const result = await updateUserBelt("student-123", "belt-456")

      expect(result).toEqual({ success: true })
    })

    it("should deny teacher updating student in different school", async () => {
      mockSupabaseClient.auth = {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "teacher-123", email: "teacher@example.com" } },
          error: null,
        }),
      } as any

      let fromCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        fromCallCount++
        if (fromCallCount === 1 && table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: "Teacher", school: "School A" },
              error: null,
            }),
          }
        } else if (fromCallCount === 2 && table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { school: "School B" },
              error: null,
            }),
          }
        }
        return {}
      })

      const result = await updateUserBelt("student-123", "belt-456")

      expect(result).toEqual({ error: "Unauthorized to update this user's belt", success: false })
    })

    it("should return error if database update fails", async () => {
      mockSupabaseClient.auth = {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-123", email: "admin@example.com" } },
          error: null,
        }),
      } as any

      let fromCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        fromCallCount++
        if (fromCallCount === 1 && table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { role: "Admin", school: "School A" },
              error: null,
            }),
          }
        } else if (fromCallCount === 2 && table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { school: "School B" },
              error: null,
            }),
          }
        }
        return {}
      })

      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: { message: "Database error" } }),
          }
        }
        return {}
      })

      const result = await updateUserBelt("user-123", "belt-456")

      expect(result).toEqual({ error: "Failed to update belt", success: false })
    })
  })

  describe("updateStudentForHeadTeacher", () => {
    beforeEach(() => {
      // Reset the mocks for each test
      mockAuthClient.auth.getUser = vi.fn()
      mockAuthClient.from = vi.fn()
      mockServiceClientHelper.from = vi.fn()
    })

    it("should return error when not authenticated", async () => {
      mockAuthClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await updateStudentForHeadTeacher("student-123", "John Doe", "Teacher", "BBMA Gosford")

      expect(result).toEqual({ error: "Not authenticated" })
    })

    it("should return error when user profile not found", async () => {
      mockAuthClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "head-teacher-123" } },
        error: null,
      })

      mockAuthClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      const result = await updateStudentForHeadTeacher("student-123", "John Doe", "Teacher", "BBMA Gosford")

      expect(result).toEqual({ error: "User profile not found" })
    })

    it("should return error when caller is not a Head Teacher", async () => {
      mockAuthClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "teacher-123" } },
        error: null,
      })

      mockAuthClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Teacher", school: "BBMA" },
          error: null,
        }),
      })

      const result = await updateStudentForHeadTeacher("student-123", "John Doe", "Sensei", "BBMA Gosford")

      expect(result).toEqual({ error: "Only Head Teachers can update student records" })
    })

    it("should return error when Head Teacher school not configured", async () => {
      mockAuthClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "head-teacher-123" } },
        error: null,
      })

      mockAuthClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Head Teacher", school: null },
          error: null,
        }),
      })

      const result = await updateStudentForHeadTeacher("student-123", "John Doe", "Sensei", "BBMA Gosford")

      expect(result).toEqual({ error: "Head Teacher school not configured" })
    })

    it("should return error when student not found", async () => {
      mockAuthClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "head-teacher-123" } },
        error: null,
      })

      mockAuthClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Head Teacher", school: "BBMA" },
          error: null,
        }),
      })

      mockServiceClientHelper.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      const result = await updateStudentForHeadTeacher("student-123", "John Doe", "Sensei", "BBMA Gosford")

      expect(result).toEqual({ error: "Student not found" })
    })

    it("should return error when student belongs to different school", async () => {
      mockAuthClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "head-teacher-123" } },
        error: null,
      })

      mockAuthClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Head Teacher", school: "BBMA" },
          error: null,
        }),
      })

      mockServiceClientHelper.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { school: "HVMA Sydney" },
          error: null,
        }),
      })

      const result = await updateStudentForHeadTeacher("student-123", "John Doe", "Sensei", "BBMA Gosford")

      expect(result).toEqual({ error: "Cannot edit students from other schools" })
    })

    it("should return error when trying to reassign student to different school organization", async () => {
      mockAuthClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "head-teacher-123" } },
        error: null,
      })

      mockAuthClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Head Teacher", school: "BBMA" },
          error: null,
        }),
      })

      let serviceFromCallCount = 0
      mockServiceClientHelper.from.mockImplementation(() => {
        serviceFromCallCount++
        if (serviceFromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { school: "BBMA Gosford" },
              error: null,
            }),
          }
        }
        return {}
      })

      const result = await updateStudentForHeadTeacher("student-123", "John Doe", "Sensei", "HVMA Sydney")

      expect(result).toEqual({ error: "Cannot reassign student to a different school organization" })
    })

    it("should return error when trying subtle prefix manipulation (BBMA to BBMA2)", async () => {
      mockAuthClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "head-teacher-123" } },
        error: null,
      })

      mockAuthClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Head Teacher", school: "BBMA" },
          error: null,
        }),
      })

      let serviceFromCallCount = 0
      mockServiceClientHelper.from.mockImplementation(() => {
        serviceFromCallCount++
        if (serviceFromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { school: "BBMA Gosford" },
              error: null,
            }),
          }
        }
        return {}
      })

      // Trying to change to BBMA2 (subtle manipulation - different org)
      const result = await updateStudentForHeadTeacher("student-123", "John Doe", "Sensei", "BBMA2 Gosford")

      expect(result).toEqual({ error: "Cannot reassign student to a different school organization" })
    })

    it("should successfully update student within same school prefix", async () => {
      mockAuthClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "head-teacher-123" } },
        error: null,
      })

      mockAuthClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Head Teacher", school: "BBMA" },
          error: null,
        }),
      })

      let serviceFromCallCount = 0
      const mockUpdate = vi.fn().mockReturnThis()
      mockServiceClientHelper.from.mockImplementation(() => {
        serviceFromCallCount++
        if (serviceFromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { school: "BBMA Gosford" },
              error: null,
            }),
          }
        }
        return {
          update: mockUpdate,
          eq: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      const result = await updateStudentForHeadTeacher("student-123", "John Doe", "Sensei", "BBMA Kincumber")

      expect(result).toEqual({ success: "Student updated successfully" })
      expect(mockUpdate).toHaveBeenCalledWith({
        full_name: "John Doe",
        teacher: "Sensei",
        school: "BBMA Kincumber",
      })
    })

    it("should successfully update student to root school (remove suffix)", async () => {
      mockAuthClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "head-teacher-123" } },
        error: null,
      })

      mockAuthClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Head Teacher", school: "BBMA" },
          error: null,
        }),
      })

      let serviceFromCallCount = 0
      const mockUpdate = vi.fn().mockReturnThis()
      mockServiceClientHelper.from.mockImplementation(() => {
        serviceFromCallCount++
        if (serviceFromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { school: "BBMA Gosford" },
              error: null,
            }),
          }
        }
        return {
          update: mockUpdate,
          eq: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      const result = await updateStudentForHeadTeacher("student-123", "John Doe", "Sensei", "BBMA")

      expect(result).toEqual({ success: "Student updated successfully" })
      expect(mockUpdate).toHaveBeenCalledWith({
        full_name: "John Doe",
        teacher: "Sensei",
        school: "BBMA",
      })
    })

    it("should include belt ID in update when provided", async () => {
      mockAuthClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "head-teacher-123" } },
        error: null,
      })

      mockAuthClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Head Teacher", school: "BBMA" },
          error: null,
        }),
      })

      let serviceFromCallCount = 0
      const mockUpdate = vi.fn().mockReturnThis()
      mockServiceClientHelper.from.mockImplementation(() => {
        serviceFromCallCount++
        if (serviceFromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { school: "BBMA Gosford" },
              error: null,
            }),
          }
        }
        return {
          update: mockUpdate,
          eq: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      const result = await updateStudentForHeadTeacher("student-123", "John Doe", "Sensei", "BBMA Gosford", "belt-456")

      expect(result).toEqual({ success: "Student updated successfully" })
      expect(mockUpdate).toHaveBeenCalledWith({
        full_name: "John Doe",
        teacher: "Sensei",
        school: "BBMA Gosford",
        current_belt_id: "belt-456",
      })
    })

    it("should handle database errors during update", async () => {
      mockAuthClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "head-teacher-123" } },
        error: null,
      })

      mockAuthClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Head Teacher", school: "BBMA" },
          error: null,
        }),
      })

      let serviceFromCallCount = 0
      mockServiceClientHelper.from.mockImplementation(() => {
        serviceFromCallCount++
        if (serviceFromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { school: "BBMA Gosford" },
              error: null,
            }),
          }
        }
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: { message: "Database error" } }),
        }
      })

      const result = await updateStudentForHeadTeacher("student-123", "John Doe", "Sensei", "BBMA Kincumber")

      expect(result).toEqual({ error: "Failed to update student fields" })
    })

    it("should trim whitespace from input fields", async () => {
      mockAuthClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "head-teacher-123" } },
        error: null,
      })

      mockAuthClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: "Head Teacher", school: "BBMA" },
          error: null,
        }),
      })

      let serviceFromCallCount = 0
      const mockUpdate = vi.fn().mockReturnThis()
      mockServiceClientHelper.from.mockImplementation(() => {
        serviceFromCallCount++
        if (serviceFromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { school: "BBMA Gosford" },
              error: null,
            }),
          }
        }
        return {
          update: mockUpdate,
          eq: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      await updateStudentForHeadTeacher("student-123", "  John Doe  ", "  Sensei  ", "  BBMA Kincumber  ")

      expect(mockUpdate).toHaveBeenCalledWith({
        full_name: "John Doe",
        teacher: "Sensei",
        school: "BBMA Kincumber",
      })
    })
  })
})
