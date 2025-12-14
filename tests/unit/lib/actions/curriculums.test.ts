import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getCurriculums,
  addCurriculum,
  updateCurriculum,
  deleteCurriculum,
  reorderCurriculums,
} from "@/lib/actions/curriculums"
import { createMockSupabaseClient } from "@/tests/mocks/supabase"

// Mock the @supabase/supabase-js module
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => createMockSupabaseClient()),
}))

describe("Curriculum Actions", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    vi.clearAllMocks()
  })

  describe("getCurriculums", () => {
    it("should return curriculums ordered by display_order", async () => {
      const mockCurriculums = [
        { id: "1", name: "White Belt", display_order: 0, color: "#FFFFFF" },
        { id: "2", name: "Yellow Belt", display_order: 1, color: "#FFFF00" },
      ]

      mockSupabase.mocks.select.mockResolvedValueOnce({ data: mockCurriculums, error: null })
      mockSupabase.mocks.single.mockResolvedValue({ count: 5, error: null })

      const result = await getCurriculums()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe("White Belt")
      expect(result[0].video_count).toBe(5)
      expect(mockSupabase.from).toHaveBeenCalledWith("curriculums")
      expect(mockSupabase.mocks.order).toHaveBeenCalledWith("display_order", { ascending: true })
    })

    it("should return empty array on error", async () => {
      mockSupabase.mocks.select.mockResolvedValueOnce({ data: null, error: { message: "Database error" } })

      const result = await getCurriculums()

      expect(result).toEqual([])
    })
  })

  describe("addCurriculum", () => {
    it("should add a curriculum with auto-incremented display_order", async () => {
      mockSupabase.mocks.single.mockResolvedValueOnce({ data: { display_order: 5 }, error: null })
      mockSupabase.mocks.insert.mockResolvedValueOnce({ data: null, error: null })

      const result = await addCurriculum({
        name: "Black Belt",
        color: "#000000",
      })

      expect(result.success).toBe("Curriculum added successfully")
      expect(mockSupabase.mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Black Belt",
          color: "#000000",
          display_order: 6,
        }),
      )
    })

    it("should use provided display_order if specified", async () => {
      mockSupabase.mocks.insert.mockResolvedValueOnce({ data: null, error: null })

      await addCurriculum({
        name: "Green Belt",
        color: "#00FF00",
        display_order: 3,
      })

      expect(mockSupabase.mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          display_order: 3,
        }),
      )
    })

    it("should return error on database failure", async () => {
      mockSupabase.mocks.single.mockResolvedValueOnce({ data: { display_order: 5 }, error: null })
      mockSupabase.mocks.insert.mockResolvedValueOnce({ data: null, error: { message: "Insert failed" } })

      const result = await addCurriculum({
        name: "Blue Belt",
        color: "#0000FF",
      })

      expect(result.error).toBe("Failed to add curriculum")
    })
  })

  describe("updateCurriculum", () => {
    it("should update curriculum successfully", async () => {
      mockSupabase.mocks.update.mockResolvedValueOnce({ data: null, error: null })

      const result = await updateCurriculum("curriculum-123", {
        name: "Updated Belt",
        color: "#FF0000",
      })

      expect(result.success).toBe("Curriculum updated successfully")
      expect(mockSupabase.mocks.eq).toHaveBeenCalledWith("id", "curriculum-123")
    })

    it("should return error on database failure", async () => {
      mockSupabase.mocks.update.mockResolvedValueOnce({ data: null, error: { message: "Update failed" } })

      const result = await updateCurriculum("curriculum-123", {
        name: "Updated Belt",
        color: "#FF0000",
      })

      expect(result.error).toBe("Failed to update curriculum")
    })
  })

  describe("deleteCurriculum", () => {
    it("should delete curriculum and resequence display_orders", async () => {
      // Mock: curriculum has no videos
      mockSupabase.mocks.single.mockResolvedValueOnce({ count: 0, error: null })

      // Mock: get the curriculum to delete
      mockSupabase.mocks.single.mockResolvedValueOnce({ data: { display_order: 5 }, error: null })

      // Mock: delete succeeds
      mockSupabase.mocks.delete.mockResolvedValueOnce({ data: null, error: null })

      // Mock: get curriculums with higher display_order
      mockSupabase.mocks.select.mockResolvedValueOnce({
        data: [
          { id: "curr-6", display_order: 6 },
          { id: "curr-7", display_order: 7 },
        ],
        error: null,
      })

      // Mock: update calls
      mockSupabase.mocks.update.mockResolvedValue({ data: null, error: null })

      const result = await deleteCurriculum("curriculum-123")

      expect(result.success).toBe("Curriculum deleted successfully")
      expect(mockSupabase.mocks.delete).toHaveBeenCalled()
      expect(mockSupabase.mocks.update).toHaveBeenCalledTimes(2) // Two curriculums to resequence
    })

    it("should prevent deletion if curriculum has videos", async () => {
      mockSupabase.mocks.single.mockResolvedValueOnce({ count: 5, error: null })

      const result = await deleteCurriculum("curriculum-123")

      expect(result.error).toContain("Cannot delete curriculum")
      expect(result.error).toContain("5 video(s)")
      expect(mockSupabase.mocks.delete).not.toHaveBeenCalled()
    })

    it("should return error if curriculum not found", async () => {
      mockSupabase.mocks.single.mockResolvedValueOnce({ count: 0, error: null })
      mockSupabase.mocks.single.mockResolvedValueOnce({ data: null, error: null })

      const result = await deleteCurriculum("curriculum-123")

      expect(result.error).toBe("Curriculum not found")
    })
  })

  describe("reorderCurriculums", () => {
    it("should update display_order for multiple curriculums", async () => {
      mockSupabase.mocks.update.mockResolvedValue({ data: null, error: null })

      const result = await reorderCurriculums([
        { id: "curr-1", display_order: 0 },
        { id: "curr-2", display_order: 1 },
        { id: "curr-3", display_order: 2 },
      ])

      expect(result.success).toBe("Curriculums reordered successfully")
      expect(mockSupabase.mocks.update).toHaveBeenCalledTimes(3)
    })

    it("should return error on database failure", async () => {
      mockSupabase.mocks.update.mockRejectedValueOnce(new Error("Database error"))

      const result = await reorderCurriculums([{ id: "curr-1", display_order: 0 }])

      expect(result.error).toBe("Failed to reorder curriculums")
    })
  })
})
