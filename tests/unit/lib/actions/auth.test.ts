import { describe, it, expect, vi, beforeEach } from "vitest"
import { signUp, createAdminUser, signOutServerAction, updatePassword } from "@/lib/actions/auth"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"

// Mock Next.js modules
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
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
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
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
  })
})
