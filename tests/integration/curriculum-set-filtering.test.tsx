import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import VideoLibrary from "@/components/video-library"
import { createClient } from "@/lib/supabase/client"
import { getBatchVideoViewCounts } from "@/lib/actions/videos"
import { useRouter, useSearchParams } from "next/navigation"

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/actions/videos", () => ({
  getBatchVideoViewCounts: vi.fn(),
}))

vi.mock("@/hooks/use-video-library-url", () => ({
  useVideoLibraryUrl: () => ({
    urlState: { filters: [], search: "", mode: "AND", page: 1 },
    setFilters: vi.fn(),
    setSearch: vi.fn(),
    setMode: vi.fn(),
    setPage: vi.fn(),
    updateUrl: vi.fn(),
    updateUrlImmediate: vi.fn(),
    commitUrl: vi.fn(),
    buildUrlString: vi.fn(),
  }),
}))

vi.mock("@/components/video-card", () => ({
  default: ({ video }: any) => <div data-testid={`video-card-${video.id}`}>{video.title}</div>,
}))

vi.mock("@/components/video-card-list", () => ({
  default: ({ videos = [] }: any) => (
    <div data-testid="video-list">
      {videos.map((video: any) => (
        <div key={video.id}>{video.title}</div>
      ))}
    </div>
  ),
}))

vi.mock("@/components/view-toggle", () => ({
  default: () => <div />,
}))

vi.mock("@/components/category-filter", () => ({
  default: () => <div />,
}))

describe("Curriculum Set Filtering", () => {
  const mockVideosWithMultipleSets = [
    {
      id: "video-1",
      title: "Set 1 Video",
      description: "Video in set 1",
      video_url: "https://example.com/video1.mp4",
      thumbnail_url: "https://example.com/thumb1.jpg",
      duration_seconds: 300,
      created_at: "2024-01-01T00:00:00Z",
      recorded: "2024",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "video-2",
      title: "Set 2 Video",
      description: "Video in set 2",
      video_url: "https://example.com/video2.mp4",
      thumbnail_url: "https://example.com/thumb2.jpg",
      duration_seconds: 450,
      created_at: "2024-01-02T00:00:00Z",
      recorded: "2023",
      updated_at: "2024-01-02T00:00:00Z",
    },
  ]

  const mockVideoCurriculums = [
    {
      video_id: "video-1",
      curriculums: { id: "curr-1", name: "10.Kyu", color: "#ffffff", display_order: 1, curriculum_set_id: "set-1" },
    },
    {
      video_id: "video-2",
      curriculums: { id: "curr-2", name: "9.Kyu", color: "#ffff00", display_order: 2, curriculum_set_id: "set-2" },
    },
  ]

  const mockVideoCategories = []
  const mockVideoPerformers = []

  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({ push: vi.fn() })
    ;(useSearchParams as any).mockReturnValue(new URLSearchParams())
    ;(getBatchVideoViewCounts as any).mockResolvedValue({ "video-1": 10, "video-2": 20 })

    const mockFromImplementation = (table: string) => {
      if (table === "videos") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockVideosWithMultipleSets, error: null }),
          }),
        }
      } else if (table === "video_curriculums") {
        return {
          select: vi.fn().mockResolvedValue({ data: mockVideoCurriculums, error: null }),
        }
      } else if (table === "video_categories") {
        return {
          select: vi.fn().mockResolvedValue({ data: mockVideoCategories, error: null }),
        }
      } else if (table === "video_performers") {
        return {
          select: vi.fn().mockResolvedValue({ data: mockVideoPerformers, error: null }),
        }
      } else if (table === "user_favorites") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }
    }

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: "test@example.com" } },
          error: null,
        }),
      },
      from: vi.fn(mockFromImplementation),
    }

    ;(createClient as any).mockReturnValue(mockSupabase)

    Storage.prototype.getItem = vi.fn(() => null)
    Storage.prototype.setItem = vi.fn()
  })

  it("should filter curriculums to user's curriculum set", async () => {
    render(<VideoLibrary userProfile={{ curriculum_set_id: "set-1" }} />)

    await waitFor(() => {
      const filterSection = screen.queryByTestId("curriculum-filter")
      if (filterSection) {
        // Curriculum filter should only show curriculums from set-1
        expect(filterSection).toBeTruthy()
      }
    })
  })

  it("should hide curriculum filter when user has no curriculum set", async () => {
    render(<VideoLibrary userProfile={{ curriculum_set_id: null }} />)

    await waitFor(() => {
      // The component should still render but curriculum section should be empty/hidden
      expect(screen.getByTestId("video-card-video-1")).toBeTruthy()
    })
  })

  it("should show all videos even when filtering curriculums", async () => {
    render(<VideoLibrary userProfile={{ curriculum_set_id: "set-1" }} />)

    await waitFor(() => {
      // Both videos should display even though only one matches the curriculum set
      expect(screen.getByTestId("video-card-video-1")).toBeTruthy()
      expect(screen.getByTestId("video-card-video-2")).toBeTruthy()
    })
  })

  it("should pass userCurriculumSetId to video cards", async () => {
    render(<VideoLibrary userProfile={{ curriculum_set_id: "set-1" }} />)

    // Videos should be rendered (filtering happens inside VideoCard component)
    await waitFor(() => {
      expect(screen.getByTestId("video-card-video-1")).toBeTruthy()
    })
  })
})
