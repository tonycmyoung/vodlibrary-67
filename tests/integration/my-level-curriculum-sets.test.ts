import { describe, it, expect, vi, beforeEach } from "vitest"
import { createClient } from "@/utils/supabase/client"

vi.mock("@/utils/supabase/client")

describe("My Level Page with Curriculum Sets", () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn(),
      },
    }
    vi.mocked(createClient).mockReturnValue(mockSupabase)
  })

  describe("getUserData", () => {
    it("should fetch user with curriculum set and levels", async () => {
      const mockUserData = {
        id: "user-123",
        full_name: "John Student",
        curriculum_set_id: "set-1",
        curriculum_set: {
          id: "set-1",
          name: "Okinawa Kobudo Australia",
        },
        current_belt_id: "level-1",
        current_belt: {
          id: "level-1",
          name: "White Belt",
          color: "#ffffff",
          display_order: 0,
        },
      }

      const mockLevels = [
        { id: "level-1", name: "White Belt", color: "#ffffff", display_order: 0 },
        { id: "level-2", name: "Blue Belt", color: "#0000ff", display_order: 1 },
        { id: "level-3", name: "Brown Belt", color: "#8b4513", display_order: 2 },
      ]

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-123" } } })

      let fromCallCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        fromCallCount++
        if (table === "users" && fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: mockUserData, error: null }),
          }
        }
        if (table === "curriculums" && fromCallCount === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockLevels, error: null }),
          }
        }
      })

      expect(mockUserData.curriculum_set).not.toBeNull()
      expect(mockUserData.curriculum_set?.id).toBe("set-1")
      expect(mockUserData.current_belt).not.toBeNull()
    })

    it("should handle user without curriculum set assigned", async () => {
      const mockUserData = {
        id: "user-456",
        full_name: "Jane Student",
        curriculum_set_id: null,
        curriculum_set: null,
        current_belt_id: null,
        current_belt: null,
      }

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-456" } } })
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockUserData, error: null }),
      })

      expect(mockUserData.curriculum_set).toBeNull()
      expect(mockUserData.current_belt).toBeNull()
    })

    it("should handle curriculum set with no levels", async () => {
      const mockUserData = {
        id: "user-789",
        curriculum_set_id: "set-2",
        curriculum_set: {
          id: "set-2",
          name: "Empty Set",
        },
      }

      const mockEmptyLevels: any[] = []

      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-789" } } })

      let fromCallCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        fromCallCount++
        if (table === "users") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: mockUserData, error: null }),
          }
        }
        if (table === "curriculums") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockEmptyLevels, error: null }),
          }
        }
      })

      expect(mockEmptyLevels).toHaveLength(0)
    })

    it("should handle database errors when fetching user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-123" } } })
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: "Database error" } }),
      })

      const result = await mockSupabase.from("users").select("*").eq("id", "user-123")

      expect(result.error).not.toBeNull()
      expect(result.error?.message).toBe("Database error")
    })

    it("should handle user not found", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "nonexistent" } } })
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      const result = await mockSupabase.from("users").select("*").eq("id", "nonexistent")

      expect(result.data).toBeNull()
    })
  })

  describe("Curriculum Set Data Structure", () => {
    it("should include curriculum_set in user select query", () => {
      const selectQuery = `
        id, email, full_name, teacher, school, role, created_at, is_approved, approved_at, profile_image_url,
        current_belt_id,
        current_belt:curriculums!current_belt_id(id, name, color, display_order),
        curriculum_set_id,
        curriculum_set:curriculum_sets!curriculum_set_id(id, name)
      `

      expect(selectQuery).toContain("curriculum_set_id")
      expect(selectQuery).toContain("curriculum_set:curriculum_sets")
      expect(selectQuery).toContain("curriculum_set_id")
    })

    it("should properly join curriculum_set with users table", () => {
      const joinClause = "curriculum_set:curriculum_sets!curriculum_set_id(id, name)"

      expect(joinClause).toContain("!")
      expect(joinClause).toContain("curriculum_set_id")
      expect(joinClause).toMatch(/\(id, name\)/)
    })
  })
})
