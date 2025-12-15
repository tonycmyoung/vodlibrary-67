import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getCurriculums,
  addCurriculum,
  updateCurriculum,
  deleteCurriculum,
  reorderCurriculums,
} from "@/lib/actions/curriculums"

let mockSupabase: any

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe("Curriculum Actions", () => {
  beforeEach(() => {
    const createChain = (resolveValue: any = { data: null, error: null }) => {
      const chain: any = {}

      chain.select = vi.fn().mockReturnValue(chain)
      chain.insert = vi.fn().mockReturnValue(chain)
      chain.update = vi.fn().mockReturnValue(chain)
      chain.delete = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.order = vi.fn().mockReturnValue(chain)
      chain.limit = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue(resolveValue)
      chain.maybeSingle = vi.fn().mockResolvedValue(resolveValue)
      chain.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)

      return chain
    }

    mockSupabase = {
      from: vi.fn(() => createChain()),
    }

    vi.clearAllMocks()
  })

  describe("getCurriculums", () => {
    it("should return curriculums ordered by display_order", async () => {
      const mockCurriculums = [
        { id: "1", name: "White Belt", display_order: 0, color: "#FFFFFF" },
        { id: "2", name: "Yellow Belt", display_order: 1, color: "#FFFF00" },
      ]

      const chain: any = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.order = vi.fn().mockReturnValue(chain)
      chain.then = (resolve: any) => Promise.resolve({ data: mockCurriculums, error: null }).then(resolve)

      const countChain: any = {}
      countChain.eq = vi.fn().mockReturnValue(countChain)
      countChain.single = vi.fn().mockResolvedValue({ count: 5, error: null })

      mockSupabase.from = vi.fn((table: string) => {
        if (table === "curriculums") {
          return chain
        } else {
          return countChain
        }
      })

      const result = await getCurriculums()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe("White Belt")
      expect(result[0].video_count).toBe(5)
    })

    it("should return empty array on error", async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            then: (resolve: any) => Promise.resolve({ data: null, error: { message: "Database error" } }).then(resolve),
          }),
        }),
      }))

      const result = await getCurriculums()

      expect(result).toEqual([])
    })
  })

  describe("addCurriculum", () => {
    it("should add a curriculum with auto-incremented display_order", async () => {
      let callCount = 0
      mockSupabase.from = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          // First call: get max display_order
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
          // Second call: insert
          return {
            insert: vi.fn().mockReturnValue({
              then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
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

    it("should use provided display_order if specified", async () => {
      const insertMock = vi.fn().mockReturnValue({
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
      })

      mockSupabase.from = vi.fn(() => ({
        insert: insertMock,
      }))

      await addCurriculum({
        name: "Green Belt",
        color: "#00FF00",
        display_order: 3,
      })

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          display_order: 3,
        }),
      )
    })

    it("should return error on database failure", async () => {
      mockSupabase.from = vi.fn(() => {
        if (mockSupabase.from.mock.calls.length === 1) {
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
              then: (resolve: any) =>
                Promise.resolve({ data: null, error: { message: "Insert failed" } }).then(resolve),
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
      const eqMock = vi.fn().mockReturnValue({
        then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
      })

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn().mockReturnValue({
          eq: eqMock,
        }),
      }))

      const result = await updateCurriculum("curriculum-123", {
        name: "Updated Belt",
        color: "#FF0000",
      })

      expect(result.success).toBe("Curriculum updated successfully")
      expect(eqMock).toHaveBeenCalledWith("id", "curriculum-123")
    })

    it("should return error on database failure", async () => {
      mockSupabase.from = vi.fn(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            then: (resolve: any) => Promise.resolve({ data: null, error: { message: "Update failed" } }).then(resolve),
          }),
        }),
      }))

      const result = await updateCurriculum("curriculum-123", {
        name: "Updated Belt",
        color: "#FF0000",
      })

      expect(result.error).toBe("Failed to update curriculum")
    })
  })

  describe("deleteCurriculum", () => {
    it("should delete curriculum and resequence display_orders", async () => {
      let callCount = 0
      mockSupabase.from = vi.fn((table: string) => {
        callCount++

        if (callCount === 1) {
          // Check video count
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ count: 0, error: null }),
              }),
            }),
          }
        } else if (callCount === 2) {
          // Get curriculum
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { display_order: 5 }, error: null }),
              }),
            }),
          }
        } else if (callCount === 3) {
          // Delete curriculum
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
              }),
            }),
          }
        } else if (callCount === 4) {
          // Get curriculums to resequence
          return {
            select: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                then: (resolve: any) =>
                  Promise.resolve({
                    data: [
                      { id: "curr-6", display_order: 6 },
                      { id: "curr-7", display_order: 7 },
                    ],
                    error: null,
                  }).then(resolve),
              }),
            }),
          }
        } else {
          // Update calls for resequencing
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
              }),
            }),
          }
        }
      })

      const result = await deleteCurriculum("curriculum-123")

      expect(result.success).toBe("Curriculum deleted successfully")
    })

    it("should prevent deletion if curriculum has videos", async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        }),
      }))

      const result = await deleteCurriculum("curriculum-123")

      expect(result.error).toContain("Cannot delete curriculum")
      expect(result.error).toContain("5 video(s)")
    })

    it("should return error if curriculum not found", async () => {
      let callCount = 0
      mockSupabase.from = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ count: 0, error: null }),
              }),
            }),
          }
        } else {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }
        }
      })

      const result = await deleteCurriculum("curriculum-123")

      expect(result.error).toBe("Curriculum not found")
    })
  })

  describe("reorderCurriculums", () => {
    it("should update display_order for multiple curriculums", async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
        }),
      })

      mockSupabase.from = vi.fn(() => ({
        update: updateMock,
      }))

      const result = await reorderCurriculums([
        { id: "curr-1", display_order: 0 },
        { id: "curr-2", display_order: 1 },
        { id: "curr-3", display_order: 2 },
      ])

      expect(result.success).toBe("Curriculums reordered successfully")
      expect(updateMock).toHaveBeenCalledTimes(3)
    })

    it("should return error on database failure", async () => {
      mockSupabase.from = vi.fn(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            then: (resolve: any) => Promise.reject(new Error("Database error")).then(resolve),
          }),
        }),
      }))

      const result = await reorderCurriculums([{ id: "curr-1", display_order: 0 }])

      expect(result.error).toBe("Failed to reorder curriculums")
    })
  })
})
