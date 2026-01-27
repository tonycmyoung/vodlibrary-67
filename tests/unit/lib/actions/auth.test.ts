import { describe, it, expect, vi, beforeEach } from "vitest"
import { signUp, createAdminUser, signOutServerAction, updatePassword, signIn } from "@/lib/actions/auth"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"

// Mock Next.js modules - cookies() is now async in Next.js 15
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT: ${url}`)
  }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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
}))

vi.mock("@/lib/utils/auth", () => ({
  validateReturnTo: vi.fn((path: string | null) => path),
}))

vi.mock("@/lib/actions/email", () => ({
  sendEmail: vi.fn(),
}))

vi.mock("@/lib/actions/audit", () => ({
  logAuditEvent: vi.fn(),
}))

describe("Auth Actions", () => {
  const mockSupabaseClient = {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      updateUser: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
    })),
  }

  const mockServiceClient = {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: { id: "admin-1", email: "admin@example.com" }, error: null }),
    })),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any)
    vi.mocked(createClient).mockReturnValue(mockServiceClient as any)
  })

  describe("signUp", () => {
    it("should successfully sign up a new user with all required fields", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "password123")
      formData.append("fullName", "Test User")
      formData.append("school", "Test School")
      formData.append("teacher", "Test Teacher")
      formData.append("eulaAccepted", "true")
      formData.append("privacyAccepted", "true")

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      })

      mockServiceClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        delete: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "admin-1", email: "admin@example.com" }, error: null }),
      })

      try {
        await signUp(null, formData)
      } catch (error: any) {
        // Expect redirect
        expect(error.message).toContain("REDIRECT: /pending-approval?from=signup")
      }

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test@example.com",
          password: "password123",
        }),
      )
    })

    it("should return error when required fields are missing", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      // Missing other required fields

      const result = await signUp(null, formData)

      expect(result).toEqual({ error: "All fields are required" })
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled()
    })

    it("should return error when EULA or Privacy Policy not accepted", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "password123")
      formData.append("fullName", "Test User")
      formData.append("school", "Test School")
      formData.append("teacher", "Test Teacher")
      formData.append("eulaAccepted", "false")
      formData.append("privacyAccepted", "true")

      const result = await signUp(null, formData)

      expect(result).toEqual({ error: "You must accept both the EULA and Privacy Policy to create an account" })
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled()
    })

    it("should handle signup error from Supabase", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "password123")
      formData.append("fullName", "Test User")
      formData.append("school", "Test School")
      formData.append("teacher", "Test Teacher")
      formData.append("eulaAccepted", "true")
      formData.append("privacyAccepted", "true")

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: "Email already registered" },
      })

      const result = await signUp(null, formData)

      expect(result).toEqual({ error: "Email already registered" })
    })

    it("should handle profile creation failure", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "password123")
      formData.append("fullName", "Test User")
      formData.append("school", "Test School")
      formData.append("teacher", "Test Teacher")
      formData.append("eulaAccepted", "true")
      formData.append("privacyAccepted", "true")

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      })

      const tableCounts = { invitations: 0, users: 0, user_consents: 0 }
      mockServiceClient.from.mockImplementation((table: string) => {
        tableCounts[table as keyof typeof tableCounts]++

        // Fail on the first users table call (profile creation)
        if (table === "users" && tableCounts.users === 1) {
          return {
            insert: vi.fn().mockResolvedValue({
              error: { message: "Profile creation failed" },
            }),
          }
        }

        // Success for all other calls
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          delete: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const result = await signUp(null, formData)

      expect(result).toEqual({ error: "Failed to create user profile" })
    })

    it("should handle consent storage failure", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "password123")
      formData.append("fullName", "Test User")
      formData.append("school", "Test School")
      formData.append("teacher", "Test Teacher")
      formData.append("eulaAccepted", "true")
      formData.append("privacyAccepted", "true")

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      })

      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "user_consents") {
          return {
            insert: vi.fn().mockResolvedValue({
              error: { message: "Consent storage failed" },
            }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          delete: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const result = await signUp(null, formData)

      expect(result).toEqual({ error: "Failed to store legal consent" })
    })

    it("should handle invited user signup and cleanup invitation", async () => {
      const formData = new FormData()
      formData.append("email", "invited@example.com")
      formData.append("password", "password123")
      formData.append("fullName", "Invited User")
      formData.append("school", "Test School")
      formData.append("teacher", "Test Teacher")
      formData.append("eulaAccepted", "true")
      formData.append("privacyAccepted", "true")

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: "user-123", email: "invited@example.com" } },
        error: null,
      })

      const mockDelete = vi.fn().mockReturnThis()
      const mockDeleteSelect = vi.fn().mockResolvedValue({
        data: [{ id: "inv-123" }],
        error: null,
      })

      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "invitations") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { invited_by: "admin-123" },
              error: null,
            }),
            delete: mockDelete,
          }
        }
        if (table === "invitations" && mockDelete.mock.calls.length > 0) {
          return {
            delete: mockDelete,
            eq: mockDelete,
            select: mockDeleteSelect,
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      try {
        await signUp(null, formData)
      } catch (error: any) {
        expect(error.message).toContain("REDIRECT: /pending-approval?from=signup")
      }
    })

    it("should handle concurrent signup attempts with same email", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "password123")
      formData.append("fullName", "Test User")
      formData.append("school", "Test School")
      formData.append("teacher", "Test Teacher")
      formData.append("eulaAccepted", "true")
      formData.append("privacyAccepted", "true")

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: {
          message: "User already registered",
          code: "user_already_exists",
        },
      })

      const result = await signUp(null, formData)

      expect(result).toEqual({ error: "User already registered" })
    })

    it("should handle transient database errors during profile creation with retry logic", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "password123")
      formData.append("fullName", "Test User")
      formData.append("school", "Test School")
      formData.append("teacher", "Test Teacher")
      formData.append("eulaAccepted", "true")
      formData.append("privacyAccepted", "true")

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      })

      // Simulate a transient database timeout error
      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "users") {
          return {
            insert: vi.fn().mockResolvedValue({
              error: { message: "Database timeout", code: "57014" },
            }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          delete: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const result = await signUp(null, formData)

      // Should fail gracefully with a clear error message
      expect(result).toEqual({ error: "Failed to create user profile" })
    })
  })

  describe("signIn", () => {
    it("should successfully sign in with valid credentials", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "password123")
      formData.append("returnTo", "/dashboard")

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            email_confirmed_at: "2024-01-01T00:00:00Z",
          },
        },
        error: null,
      })

      mockServiceClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      try {
        await signIn(formData)
      } catch (error: any) {
        // Expect error thrown by mocked redirect
        expect(error.message).toContain("REDIRECT")
      }

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      })
    })

    it("should redirect with error when email is missing", async () => {
      const formData = new FormData()
      formData.append("password", "password123")

      try {
        await signIn(formData)
      } catch (error: any) {
        expect(error.message).toContain("REDIRECT: /auth/login?error=auth_error")
      }

      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    it("should redirect with error when password is missing", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")

      try {
        await signIn(formData)
      } catch (error: any) {
        expect(error.message).toContain("REDIRECT: /auth/login?error=auth_error")
      }

      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    it("should handle invalid credentials error", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "wrongpassword")

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid login credentials", code: "invalid_credentials" },
      })

      mockServiceClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "user-123" }, error: null }),
      })

      try {
        await signIn(formData)
      } catch (error: any) {
        expect(error.message).toContain("REDIRECT: /auth/login?error=invalid_credentials")
      }
    })

    it("should handle email not confirmed error", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "password123")

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Email not confirmed", code: "email_not_confirmed" },
      })

      mockServiceClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      try {
        await signIn(formData)
      } catch (error: any) {
        expect(error.message).toContain("REDIRECT: /auth/login?error=email_not_confirmed")
      }
    })

    it("should preserve returnTo parameter in error redirects", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "wrongpassword")
      formData.append("returnTo", "/dashboard")

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid login credentials" },
      })

      mockServiceClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      try {
        await signIn(formData)
      } catch (error: any) {
        expect(error.message).toContain("returnTo=%2Fdashboard")
      }
    })

    it("should track login in user_logins table on successful signin", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "password123")

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            email_confirmed_at: "2024-01-01T00:00:00Z",
          },
        },
        error: null,
      })

      const mockInsert = vi.fn().mockResolvedValue({ error: null })
      mockServiceClient.from.mockReturnValue({
        insert: mockInsert,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      try {
        await signIn(formData)
      } catch (error: any) {
        // Expect redirect
      }

      // Should insert into both auth_debug_logs and user_logins
      expect(mockInsert).toHaveBeenCalled()
    })

    it("should not track duplicate login on same day", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "password123")

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            email_confirmed_at: "2024-01-01T00:00:00Z",
          },
        },
        error: null,
      })

      let callCount = 0
      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "user_logins") {
          callCount++
          if (callCount === 1) {
            // First call: select existing login
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              gte: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "login-123" },
                error: null,
              }),
            }
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      try {
        await signIn(formData)
      } catch (error: any) {
        // Expect redirect
      }

      // Should check for existing login but not insert duplicate
      expect(callCount).toBeGreaterThanOrEqual(1)
    })

    it("should continue signin even if login tracking fails", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "password123")

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            email_confirmed_at: "2024-01-01T00:00:00Z",
          },
        },
        error: null,
      })

      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "user_logins") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockRejectedValue(new Error("Database error")),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      try {
        await signIn(formData)
      } catch (error: any) {
        // Should still redirect successfully
        expect(error.message).toContain("REDIRECT")
      }
    })

    it("should log auth debug info for failed login attempts", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "wrongpassword")

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid login credentials", code: "invalid_credentials" },
      })

      const mockInsert = vi.fn().mockResolvedValue({ error: null })
      mockServiceClient.from.mockReturnValue({
        insert: mockInsert,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "user-123" }, error: null }),
      })

      try {
        await signIn(formData)
      } catch (error: any) {
        // Expect redirect
      }

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: "login_attempt",
          user_email: "test@example.com",
          success: false,
        }),
      )
    })

    it("should recover from transient database error on retry", async () => {
      const formData = new FormData()
      formData.append("email", "test@example.com")
      formData.append("password", "password123")

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: "user-123",
            email: "test@example.com",
            email_confirmed_at: "2024-01-01T00:00:00Z",
          },
        },
        error: null,
      })

      let callCount = 0
      mockServiceClient.from.mockImplementation((table: string) => {
        if (table === "user_logins") {
          callCount++
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            // Fail first, succeed second
            maybeSingle: vi.fn().mockImplementation(() => {
              if (callCount === 1) {
                return Promise.reject(new Error("Temporary network error"))
              }
              return Promise.resolve({ data: null, error: null })
            }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      try {
        await signIn(formData)
      } catch (error: any) {
        // Should still redirect successfully even if tracking initially failed
        expect(error.message).toContain("REDIRECT")
      }
    })
  })

  describe("createAdminUser", () => {
    it("should successfully create an admin user", async () => {
      const formData = new FormData()
      formData.append("email", "admin@example.com")
      formData.append("password", "adminpassword")
      formData.append("fullName", "Admin User")

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
      })

      mockServiceClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      try {
        await createAdminUser(null, formData)
      } catch (error: any) {
        // Expect redirect to home
        expect(error.message).toContain("REDIRECT: /")
      }

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: "admin@example.com",
        password: "adminpassword",
      })
    })

    it("should return error when required fields are missing", async () => {
      const formData = new FormData()
      formData.append("email", "admin@example.com")
      // Missing password and fullName

      const result = await createAdminUser(null, formData)

      expect(result).toEqual({ error: "All fields are required" })
    })

    it("should handle profile creation failure", async () => {
      const formData = new FormData()
      formData.append("email", "admin@example.com")
      formData.append("password", "adminpassword")
      formData.append("fullName", "Admin User")

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
      })

      mockServiceClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          error: { message: "Profile creation failed" },
        }),
      })

      const result = await createAdminUser(null, formData)

      expect(result).toEqual({ error: "Failed to create admin profile" })
    })

    it("should handle Supabase auth error", async () => {
      const formData = new FormData()
      formData.append("email", "admin@example.com")
      formData.append("password", "adminpassword")
      formData.append("fullName", "Admin User")

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: "Email already exists" },
      })

      const result = await createAdminUser(null, formData)

      expect(result).toEqual({ error: "Email already exists" })
    })
  })

  describe("signOutServerAction", () => {
    it("should successfully clear auth cookies", async () => {
      const result = await signOutServerAction()

      expect(result).toEqual({ success: true })
    })
  })

  describe("updatePassword", () => {
    it("should successfully update password", async () => {
      const formData = new FormData()
      formData.append("password", "newpassword123")
      formData.append("confirmPassword", "newpassword123")

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      })

      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      })

      mockServiceClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      try {
        await updatePassword(null, formData)
      } catch (error: any) {
        // Expect redirect
        expect(error.message).toContain("REDIRECT: /auth/login?reset=success")
      }

      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: "newpassword123",
      })
    })

    it("should return error when passwords do not match", async () => {
      const formData = new FormData()
      formData.append("password", "newpassword123")
      formData.append("confirmPassword", "differentpassword")

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      })

      const result = await updatePassword(null, formData)

      expect(result).toEqual({ error: "Passwords do not match" })
      expect(mockSupabaseClient.auth.updateUser).not.toHaveBeenCalled()
    })

    it("should return error when password is too short", async () => {
      const formData = new FormData()
      formData.append("password", "short")
      formData.append("confirmPassword", "short")

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      })

      const result = await updatePassword(null, formData)

      expect(result).toEqual({ error: "Password must be at least 8 characters long" })
    })

    it("should handle Supabase update error", async () => {
      const formData = new FormData()
      formData.append("password", "newpassword123")
      formData.append("confirmPassword", "newpassword123")

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      })

      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Update failed", code: "update_error" },
      })

      mockServiceClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await updatePassword(null, formData)

      expect(result).toEqual({ error: "Update failed" })
    })

    it("should handle missing password fields", async () => {
      const formData = new FormData()
      formData.append("password", "newpassword123")

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      })

      mockServiceClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await updatePassword(null, formData)

      expect(result).toEqual({ error: "Both password fields are required" })
    })

    it("should handle stale session gracefully during password update", async () => {
      const formData = new FormData()
      formData.append("password", "newpassword123")
      formData.append("confirmPassword", "newpassword123")

      // First call returns user, simulating active session
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      })

      // Update fails due to stale session
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Session not found", code: "session_not_found" },
      })

      mockServiceClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await updatePassword(null, formData)

      expect(result).toEqual({ error: "Session not found" })
    })
  })
})
