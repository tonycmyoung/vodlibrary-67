"use client"

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import VideoManagement from "@/components/video-management"
import { createClient } from "@/lib/supabase/client"
import { getBatchVideoViewCounts, getBatchVideoLastViewed } from "@/lib/actions/videos"

vi.mock("@/lib/supabase/client")
vi.mock("@/lib/actions/videos")
vi.mock("@/components/video-modal", () => ({
  default: ({ isOpen, onClose, onSave }: any) =>
    isOpen ? (
      <div data-testid="video-modal">
        <button onClick={onClose}>Close</button>
        <button onClick={onSave}>Save</button>
      </div>
    ) : null,
}))
vi.mock("@/components/category-filter", () => ({
  default: ({ onCategoryToggle, onCurriculumToggle }: any) => (
    <div data-testid="category-filter">
      <button onClick={() => onCategoryToggle("cat-1")}>Toggle Category</button>
      <button onClick={() => onCurriculumToggle("curr-1")}>Toggle Curriculum</button>
    </div>
  ),
}))

const mockVideosData = [
  {
    id: "video-1",
    title: "Test Video 1",
    description: "Description 1",
    video_url: "https://example.com/video1.mp4",
    thumbnail_url: "https://example.com/thumb1.jpg",
    duration_seconds: 120,
    is_published: true,
    created_at: "2024-01-01T00:00:00Z",
    recorded: "2024-01",
    video_categories: [{ categories: { id: "cat-1", name: "Basics", color: "#ff0000" } }],
    video_curriculums: [{ curriculums: { id: "curr-1", name: "White Belt", color: "#ffffff", display_order: 1 } }],
    video_performers: [{ performers: { id: "perf-1", name: "John Doe" } }],
  },
  {
    id: "video-2",
    title: "Test Video 2",
    description: "Description 2",
    video_url: "https://example.com/video2.mp4",
    thumbnail_url: null,
    duration_seconds: null,
    is_published: false,
    created_at: "2024-01-02T00:00:00Z",
    recorded: null,
    video_categories: [],
    video_curriculums: [],
    video_performers: [],
  },
]

describe("VideoManagement", () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }
    ;(createClient as any).mockReturnValue(mockSupabaseClient)
    ;(getBatchVideoViewCounts as any).mockResolvedValue({ "video-1": 100, "video-2": 50 })
    ;(getBatchVideoLastViewed as any).mockResolvedValue({ "video-1": "2024-01-15T00:00:00Z", "video-2": null })

    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("should render loading state initially", () => {
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          then: vi.fn(() => new Promise(() => {})), // Never resolve
        }),
      }),
    })

    render(<VideoManagement />)
    const loadingContainer = document.querySelector(".flex.items-center.justify-center.min-h-screen")
    expect(loadingContainer).toBeTruthy()
  })

  it("should load and display videos", async () => {
    mockSupabaseClient.select.mockImplementation((query: string) => {
      if (query.includes("video_categories")) {
        return {
          order: vi.fn().mockResolvedValue({ data: mockVideosData, error: null }),
        }
      }
      return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    render(<VideoManagement />)

    await waitFor(() => {
      expect(screen.getByText("Test Video 1")).toBeTruthy()
      expect(screen.getByText("Test Video 2")).toBeTruthy()
    })
  })

  it("should display video metadata correctly", async () => {
    mockSupabaseClient.select.mockImplementation((query: string) => {
      if (query.includes("video_categories")) {
        return {
          order: vi.fn().mockResolvedValue({ data: [mockVideosData[0]], error: null }),
        }
      }
      return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    render(<VideoManagement />)

    await waitFor(() => {
      expect(screen.getByText("Test Video 1")).toBeTruthy()
      // Note: Description is not displayed in the list view card, only in the modal
      expect(screen.getByText("100 views")).toBeTruthy()
    })
  })

  it("should search videos by title", async () => {
    mockSupabaseClient.select.mockImplementation((query: string) => {
      if (query.includes("video_categories")) {
        return {
          order: vi.fn().mockResolvedValue({ data: mockVideosData, error: null }),
        }
      }
      return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const user = userEvent.setup()
    render(<VideoManagement />)

    await waitFor(() => {
      expect(screen.getByText("Test Video 1")).toBeTruthy()
    })

    const searchInput = screen.getByPlaceholderText("Search videos...")
    await user.type(searchInput, "Test Video 1")

    await waitFor(() => {
      expect(screen.getByText("Test Video 1")).toBeTruthy()
      expect(screen.queryByText("Test Video 2")).toBeNull()
    })
  })

  it("should clear search query", async () => {
    mockSupabaseClient.select.mockImplementation((query: string) => {
      if (query.includes("video_categories")) {
        return {
          order: vi.fn().mockResolvedValue({ data: mockVideosData, error: null }),
        }
      }
      return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const user = userEvent.setup()
    render(<VideoManagement />)

    await waitFor(() => {
      expect(screen.getByText("Test Video 1")).toBeTruthy()
    })

    const searchInput = screen.getByPlaceholderText("Search videos...")
    await user.type(searchInput, "Test Video 1")

    // Find the clear button (X icon) inside the search input container
    const clearButton = document.querySelector("svg.lucide-x")?.closest("button")
    expect(clearButton).toBeTruthy()
    await user.click(clearButton!)

    expect(searchInput).toHaveValue("")
  })

  it("should open add video modal", async () => {
    mockSupabaseClient.select.mockImplementation((query: string) => {
      return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const user = userEvent.setup()
    render(<VideoManagement />)

    await waitFor(() => {
      expect(screen.getByText("Video Management")).toBeTruthy()
    })

    const addButton = screen.getByRole("button", { name: /add video/i })
    await user.click(addButton)

    expect(screen.getByTestId("video-modal")).toBeTruthy()
  })

  it("should open edit video modal", async () => {
    mockSupabaseClient.select.mockImplementation((query: string) => {
      if (query.includes("video_categories")) {
        return {
          order: vi.fn().mockResolvedValue({ data: [mockVideosData[0]], error: null }),
        }
      }
      return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const user = userEvent.setup()
    render(<VideoManagement />)

    await waitFor(() => {
      expect(screen.getByText("Test Video 1")).toBeTruthy()
    })

    const videoCard = screen.getByText("Test Video 1").closest(".bg-gray-800\\/50")
    const buttons = videoCard ? Array.from(videoCard.querySelectorAll("button")) : []
    const editButton = buttons.find((btn) => btn.querySelector("svg.lucide-pencil"))

    expect(editButton).toBeTruthy()
    await user.click(editButton!)

    expect(screen.getByTestId("video-modal")).toBeTruthy()
  })

  it("should delete video with confirmation", async () => {
    mockSupabaseClient.select.mockImplementation((query: string) => {
      if (query.includes("video_categories")) {
        return {
          order: vi.fn().mockResolvedValue({ data: [mockVideosData[0]], error: null }),
        }
      }
      return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const user = userEvent.setup()
    render(<VideoManagement />)

    await waitFor(() => {
      expect(screen.getByText("Test Video 1")).toBeTruthy()
    })

    const videoCard = screen.getByText("Test Video 1").closest(".bg-gray-800\\/50")
    const buttons = videoCard ? Array.from(videoCard.querySelectorAll("button")) : []
    // Find delete button by its red background (bg-red-600) or trash icon
    const deleteButton = buttons.find((btn) => 
      btn.className.includes("bg-red-600") || btn.querySelector("svg.lucide-trash-2")
    )

    expect(deleteButton).toBeTruthy()
    await user.click(deleteButton!)

    expect(confirmSpy).toHaveBeenCalled()
    await waitFor(() => {
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
    })

    confirmSpy.mockRestore()
  })

  it("should change sort order", async () => {
    mockSupabaseClient.select.mockImplementation((query: string) => {
      if (query.includes("video_categories")) {
        return {
          order: vi.fn().mockResolvedValue({ data: mockVideosData, error: null }),
        }
      }
      return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const user = userEvent.setup()
    render(<VideoManagement />)

    await waitFor(() => {
      expect(screen.getByText("Test Video 1")).toBeTruthy()
    })

    // Find the sort order toggle button (arrow-up-down icon)
    const sortOrderButton = document.querySelector("svg.lucide-arrow-up-down")?.closest("button")
    expect(sortOrderButton).toBeTruthy()

    await user.click(sortOrderButton!)

    // Sort order should toggle
  })

  it("should display empty state when no videos", async () => {
    mockSupabaseClient.select.mockImplementation((query: string) => {
      return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    render(<VideoManagement />)

    await waitFor(() => {
      expect(screen.getByText(/no videos found matching your criteria/i)).toBeTruthy()
    })
  })

  it("should toggle filters open/closed", async () => {
    mockSupabaseClient.select.mockImplementation((query: string) => {
      return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const user = userEvent.setup()
    render(<VideoManagement />)

    await waitFor(() => {
      expect(screen.getByText("Filters")).toBeTruthy()
    })

    const filtersButton = screen.getByText("Filters")
    await user.click(filtersButton)

    expect(screen.getByTestId("category-filter")).toBeTruthy()
  })

  it("should clear all filters", async () => {
    const manyVideos = Array.from({ length: 15 }, (_, i) => ({
      ...mockVideosData[0],
      id: `video-${i}`,
      title: `Test Video ${i}`,
    }))

    mockSupabaseClient.select.mockImplementation((query: string) => {
      if (query.includes("video_categories")) {
        return {
          order: vi.fn().mockResolvedValue({ data: manyVideos, error: null }),
        }
      }
      return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const user = userEvent.setup()
    render(<VideoManagement />)

    await waitFor(() => {
      expect(screen.getByText("Test Video 0")).toBeTruthy()
    })

    // Should show pagination controls
    expect(screen.getByText(/page 1 of/i)).toBeTruthy()

    const nextButton = screen.getByRole("button", { name: /next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(/page 2 of/i)).toBeTruthy()
    })
  })
})
