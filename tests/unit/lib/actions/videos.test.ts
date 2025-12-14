import { describe, it, expect, vi, beforeEach } from "vitest"
import { incrementVideoViews, saveVideo } from "@/lib/actions/videos"

// Mock Supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  })),
}))

// Mock Next.js cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

// Mock Supabase SSR
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "test-user-id" } }, error: null })),
    },
  })),
}))

describe("videos actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("incrementVideoViews", () => {
    it("should track video view successfully for authenticated user", async () => {
      const mockSupabase = require("@supabase/supabase-js").createClient()
      mockSupabase.from().insert.mockResolvedValue({ error: null })

      const result = await incrementVideoViews("video-123")

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith("video_views")
      expect(mockSupabase.from).toHaveBeenCalledWith("user_video_views")
    })

    it("should track video view even without authenticated user", async () => {
      const mockSupabase = require("@supabase/supabase-js").createClient()
      const mockSSRClient = require("@supabase/ssr").createServerClient()

      mockSSRClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
      mockSupabase.from().insert.mockResolvedValue({ error: null })

      const result = await incrementVideoViews("video-123")

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith("video_views")
    })

    it("should handle database errors", async () => {
      const mockSupabase = require("@supabase/supabase-js").createClient()
      mockSupabase.from().insert.mockResolvedValue({ error: { message: "DB error" } })

      const result = await incrementVideoViews("video-123")

      expect(result.error).toBeDefined()
    })
  })

  describe("saveVideo", () => {
    it("should create new video successfully", async () => {
      const mockSupabase = require("@supabase/supabase-js").createClient()
      mockSupabase.from().insert.mockReturnThis()
      mockSupabase.from().select.mockReturnThis()
      mockSupabase.from().single.mockResolvedValue({
        data: { id: "new-video-id" },
        error: null,
      })

      const result = await saveVideo({
        title: "Test Video",
        videoUrl: "https://example.com/video.mp4",
        categoryIds: ["cat-1"],
        curriculumIds: ["curr-1"],
        performerIds: ["perf-1"],
      })

      expect(result.success).toBeDefined()
      expect(mockSupabase.from).toHaveBeenCalledWith("videos")
      expect(mockSupabase.from).toHaveBeenCalledWith("video_categories")
      expect(mockSupabase.from).toHaveBeenCalledWith("video_curriculums")
      expect(mockSupabase.from).toHaveBeenCalledWith("video_performers")
    })

    it("should update existing video successfully", async () => {
      const mockSupabase = require("@supabase/supabase-js").createClient()
      mockSupabase.from().update.mockReturnThis()
      mockSupabase.from().delete.mockReturnThis()
      mockSupabase.from().insert.mockReturnThis()
      mockSupabase.from().eq.mockResolvedValue({ error: null })

      const result = await saveVideo({
        videoId: "existing-video-id",
        title: "Updated Video",
        videoUrl: "https://example.com/updated.mp4",
        categoryIds: ["cat-2"],
      })

      expect(result.success).toBeDefined()
      expect(mockSupabase.from).toHaveBeenCalledWith("videos")
    })

    it("should require title and videoUrl", async () => {
      const result = await saveVideo({
        title: "",
        videoUrl: "",
      })

      expect(result.error).toBe("Title and video URL are required")
    })

    it("should handle database errors on insert", async () => {
      const mockSupabase = require("@supabase/supabase-js").createClient()
      mockSupabase.from().insert.mockReturnThis()
      mockSupabase.from().select.mockReturnThis()
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      })

      const result = await saveVideo({
        title: "Test Video",
        videoUrl: "https://example.com/video.mp4",
      })

      expect(result.error).toBe("Failed to save video")
    })
  })
})
