import { describe, it, expect, vi, beforeEach } from "vitest"
import { addPerformer, updatePerformer, deletePerformer } from "@/lib/actions/performers"

// Mock Supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn(),
    })),
  })),
}))

describe("performers actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("addPerformer", () => {
    it("should add performer with string name", async () => {
      const mockSupabase = require("@supabase/supabase-js").createClient()
      mockSupabase.from().eq.mockResolvedValue({ error: null })

      const result = await addPerformer("John Doe")

      expect(result.success).toBe("Performer added successfully")
      expect(mockSupabase.from).toHaveBeenCalledWith("performers")
    })

    it("should add performer with FormData", async () => {
      const mockSupabase = require("@supabase/supabase-js").createClient()
      mockSupabase.from().eq.mockResolvedValue({ error: null })

      const formData = new FormData()
      formData.set("name", "Jane Smith")

      const result = await addPerformer(formData)

      expect(result.success).toBe("Performer added successfully")
    })

    it("should require performer name", async () => {
      const result = await addPerformer("")

      expect(result.error).toBe("Name is required")
    })

    it("should handle database errors", async () => {
      const mockSupabase = require("@supabase/supabase-js").createClient()
      mockSupabase.from().eq.mockResolvedValue({ error: { message: "DB error" } })

      const result = await addPerformer("Test Performer")

      expect(result.error).toBe("Failed to add performer")
    })
  })

  describe("updatePerformer", () => {
    it("should update performer successfully", async () => {
      const mockSupabase = require("@supabase/supabase-js").createClient()
      mockSupabase.from().eq.mockResolvedValue({ error: null })

      const result = await updatePerformer("perf-123", "Updated Name", "Updated bio")

      expect(result.success).toBe("Performer updated successfully")
      expect(mockSupabase.from).toHaveBeenCalledWith("performers")
    })

    it("should handle database errors", async () => {
      const mockSupabase = require("@supabase/supabase-js").createClient()
      mockSupabase.from().eq.mockResolvedValue({ error: { message: "Update failed" } })

      const result = await updatePerformer("perf-123", "Name", "Bio")

      expect(result.error).toBe("Failed to update performer")
    })
  })

  describe("deletePerformer", () => {
    it("should delete performer successfully", async () => {
      const mockSupabase = require("@supabase/supabase-js").createClient()
      mockSupabase.from().eq.mockResolvedValue({ error: null })

      const result = await deletePerformer("perf-123")

      expect(result.success).toBe("Performer deleted successfully")
      expect(mockSupabase.from).toHaveBeenCalledWith("performers")
    })

    it("should handle database errors", async () => {
      const mockSupabase = require("@supabase/supabase-js").createClient()
      mockSupabase.from().eq.mockResolvedValue({ error: { message: "Delete failed" } })

      const result = await deletePerformer("perf-123")

      expect(result.error).toBe("Failed to delete performer")
    })
  })
})
