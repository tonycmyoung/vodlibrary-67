import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getCurriculums,
  addCurriculum,
  updateCurriculum,
  deleteCurriculum,
  reorderCurriculums,
  getCurriculumSets,
  getCurriculumSetWithLevels,
  createCurriculumSet,
  updateCurriculumSet,
  deleteCurriculumSet,
  addLevelToCurriculumSet,
  updateLevelInCurriculumSet,
  deleteLevelFromCurriculumSet,
  reorderLevelsInCurriculumSet,
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
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                then: vi.fn((cb) => cb({ data: mockCurriculums, error: null })),
              }),
            }),
          }
        } else {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
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
          eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
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

  describe("getCurriculumSets", () => {
    it("should return all curriculum sets", async () => {
      const mockSets = [
        { id: "set-1", name: "Okinawa Kobudo Australia", description: "Australian curriculum", created_at: "2024-01-01" },
      ]

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            then: vi.fn((cb) => cb({ data: mockSets, error: null })),
          }),
        }),
      })

      const result = await getCurriculumSets()

      expect(result).toEqual(mockSets)
    })

    it("should return empty array on error", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            then: vi.fn((cb) => cb({ data: null, error: { message: "Error" } })),
          }),
        }),
      })

      const result = await getCurriculumSets()

      expect(result).toEqual([])
    })
  })

  describe("getCurriculumSetWithLevels", () => {
    it("should return curriculum set with its levels", async () => {
      const mockSet = { id: "set-1", name: "Okinawa Kobudo Australia", description: null }
      const mockLevels = [
        { id: "level-1", name: "White Belt", curriculum_set_id: "set-1", display_order: 0 },
        { id: "level-2", name: "Blue Belt", curriculum_set_id: "set-1", display_order: 1 },
      ]

      let fromCallCount = 0
      mockFrom.mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockSet, error: null }),
              }),
            }),
          }
        } else {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  then: vi.fn((cb) => cb({ data: mockLevels, error: null })),
                }),
              }),
            }),
          }
        }
      })

      const result = await getCurriculumSetWithLevels("set-1")

      expect(result).toEqual({ ...mockSet, levels: mockLevels })
    })

    it("should return null if set not found", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
          }),
        }),
      })

      const result = await getCurriculumSetWithLevels("nonexistent")

      expect(result).toBeNull()
    })
  })

  describe("createCurriculumSet", () => {
    it("should create a new curriculum set", async () => {
      const newSet = { id: "set-3", name: "New Set", description: "New curriculum" }

      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newSet, error: null }),
          }),
        }),
      })

      const result = await createCurriculumSet({ name: "New Set", description: "New curriculum" })

      expect(result.success).toBe("Curriculum set created successfully")
      expect(result.id).toBe("set-3")
    })

    it("should return error on failure", async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "Error" } }),
          }),
        }),
      })

      const result = await createCurriculumSet({ name: "New Set" })

      expect(result.error).toBe("Failed to create curriculum set")
    })
  })

  describe("updateCurriculumSet", () => {
    it("should update a curriculum set", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            then: vi.fn((cb) => cb({ data: null, error: null })),
          }),
        }),
      })

      const result = await updateCurriculumSet("set-1", { name: "Updated Set" })

      expect(result.success).toBe("Curriculum set updated successfully")
    })

    it("should return error on failure", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            then: vi.fn((cb) => cb({ data: null, error: { message: "Error" } })),
          }),
        }),
      })

      const result = await updateCurriculumSet("set-1", { name: "Updated Set" })

      expect(result.error).toBe("Failed to update curriculum set")
    })
  })

  describe("deleteCurriculumSet", () => {
    it("should delete a curriculum set without levels or users", async () => {
      let fromCallCount = 0
      mockFrom.mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          // Get levels
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                then: vi.fn((cb) => cb({ data: [], error: null })),
              }),
            }),
          }
        } else if (fromCallCount === 2) {
          // Check users
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }
        } else {
          // Delete set
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                then: vi.fn((cb) => cb({ data: null, error: null })),
              }),
            }),
          }
        }
      })

      const result = await deleteCurriculumSet("set-1")

      expect(result.success).toBe("Curriculum set deleted successfully")
    })

    it("should prevent deletion if set has videos", async () => {
      let fromCallCount = 0
      mockFrom.mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          // Get levels
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                then: vi.fn((cb) => cb({ data: [{ id: "level-1" }], error: null })),
              }),
            }),
          }
        } else {
          // Count videos
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ count: 5, error: null }),
            }),
          }
        }
      })

      const result = await deleteCurriculumSet("set-1")

      expect(result.error).toContain("Cannot delete curriculum set")
      expect(result.error).toContain("5 video(s)")
    })

    it("should prevent deletion if set is assigned to users", async () => {
      let fromCallCount = 0
      mockFrom.mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          // Get levels - none
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                then: vi.fn((cb) => cb({ data: [], error: null })),
              }),
            }),
          }
        } else {
          // Count users
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
            }),
          }
        }
      })

      const result = await deleteCurriculumSet("set-1")

      expect(result.error).toContain("Cannot delete curriculum set")
      expect(result.error).toContain("3 user(s)")
    })
  })

  describe("addLevelToCurriculumSet", () => {
    it("should add a level with auto display_order", async () => {
      let fromCallCount = 0
      mockFrom.mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          // Get max display_order
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { display_order: 2 }, error: null }),
                  }),
                }),
              }),
            }),
          }
        } else {
          // Insert level
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: "level-3", name: "Green Belt", display_order: 3 }, error: null }),
              }),
            }),
          }
        }
      })

      const result = await addLevelToCurriculumSet("set-1", {
        name: "Green Belt",
        color: "#00FF00",
      })

      expect(result.success).toBe("Level added successfully")
      expect(result.id).toBe("level-3")
    })

    it("should return error on failure", async () => {
      mockFrom.mockImplementation(() => {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: "Error" } }),
            }),
          }),
        }
      })

      const result = await addLevelToCurriculumSet("set-1", {
        name: "Green Belt",
        color: "#00FF00",
      })

      expect(result.error).toBe("Failed to add level")
    })
  })

  describe("updateLevelInCurriculumSet", () => {
    it("should update a level", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            then: vi.fn((cb) => cb({ data: null, error: null })),
          }),
        }),
      })

      const result = await updateLevelInCurriculumSet("level-1", {
        name: "Updated Belt",
        color: "#FF0000",
      })

      expect(result.success).toBe("Level updated successfully")
    })

    it("should return error on failure", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            then: vi.fn((cb) => cb({ data: null, error: { message: "Error" } })),
          }),
        }),
      })

      const result = await updateLevelInCurriculumSet("level-1", {
        name: "Updated Belt",
        color: "#FF0000",
      })

      expect(result.error).toBe("Failed to update level")
    })
  })

  describe("deleteLevelFromCurriculumSet", () => {
    it("should delete a level and reorder remaining", async () => {
      let fromCallCount = 0
      mockFrom.mockImplementation(() => {
        fromCallCount++
        if (fromCallCount === 1) {
          // Check video count
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }
        } else if (fromCallCount === 2) {
          // Get level to delete
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { curriculum_set_id: "set-1", display_order: 1 }, error: null }),
              }),
            }),
          }
        } else if (fromCallCount === 3) {
          // Delete level
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                then: vi.fn((cb) => cb({ data: null, error: null })),
              }),
            }),
          }
        } else if (fromCallCount === 4) {
          // Get levels to reorder
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    then: vi.fn((cb) => cb({ data: [{ id: "level-3", display_order: 2 }], error: null })),
                  }),
                }),
              }),
            }),
          }
        } else {
          // Update remaining levels
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                then: vi.fn((cb) => cb({ data: null, error: null })),
              }),
            }),
          }
        }
      })

      const result = await deleteLevelFromCurriculumSet("level-1")

      expect(result.success).toBe("Level deleted successfully")
    })

    it("should prevent deletion if level has videos", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
        }),
      })

      const result = await deleteLevelFromCurriculumSet("level-1")

      expect(result.error).toContain("Cannot delete level")
      expect(result.error).toContain("3 video(s)")
    })
  })

  describe("reorderLevelsInCurriculumSet", () => {
    it("should reorder levels", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            then: vi.fn((cb) => cb({ data: null, error: null })),
          }),
        }),
      })

      const result = await reorderLevelsInCurriculumSet("set-1", [
        { id: "level-1", display_order: 0 },
        { id: "level-2", display_order: 1 },
      ])

      expect(result.success).toBe("Levels reordered successfully")
    })

    it("should return error on failure", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      })

      const result = await reorderLevelsInCurriculumSet("set-1", [{ id: "level-1", display_order: 0 }])

      expect(result.error).toBe("Failed to reorder levels")
    })
  })
})
