import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { createClient } from "@supabase/supabase-js"

// Mock Supabase client
vi.mock("@supabase/supabase-js")

describe("Curriculum Set Actions", () => {
  let mockSupabase: any

  beforeAll(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase)
  })

  afterAll(() => {
    vi.clearAllMocks()
  })

  describe("getCurriculumSets", () => {
    it("should fetch all curriculum sets ordered by created_at", async () => {
      const mockSets = [
        { id: "set-1", name: "Australia", description: "Australian curriculum", created_at: "2024-01-01" },
        { id: "set-2", name: "International", description: "International curriculum", created_at: "2024-01-02" },
      ]

      mockSupabase.select.mockResolvedValue({ data: mockSets, error: null })

      const result = await require("../curriculums").getCurriculumSets()

      expect(result).toEqual(mockSets)
      expect(mockSupabase.from).toHaveBeenCalledWith("curriculum_sets")
      expect(mockSupabase.order).toHaveBeenCalledWith("created_at", { ascending: true })
    })

    it("should return empty array on error", async () => {
      mockSupabase.select.mockResolvedValue({ data: null, error: { message: "Error" } })

      const result = await require("../curriculums").getCurriculumSets()

      expect(result).toEqual([])
    })
  })

  describe("createCurriculumSet", () => {
    it("should create a new curriculum set", async () => {
      const mockNewSet = {
        id: "set-new",
        name: "New Curriculum",
        description: "A new curriculum set",
      }

      mockSupabase.select.mockResolvedValue({})
      mockSupabase.single.mockResolvedValue({ data: mockNewSet, error: null })

      const result = await require("../curriculums").createCurriculumSet({
        name: "New Curriculum",
        description: "A new curriculum set",
      })

      expect(result.success).toBeDefined()
      expect(result.id).toBe("set-new")
      expect(mockSupabase.from).toHaveBeenCalledWith("curriculum_sets")
      expect(mockSupabase.insert).toHaveBeenCalled()
    })

    it("should return error if insert fails", async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: "Insert failed" } })

      const result = await require("../curriculums").createCurriculumSet({
        name: "New Curriculum",
      })

      expect(result.error).toBeDefined()
      expect(result.id).toBeUndefined()
    })
  })

  describe("addLevelToCurriculumSet", () => {
    it("should add a level to a curriculum set", async () => {
      const mockLevel = {
        id: "level-1",
        name: "1st Kyu",
        color: "#ff0000",
        display_order: 0,
        curriculum_set_id: "set-1",
      }

      mockSupabase.select.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({})
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({
        data: mockLevel,
        error: null,
      })

      const result = await require("../curriculums").addLevelToCurriculumSet("set-1", {
        name: "1st Kyu",
        color: "#ff0000",
      })

      expect(result.success).toBeDefined()
      expect(result.id).toBe("level-1")
      expect(mockSupabase.from).toHaveBeenCalledWith("curriculums")
    })
  })

  describe("deleteLevelFromCurriculumSet", () => {
    it("should prevent deletion if level has associated videos", async () => {
      mockSupabase.select.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.single.mockResolvedValue({
        data: { count: 5, error: null },
      })

      // We need to mock the count check
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: null,
        count: 5,
      })

      const result = await require("../curriculums").deleteLevelFromCurriculumSet("level-1")

      expect(result.error).toContain("Cannot delete level")
    })
  })

  describe("reorderLevelsInCurriculumSet", () => {
    it("should reorder levels in a curriculum set", async () => {
      const orders = [
        { id: "level-1", display_order: 0 },
        { id: "level-2", display_order: 1 },
        { id: "level-3", display_order: 2 },
      ]

      mockSupabase.update.mockResolvedValue({ error: null })

      const result = await require("../curriculums").reorderLevelsInCurriculumSet("set-1", orders)

      expect(result.success).toBeDefined()
      expect(mockSupabase.update).toHaveBeenCalledTimes(3)
    })
  })
})
