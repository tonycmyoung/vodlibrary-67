import { describe, it, expect, vi, beforeEach } from "vitest"
import { updatePendingUserFields, updateUserFields, updateProfile } from "@/lib/actions/users"
import { createClient } from "@supabase/supabase-js"

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
    vi.mocked(createClient).mockReturnValue(mockServiceClient as any)
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
})
