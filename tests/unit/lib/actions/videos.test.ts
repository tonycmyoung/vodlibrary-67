import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  incrementVideoViews,
  saveVideo,
  getVideoViewCount,
  getVideoLastViewed,
  getTotalVideoViews,
  getVideoViewsInDateRange,
  getVideosWithViewCounts,
  getBatchVideoViewCounts,
  getBatchVideoLastViewed,
} from "@/lib/actions/videos"

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

    it("should continue even if user_video_views insert fails", async () => {
      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        callCount++
        return {
          insert: vi.fn().mockResolvedValue({
            error: callCount === 1 ? null : { message: "User view tracking failed" },
          }),
        }
      })

      const result = await incrementVideoViews("video-123")

      expect(result.success).toBe(true)
    })

    it("should continue tracking view even if auth check fails", async () => {
      mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: { message: "Auth error" } })
      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await incrementVideoViews("video-123")

      expect(result.success).toBe(true)
    })

    it("should handle unexpected errors gracefully", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Unexpected error")
      })

      const result = await incrementVideoViews("video-123")

      expect(result.error).toBe("Failed to increment video views")
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

    it("should return error when title is missing", async () => {
      const result = await saveVideo({
        title: "",
        videoUrl: "https://example.com/video.mp4",
      })

      expect(result.error).toBe("Title and video URL are required")
    })

    it("should return error when videoUrl is missing", async () => {
      const result = await saveVideo({
        title: "Test Video",
        videoUrl: "",
      })

      expect(result.error).toBe("Title and video URL are required")
    })

    it("should handle database errors on update", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "videos") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: { message: "Update failed" } }),
            }),
          }
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      })

      const result = await saveVideo({
        videoId: "existing-video-id",
        title: "Updated Video",
        videoUrl: "https://example.com/updated.mp4",
      })

      expect(result.error).toBe("Failed to update video")
    })

    it("should continue even if category insert fails", async () => {
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
        if (table === "video_categories") {
          return {
            insert: vi.fn().mockResolvedValue({ error: { message: "Category insert failed" } }),
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
      })

      expect(result.success).toBe("Video saved successfully")
    })

    it("should handle update with no relationships", async () => {
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
        }
      })

      const result = await saveVideo({
        videoId: "existing-video-id",
        title: "Updated Video",
        videoUrl: "https://example.com/updated.mp4",
        categoryIds: [],
        curriculumIds: [],
        performerIds: [],
      })

      expect(result.success).toBe("Video updated successfully")
    })

    it("should handle unexpected errors in saveVideo", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Unexpected error")
      })

      const result = await saveVideo({
        title: "Test Video",
        videoUrl: "https://example.com/video.mp4",
      })

      expect(result.error).toBe("Failed to save video")
    })
  })

  describe("getVideoViewCount", () => {
    it("should return correct view count for video", async () => {
      const mockEq = vi.fn().mockResolvedValue({ count: 42, error: null })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const count = await getVideoViewCount("video-123")

      expect(count).toBe(42)
      expect(mockFrom).toHaveBeenCalledWith("video_views")
      expect(mockSelect).toHaveBeenCalledWith("*", { count: "exact", head: true })
      expect(mockEq).toHaveBeenCalledWith("video_id", "video-123")
    })

    it("should return 0 when video has no views", async () => {
      const mockEq = vi.fn().mockResolvedValue({ count: 0, error: null })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const count = await getVideoViewCount("video-456")

      expect(count).toBe(0)
    })

    it("should return 0 on database error", async () => {
      const mockEq = vi.fn().mockResolvedValue({ count: null, error: { message: "Query failed" } })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const count = await getVideoViewCount("video-789")

      expect(count).toBe(0)
    })

    it("should return 0 when count is null", async () => {
      const mockEq = vi.fn().mockResolvedValue({ count: null, error: null })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const count = await getVideoViewCount("video-null")

      expect(count).toBe(0)
    })
  })

  describe("getVideoLastViewed", () => {
    it("should return last viewed timestamp for video", async () => {
      const timestamp = "2024-01-15T10:30:00Z"
      const mockSingle = vi.fn().mockResolvedValue({ data: { viewed_at: timestamp }, error: null })
      const mockLimit = vi.fn().mockReturnValue({ single: mockSingle })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getVideoLastViewed("video-123")

      expect(result).toBe(timestamp)
      expect(mockFrom).toHaveBeenCalledWith("video_views")
      expect(mockSelect).toHaveBeenCalledWith("viewed_at")
      expect(mockEq).toHaveBeenCalledWith("video_id", "video-123")
      expect(mockOrder).toHaveBeenCalledWith("viewed_at", { ascending: false })
      expect(mockLimit).toHaveBeenCalledWith(1)
    })

    it("should return null when video has never been viewed", async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "No rows found" } })
      const mockLimit = vi.fn().mockReturnValue({ single: mockSingle })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getVideoLastViewed("video-never-viewed")

      expect(result).toBeNull()
    })

    it("should return null on database error", async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: "Query failed" } })
      const mockLimit = vi.fn().mockReturnValue({ single: mockSingle })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getVideoLastViewed("video-error")

      expect(result).toBeNull()
    })

    it("should return null when viewed_at is null", async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: { viewed_at: null }, error: null })
      const mockLimit = vi.fn().mockReturnValue({ single: mockSingle })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getVideoLastViewed("video-null-timestamp")

      expect(result).toBeNull()
    })
  })

  describe("getTotalVideoViews", () => {
    it("should return total view count across all videos", async () => {
      const mockSelect = vi.fn().mockResolvedValue({ count: 15000, error: null })
      mockFrom.mockReturnValue({ select: mockSelect })

      const count = await getTotalVideoViews()

      expect(count).toBe(15000)
      expect(mockFrom).toHaveBeenCalledWith("video_views")
      expect(mockSelect).toHaveBeenCalledWith("*", { count: "exact", head: true })
    })

    it("should return 0 when no views exist", async () => {
      const mockSelect = vi.fn().mockResolvedValue({ count: 0, error: null })
      mockFrom.mockReturnValue({ select: mockSelect })

      const count = await getTotalVideoViews()

      expect(count).toBe(0)
    })

    it("should return 0 on database error", async () => {
      const mockSelect = vi.fn().mockResolvedValue({ count: null, error: { message: "Query failed" } })
      mockFrom.mockReturnValue({ select: mockSelect })

      const count = await getTotalVideoViews()

      expect(count).toBe(0)
    })

    it("should return 0 when count is null", async () => {
      const mockSelect = vi.fn().mockResolvedValue({ count: null, error: null })
      mockFrom.mockReturnValue({ select: mockSelect })

      const count = await getTotalVideoViews()

      expect(count).toBe(0)
    })
  })

  describe("getVideoViewsInDateRange", () => {
    it("should return view count within date range", async () => {
      const startDate = new Date("2024-01-01")
      const endDate = new Date("2024-01-31")

      const mockLte = vi.fn().mockResolvedValue({ count: 250, error: null })
      const mockGte = vi.fn().mockReturnValue({ lte: mockLte })
      const mockSelect = vi.fn().mockReturnValue({ gte: mockGte })
      mockFrom.mockReturnValue({ select: mockSelect })

      const count = await getVideoViewsInDateRange(startDate, endDate)

      expect(count).toBe(250)
      expect(mockFrom).toHaveBeenCalledWith("video_views")
      expect(mockGte).toHaveBeenCalledWith("viewed_at", startDate.toISOString())
      expect(mockLte).toHaveBeenCalledWith("viewed_at", endDate.toISOString())
    })

    it("should return 0 when no views in date range", async () => {
      const startDate = new Date("2024-06-01")
      const endDate = new Date("2024-06-30")

      const mockLte = vi.fn().mockResolvedValue({ count: 0, error: null })
      const mockGte = vi.fn().mockReturnValue({ lte: mockLte })
      const mockSelect = vi.fn().mockReturnValue({ gte: mockGte })
      mockFrom.mockReturnValue({ select: mockSelect })

      const count = await getVideoViewsInDateRange(startDate, endDate)

      expect(count).toBe(0)
    })

    it("should return 0 on database error", async () => {
      const startDate = new Date("2024-01-01")
      const endDate = new Date("2024-01-31")

      const mockLte = vi.fn().mockResolvedValue({ count: null, error: { message: "Query failed" } })
      const mockGte = vi.fn().mockReturnValue({ lte: mockLte })
      const mockSelect = vi.fn().mockReturnValue({ gte: mockGte })
      mockFrom.mockReturnValue({ select: mockSelect })

      const count = await getVideoViewsInDateRange(startDate, endDate)

      expect(count).toBe(0)
    })

    it("should return 0 when count is null", async () => {
      const startDate = new Date("2024-01-01")
      const endDate = new Date("2024-01-31")

      const mockLte = vi.fn().mockResolvedValue({ count: null, error: null })
      const mockGte = vi.fn().mockReturnValue({ lte: mockLte })
      const mockSelect = vi.fn().mockReturnValue({ gte: mockGte })
      mockFrom.mockReturnValue({ select: mockSelect })

      const count = await getVideoViewsInDateRange(startDate, endDate)

      expect(count).toBe(0)
    })
  })

  describe("getVideosWithViewCounts", () => {
    it("should aggregate video view counts correctly", async () => {
      const mockData = [
        { video_id: "video-1", viewed_at: "2024-01-15T10:00:00Z" },
        { video_id: "video-1", viewed_at: "2024-01-16T11:00:00Z" },
        { video_id: "video-2", viewed_at: "2024-01-15T12:00:00Z" },
        { video_id: "video-1", viewed_at: "2024-01-14T09:00:00Z" },
      ]

      const mockSelect = vi.fn().mockResolvedValue({ data: mockData, error: null })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getVideosWithViewCounts()

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        video_id: "video-1",
        total_views: 3,
        last_viewed: "2024-01-16T11:00:00Z",
      })
      expect(result[1]).toMatchObject({
        video_id: "video-2",
        total_views: 1,
        last_viewed: "2024-01-15T12:00:00Z",
      })
    })

    it("should return empty array when no views exist", async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getVideosWithViewCounts()

      expect(result).toEqual([])
    })

    it("should return empty array on database error", async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: null, error: { message: "Query failed" } })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getVideosWithViewCounts()

      expect(result).toEqual([])
    })

    it("should handle null data gracefully", async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: null, error: null })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getVideosWithViewCounts()

      expect(result).toEqual([])
    })
  })

  describe("getBatchVideoViewCounts", () => {
    it("should return view counts for multiple videos", async () => {
      const mockData = [
        { video_id: "video-1" },
        { video_id: "video-1" },
        { video_id: "video-2" },
        { video_id: "video-1" },
        { video_id: "video-3" },
      ]

      const mockIn = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getBatchVideoViewCounts(["video-1", "video-2", "video-3"])

      expect(result).toEqual({
        "video-1": 3,
        "video-2": 1,
        "video-3": 1,
      })
      expect(mockIn).toHaveBeenCalledWith("video_id", ["video-1", "video-2", "video-3"])
    })

    it("should return empty object for empty input array", async () => {
      const result = await getBatchVideoViewCounts([])

      expect(result).toEqual({})
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it("should include videos with 0 views", async () => {
      const mockData = [{ video_id: "video-1" }, { video_id: "video-1" }]

      const mockIn = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getBatchVideoViewCounts(["video-1", "video-2", "video-3"])

      expect(result).toEqual({
        "video-1": 2,
        "video-2": 0,
        "video-3": 0,
      })
    })

    it("should return empty object on database error", async () => {
      const mockIn = vi.fn().mockResolvedValue({ data: null, error: { message: "Query failed" } })
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getBatchVideoViewCounts(["video-1", "video-2"])

      expect(result).toEqual({})
    })

    it("should handle null data gracefully", async () => {
      const mockIn = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getBatchVideoViewCounts(["video-1"])

      expect(result).toEqual({ "video-1": 0 })
    })
  })

  describe("getBatchVideoLastViewed", () => {
    it("should return last viewed timestamps for multiple videos", async () => {
      const mockData = [
        { video_id: "video-1", viewed_at: "2024-01-16T11:00:00Z" },
        { video_id: "video-2", viewed_at: "2024-01-15T12:00:00Z" },
        { video_id: "video-1", viewed_at: "2024-01-14T09:00:00Z" },
        { video_id: "video-3", viewed_at: "2024-01-17T08:00:00Z" },
      ]

      const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getBatchVideoLastViewed(["video-1", "video-2", "video-3"])

      expect(result).toEqual({
        "video-1": "2024-01-16T11:00:00Z",
        "video-2": "2024-01-15T12:00:00Z",
        "video-3": "2024-01-17T08:00:00Z",
      })
      expect(mockOrder).toHaveBeenCalledWith("viewed_at", { ascending: false })
    })

    it("should return empty object for empty input array", async () => {
      const result = await getBatchVideoLastViewed([])

      expect(result).toEqual({})
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it("should include null for videos with no views", async () => {
      const mockData = [{ video_id: "video-1", viewed_at: "2024-01-15T10:00:00Z" }]

      const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getBatchVideoLastViewed(["video-1", "video-2", "video-3"])

      expect(result).toEqual({
        "video-1": "2024-01-15T10:00:00Z",
        "video-2": null,
        "video-3": null,
      })
    })

    it("should return empty object on database error", async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: { message: "Query failed" } })
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getBatchVideoLastViewed(["video-1", "video-2"])

      expect(result).toEqual({})
    })

    it("should handle null data gracefully", async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getBatchVideoLastViewed(["video-1"])

      expect(result).toEqual({ "video-1": null })
    })

    it("should only return most recent timestamp per video", async () => {
      const mockData = [
        { video_id: "video-1", viewed_at: "2024-01-20T11:00:00Z" },
        { video_id: "video-1", viewed_at: "2024-01-19T10:00:00Z" },
        { video_id: "video-1", viewed_at: "2024-01-18T09:00:00Z" },
      ]

      const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
      mockFrom.mockReturnValue({ select: mockSelect })

      const result = await getBatchVideoLastViewed(["video-1"])

      expect(result).toEqual({
        "video-1": "2024-01-20T11:00:00Z",
      })
    })
  })
})
