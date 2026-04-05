import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { createClient } from "@supabase/supabase-js"

// Mock Supabase client
vi.mock("@supabase/supabase-js")

describe("User Curriculum Set Assignment Actions", () => {
  let mockSupabase: any

  beforeAll(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase)
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  describe("assignCurriculumSetToUser", () => {
    it("should assign curriculum set to user", async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { id: "set-1" }, error: null })
      mockSupabase.update.mockResolvedValueOnce({ error: null })

      const result = await require("../users").assignCurriculumSetToUser("user-1", "set-1")

      expect(result.success).toBeDefined()
      expect(mockSupabase.from).toHaveBeenCalledWith("curriculum_sets")
      expect(mockSupabase.from).toHaveBeenCalledWith("users")
    })

    it("should return error if curriculum set not found", async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: "Not found" } })

      const result = await require("../users").assignCurriculumSetToUser("user-1", "invalid-set")

      expect(result.error).toContain("Curriculum set not found")
    })

    it("should return error if update fails", async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { id: "set-1" }, error: null })
      mockSupabase.update.mockResolvedValueOnce({ error: { message: "Update failed" } })

      const result = await require("../users").assignCurriculumSetToUser("user-1", "set-1")

      expect(result.error).toContain("Failed to assign curriculum set")
    })
  })

  describe("getUserWithCurriculumSet", () => {
    it("should fetch user with their curriculum set and belt information", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        full_name: "Test User",
        curriculum_set_id: "set-1",
        current_belt_id: "level-1",
        curriculum_sets: {
          id: "set-1",
          name: "Australia",
          description: "Australian curriculum",
        },
        curriculums: {
          id: "level-1",
          name: "1st Kyu",
          color: "#ff0000",
          display_order: 0,
          curriculum_set_id: "set-1",
        },
      }

      mockSupabase.single.mockResolvedValueOnce({ data: mockUser, error: null })

      const result = await require("../users").getUserWithCurriculumSet("user-1")

      expect(result).toEqual(mockUser)
      expect(result.curriculum_sets.name).toBe("Australia")
      expect(result.curriculums.name).toBe("1st Kyu")
      expect(mockSupabase.from).toHaveBeenCalledWith("users")
    })

    it("should return null on error", async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: "Error" } })

      const result = await require("../users").getUserWithCurriculumSet("user-1")

      expect(result).toBeNull()
    })
  })
})
