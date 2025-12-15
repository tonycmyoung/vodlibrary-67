import { describe, it, expect, vi, beforeEach } from "vitest"
import { incrementVideoViews, saveVideo } from "@/lib/actions/videos"

const mockFrom = vi.fn()
const mockAuthGetUser = vi.fn()

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockAuthGetUser,
    },
  })),
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

describe("videos actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: "test-user-id" } }, error: null })
  })

  describe("incrementVideoViews", () => {
    it("should track video view successfully for authenticated user", async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await incrementVideoViews("video-123")

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith("video_views")
      expect(mockFrom).toHaveBeenCalledWith("user_video_views")
    })

    it("should track video view even without authenticated user", async () => {
      mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: null })
      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await incrementVideoViews("video-123")

      expect(result.success).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith("video_views")
    })

    it("should handle database errors", async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
      })

      const result = await incrementVideoViews("video-123")

      expect(result.error).toBe("Failed to track video view")
    })
  })

  describe("saveVideo", () => {
    it("should create new video successfully", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "videos") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "new-video-id" },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      const result = await saveVideo({
        title: "Test Video",
        videoUrl: "https://example.com/video.mp4",
        categoryIds: ["cat-1"],
        curriculumIds: ["curr-1"],
        performerIds: ["perf-1"],
      })

      expect(result.success).toBe("Video saved successfully")
    })

    it("should update existing video successfully", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "videos") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      })

      const result = await saveVideo({
        videoId: "existing-video-id",
        title: "Updated Video",
        videoUrl: "https://example.com/updated.mp4",
      })

      expect(result.success).toBe("Video updated successfully")
    })

    it("should handle database errors on insert", async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Insert failed" },
            }),
          }),
        }),
      })

      const result = await saveVideo({
        title: "Test Video",
        videoUrl: "https://example.com/video.mp4",
      })

      expect(result.error).toBe("Failed to save video")
    })
  })
})
