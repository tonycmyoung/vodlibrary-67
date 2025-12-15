import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getCurriculums,
  addCurriculum,
  updateCurriculum,
  deleteCurriculum,
  reorderCurriculums,
} from "@/lib/actions/curriculums"

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockGt = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockSingle = vi.fn()

const mockFrom = vi.fn()

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

describe("Curriculum Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock chain
    mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq })
    mockOrder.mockReturnValue({ then: vi.fn((cb) => cb({ data: [], error: null })) })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSingle.mockResolvedValue({ data: null, error: null, count: 0 })
    mockInsert.mockReturnValue({ then: vi.fn((cb) => cb({ data: null, error: null })) })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockDelete.mockReturnValue({ eq: mockEq })
    mockGt.mockReturnValue({ order: mockOrder })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("getCurriculums", () => {
    it("should return curriculums ordered by display_order", async () => {
      const mockCurriculums = [
        { id: "1", name: "White Belt", display_order: 0, color: "#FFFFFF" },
        { id: "2", name: "Yellow Belt", display_order: 1, color: "#FFFF00" },
      ]

      let fromCallCount = 0
      mockFrom.mockImplementation((table: string) => {
        fromCallCount++
        if (fromCallCount === 1) {
          // First call: get curriculums
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                then: vi.fn((cb) => cb({ data: mockCurriculums, error: null })),
              }),
            }),
          }
        } else {
          // Subsequent calls: get video counts
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ count: 5, error: null }),
              }),
            }),
          }
        }
      })

      const result = await getCurriculums()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe("White Belt")
      expect(result[0].video_count).toBe(5)
    })

    it("should return empty array on error", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            then: vi.fn((cb) => cb({ data: null, error: { message: "Database error" } })),
          }),
        }),
      })

      const result = await getCurriculums()

      expect(result).toEqual([])
    })
  })

  describe("addCurriculum", () => {
    it("should add a curriculum with auto-incremented display_order", async () => {
      let fromCallCount = 0
      mockFrom.mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          // Get max display_order
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { display_order: 5 }, error: null }),
                }),
              }),
            }),
          }
        } else {
          // Insert
          return {
            insert: vi.fn().mockReturnValue({
              then: vi.fn((cb) => cb({ data: null, error: null })),
            }),
          }
        }
      })

      const result = await addCurriculum({
        name: "Black Belt",
        color: "#000000",
      })

      expect(result.success).toBe("Curriculum added successfully")
    })

    it("should return error on database failure", async () => {
      let fromCallCount = 0
      mockFrom.mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { display_order: 5 }, error: null }),
                }),
              }),
            }),
          }
        } else {
          return {
            insert: vi.fn().mockReturnValue({
              then: vi.fn((cb) => cb({ data: null, error: { message: "Insert failed" } })),
            }),
          }
        }
      })

      const result = await addCurriculum({
        name: "Blue Belt",
        color: "#0000FF",
      })

      expect(result.error).toBe("Failed to add curriculum")
    })
  })

  describe("updateCurriculum", () => {
    it("should update curriculum successfully", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            then: vi.fn((cb) => cb({ data: null, error: null })),
          }),
        }),
      })

      const result = await updateCurriculum("curriculum-123", {
        name: "Updated Belt",
        color: "#FF0000",
      })

      expect(result.success).toBe("Curriculum updated successfully")
    })

    it("should return error on database failure", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            then: vi.fn((cb) => cb({ data: null, error: { message: "Update failed" } })),
          }),
        }),
      })

      const result = await updateCurriculum("curriculum-123", {
        name: "Updated Belt",
        color: "#FF0000",
      })

      expect(result.error).toBe("Failed to update curriculum")
    })
  })

  describe("deleteCurriculum", () => {
    it("should delete curriculum and resequence display_orders", async () => {
      let fromCallCount = 0
      mockFrom.mockImplementation(() => {
        fromCallCount++

        if (fromCallCount === 1) {
          // Check video count
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ count: 0, error: null }),
              }),
            }),
          }
        } else if (fromCallCount === 2) {
          // Get curriculum to delete
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { display_order: 5 }, error: null }),
              }),
            }),
          }
        } else if (fromCallCount === 3) {
          // Delete curriculum
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                then: vi.fn((cb) => cb({ data: null, error: null })),
              }),
            }),
          }
        } else if (fromCallCount === 4) {
          // Get curriculums to resequence
          return {
            select: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  then: vi.fn((cb) =>
                    cb({
                      data: [
                        { id: "curr-6", display_order: 6 },
                        { id: "curr-7", display_order: 7 },
                      ],
                      error: null,
                    }),
                  ),
                }),
              }),
            }),
          }
        } else {
          // Update calls
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                then: vi.fn((cb) => cb({ data: null, error: null })),
              }),
            }),
          }
        }
      })

      const result = await deleteCurriculum("curriculum-123")

      expect(result.success).toBe("Curriculum deleted successfully")
    })

    it("should prevent deletion if curriculum has videos", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        }),
      })

      const result = await deleteCurriculum("curriculum-123")

      expect(result.error).toContain("Cannot delete curriculum")
      expect(result.error).toContain("5 video(s)")
    })
  })

  describe("reorderCurriculums", () => {
    it("should update display_order for multiple curriculums", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            then: vi.fn((cb) => cb({ data: null, error: null })),
          }),
        }),
      })

      const result = await reorderCurriculums([
        { id: "curr-1", display_order: 0 },
        { id: "curr-2", display_order: 1 },
      ])

      expect(result.success).toBe("Curriculums reordered successfully")
    })

    it("should return error on database failure", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      })

      const result = await reorderCurriculums([{ id: "curr-1", display_order: 0 }])

      expect(result.error).toBe("Failed to reorder curriculums")
    })
  })
})
