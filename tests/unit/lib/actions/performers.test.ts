import { describe, it, expect, vi, beforeEach } from "vitest"
import { addPerformer, updatePerformer, deletePerformer } from "@/lib/actions/performers"

const mockFrom = vi.fn()

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

describe("performers actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("addPerformer", () => {
    it("should add performer with string name", async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await addPerformer("John Doe")

      expect(result.success).toBe("Performer added successfully")
      expect(mockFrom).toHaveBeenCalledWith("performers")
    })

    it("should add performer with FormData", async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      const formData = new FormData()
      formData.set("name", "Jane Smith")

      const result = await addPerformer(formData)

      expect(result.success).toBe("Performer added successfully")
    })

    it("should handle database errors", async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
      })

      const result = await addPerformer("Test Performer")

      expect(result.error).toBe("Failed to add performer")
    })
  })

  describe("updatePerformer", () => {
    it("should update performer successfully", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })

      const result = await updatePerformer("perf-123", "Updated Name", "Updated bio")

      expect(result.success).toBe("Performer updated successfully")
      expect(mockFrom).toHaveBeenCalledWith("performers")
    })

    it("should handle database errors", async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "Update failed" } }),
        }),
      })

      const result = await updatePerformer("perf-123", "Name", "Bio")

      expect(result.error).toBe("Failed to update performer")
    })
  })

  describe("deletePerformer", () => {
    it("should delete performer successfully", async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })

      const result = await deletePerformer("perf-123")

      expect(result.success).toBe("Performer deleted successfully")
      expect(mockFrom).toHaveBeenCalledWith("performers")
    })

    it("should handle database errors", async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
        }),
      })

      const result = await deletePerformer("perf-123")

      expect(result.error).toBe("Failed to delete performer")
    })
  })
})
