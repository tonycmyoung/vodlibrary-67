"use client"

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useRouter, useSearchParams } from "next/navigation"
import VideoLibrary from "@/components/video-library"
import { createClient } from "@/lib/supabase/client"
import { getBatchVideoViewCounts } from "@/lib/actions/videos"

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

// Mock video actions
vi.mock("@/lib/actions/videos", () => ({
  getBatchVideoViewCounts: vi.fn(),
}))

// Mock child components to isolate VideoLibrary logic
vi.mock("@/components/video-card", () => ({
  default: ({ video }: any) => <div data-testid={`video-card-${video.id}`}>{video.title}</div>,
}))

vi.mock("@/components/video-card-list", () => ({
  default: ({ videos = [] }: any) => (
    <div data-testid="video-list">
      {videos.map((video: any) => (
        <div key={video.id} data-testid={`video-list-item-${video.id}`}>
          {video.title}
        </div>
      ))}
    </div>
  ),
}))

vi.mock("@/components/view-toggle", () => ({
  default: ({ view, onViewChange }: any) => (
    <div data-testid="view-toggle">
      <button onClick={() => onViewChange("grid")}>Grid</button>
      <button onClick={() => onViewChange("list")}>List</button>
      <span>Current: {view}</span>
    </div>
  ),
}))

vi.mock("@/components/category-filter", () => ({
  default: ({ onCategoryToggle, onCurriculumToggle, videoCount, selectedCategories, selectedCurriculums }: any) => (
    <div data-testid="category-filter">
      <span data-testid="video-count">Videos: {videoCount}</span>
      <button onClick={() => onCategoryToggle("cat-1")}>Toggle Category</button>
      {onCurriculumToggle && <button onClick={() => onCurriculumToggle("curr-1")}>Toggle Curriculum</button>}
      <span data-testid="selected-filters">
        Filters: {selectedCategories.length + (selectedCurriculums?.length || 0)}
      </span>
    </div>
  ),
}))

vi.mock("@/components/sort-control", () => ({
  default: ({ sortBy, sortOrder, onSortChange }: any) => (
    <div data-testid="sort-control">
      <button data-testid="sort-by-button" onClick={() => onSortChange("title", sortOrder)}>
        Change Sort
      </button>
      <button
        data-testid="sort-order-button"
        onClick={() => onSortChange(sortBy, sortOrder === "asc" ? "desc" : "asc")}
      >
        Toggle Order
      </button>
      <span data-testid="current-sort">
        {sortBy}-{sortOrder}
      </span>
    </div>
  ),
}))

vi.mock("@/components/search-input", () => ({
  default: ({ searchQuery, onSearchChange }: any) => (
    <div data-testid="search-input">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search videos"
      />
    </div>
  ),
}))

describe("VideoLibrary", () => {
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
  }

  const mockSearchParams = {
    get: vi.fn(),
  }

  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  }

  const mockVideos = [
    {
      id: "video-1",
      title: "Basic Bo Kata",
      description: "Beginner bo staff form",
      video_url: "https://example.com/video1.mp4",
      thumbnail_url: "https://example.com/thumb1.jpg",
      duration_seconds: 300,
      created_at: "2024-01-01T00:00:00Z",
      recorded: "2024",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "video-2",
      title: "Advanced Sai Techniques",
      description: "Advanced sai techniques",
      video_url: "https://example.com/video2.mp4",
      thumbnail_url: "https://example.com/thumb2.jpg",
      duration_seconds: 450,
      created_at: "2024-01-02T00:00:00Z",
      recorded: "2023",
      updated_at: "2024-01-02T00:00:00Z",
    },
    {
      id: "video-3",
      title: "Nunchaku Basics",
      description: "Introduction to nunchaku",
      video_url: "https://example.com/video3.mp4",
      thumbnail_url: "https://example.com/thumb3.jpg",
      duration_seconds: 200,
      created_at: "2024-01-03T00:00:00Z",
      recorded: "2024",
      updated_at: "2024-01-03T00:00:00Z",
    },
  ]

  const mockVideoCategories = [
    {
      video_id: "video-1",
      categories: { id: "cat-1", name: "Bo", color: "#ff0000", description: "Staff weapon" },
    },
    {
      video_id: "video-2",
      categories: { id: "cat-2", name: "Sai", color: "#00ff00", description: "Trident weapon" },
    },
  ]

  const mockVideoCurriculums = [
    {
      video_id: "video-1",
      curriculums: { id: "curr-1", name: "10.Kyu", color: "#ffffff", display_order: 1, description: "White belt" },
    },
    {
      video_id: "video-2",
      curriculums: { id: "curr-2", name: "9.Kyu", color: "#ffff00", display_order: 2, description: "Yellow belt" },
    },
  ]

  const mockVideoPerformers = [
    {
      video_id: "video-1",
      performers: { id: "perf-1", name: "John Doe" },
    },
    {
      video_id: "video-2",
      performers: { id: "perf-2", name: "Jane Smith" },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue(mockRouter)
    ;(useSearchParams as any).mockReturnValue(mockSearchParams)
    ;(createClient as any).mockReturnValue(mockSupabase)
    ;(getBatchVideoViewCounts as any).mockResolvedValue({
      "video-1": 10,
      "video-2": 25,
      "video-3": 5,
    })

    mockSearchParams.get.mockReturnValue(null)

    // Mock Supabase auth
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    })

    // Mock Supabase queries - matching actual component structure
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "videos") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockVideos, error: null }),
          }),
        }
      } else if (table === "user_favorites") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ video_id: "video-1" }],
              error: null,
            }),
          }),
        }
      } else if (table === "video_categories") {
        return {
          select: vi.fn().mockResolvedValue({ data: mockVideoCategories, error: null }),
        }
      } else if (table === "video_curriculums") {
        return {
          select: vi.fn().mockResolvedValue({ data: mockVideoCurriculums, error: null }),
        }
      } else if (table === "video_performers") {
        return {
          select: vi.fn().mockResolvedValue({ data: mockVideoPerformers, error: null }),
        }
      } else {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
    })

    // Mock localStorage
    Storage.prototype.getItem = vi.fn(() => null)
    Storage.prototype.setItem = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("Data Loading", () => {
    it("should load and display videos", async () => {
      render(<VideoLibrary />)

      await waitFor(() => {
        expect(screen.getByTestId("video-card-video-1")).toBeTruthy()
        expect(screen.getByTestId("video-card-video-2")).toBeTruthy()
        expect(screen.getByTestId("video-card-video-3")).toBeTruthy()
      })
    })

    it("should fetch user authentication on mount", async () => {
      render(<VideoLibrary />)

      await waitFor(() => {
        expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      })
    })

    it("should fetch videos with proper Supabase query", async () => {
      render(<VideoLibrary />)

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith("videos")
      })

      const videosCall = mockSupabase.from.mock.results.find((result: any) =>
        result.value.select.mock.calls[0]?.[0].includes("id, title"),
      )
      expect(videosCall).toBeDefined()
    })

    it("should fetch batch video view counts", async () => {
      render(<VideoLibrary />)

      await waitFor(() => {
        expect(getBatchVideoViewCounts).toHaveBeenCalledWith(["video-1", "video-2", "video-3"])
      })
    })
  })

  describe("Filtering", () => {
    it("should display category filter component with correct props", async () => {
      render(<VideoLibrary />)

      await waitFor(() => {
        const categoryFilter = screen.getByTestId("category-filter")
        expect(categoryFilter).toBeTruthy()
        expect(screen.getByTestId("video-count")).toHaveTextContent("Videos: 3")
        expect(screen.getByTestId("selected-filters")).toHaveTextContent("Filters: 0")
      })
    })

    it("should handle category toggle and update URL", async () => {
      render(<VideoLibrary />)

      await waitFor(() => {
        expect(screen.getByTestId("category-filter")).toBeTruthy()
      })

      const toggleButton = screen.getByText("Toggle Category")
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId("selected-filters")).toHaveTextContent("Filters: 1")
      })

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith(
          expect.stringContaining("filters="),
          expect.objectContaining({ scroll: false }),
        )
      })
    })

    it("should filter by favorites when favoritesOnly prop is true", async () => {
      render(<VideoLibrary favoritesOnly={true} />)

      await waitFor(() => {
        const favoritesCalls = mockSupabase.from.mock.calls.filter((call: any) => call[0] === "user_favorites")
        expect(favoritesCalls.length).toBeGreaterThan(0)
      })

      await waitFor(() => {
        expect(screen.getByTestId("video-card-video-1")).toBeTruthy()
        expect(screen.queryByTestId("video-card-video-2")).toBeNull()
        expect(screen.queryByTestId("video-card-video-3")).toBeNull()
      })
    })

    it("should filter by maxCurriculumOrder when provided", async () => {
      render(<VideoLibrary maxCurriculumOrder={1} />)

      await waitFor(() => {
        const videosCalls = mockSupabase.from.mock.calls.filter((call: any) => call[0] === "videos")
        expect(videosCalls.length).toBeGreaterThan(0)
      })

      await waitFor(() => {
        expect(screen.getByTestId("video-card-video-1")).toBeTruthy()
        expect(screen.queryByTestId("video-card-video-2")).toBeNull()
        expect(screen.queryByTestId("video-card-video-3")).toBeNull()
      })
    })

    it("should sync selected filters from URL on mount and apply them", async () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === "filters") return JSON.stringify(["cat-1"])
        return null
      })

      render(<VideoLibrary />)

      await waitFor(() => {
        const categoryFilter = screen.getByTestId("category-filter")
        expect(categoryFilter).toBeTruthy()
      })

      await waitFor(
        () => {
          expect(screen.getByTestId("selected-filters")).toHaveTextContent("Filters: 1")
        },
        { timeout: 2000 },
      )

      await waitFor(() => {
        expect(screen.getByTestId("video-card-video-1")).toBeTruthy()
        expect(screen.queryByTestId("video-card-video-2")).toBeNull()
      })
    })
  })

  describe("Sorting", () => {
    it("should display sort control with initial state", async () => {
      render(<VideoLibrary />)

      await waitFor(() => {
        const sortControls = screen.getAllByTestId("sort-control")
        expect(sortControls.length).toBeGreaterThan(0)
        const currentSort = screen.getAllByTestId("current-sort")[0]
        expect(currentSort).toHaveTextContent("created_at-asc")
      })
    })

    it("should handle sort change", async () => {
      render(<VideoLibrary />)

      await waitFor(() => {
        const sortControls = screen.getAllByTestId("sort-control")
        expect(sortControls.length).toBeGreaterThan(0)
      })

      const sortButton = screen.getAllByTestId("sort-by-button")[0]
      fireEvent.click(sortButton)

      await waitFor(() => {
        const currentSort = screen.getAllByTestId("current-sort")[0]
        expect(currentSort).toHaveTextContent("title-asc")
      })
    })

    it("should handle sort order change", async () => {
      render(<VideoLibrary />)

      await waitFor(() => {
        const sortControls = screen.getAllByTestId("sort-control")
        expect(sortControls.length).toBeGreaterThan(0)
      })

      const orderButton = screen.getAllByTestId("sort-order-button")[0]
      fireEvent.click(orderButton)

      // Verify the current sort display updates
      await waitFor(() => {
        const currentSort = screen.getAllByTestId("current-sort")[0]
        expect(currentSort).toHaveTextContent("created_at-desc")
      })
    })

    it("should load sort preferences from localStorage and apply them", async () => {
      Storage.prototype.getItem = vi.fn((key) => {
        if (key === "videoLibrarySortBy") return "title"
        if (key === "videoLibrarySortOrder") return "desc"
        return null
      })

      render(<VideoLibrary />)

      await waitFor(() => {
        const currentSort = screen.getAllByTestId("current-sort")[0]
        expect(currentSort).toHaveTextContent("title-desc")
        expect(localStorage.getItem).toHaveBeenCalledWith("videoLibrarySortBy")
        expect(localStorage.getItem).toHaveBeenCalledWith("videoLibrarySortOrder")
      })
    })
  })

  describe("Pagination", () => {
    it("should display pagination controls and show correct page", async () => {
      render(<VideoLibrary />)

      await waitFor(() => {
        expect(screen.getAllByText("Show")[0]).toBeTruthy()
        expect(screen.getAllByText("per page")[0]).toBeTruthy()
      })

      // Verify all videos are shown on first page with default 12 items per page
      expect(screen.getByTestId("video-card-video-1")).toBeTruthy()
      expect(screen.getByTestId("video-card-video-2")).toBeTruthy()
      expect(screen.getByTestId("video-card-video-3")).toBeTruthy()
    })

    it("should sync current page from URL and display correct videos", async () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === "page") return "2"
        return null
      })

      Storage.prototype.getItem = vi.fn((key) => {
        if (key === "videoLibraryItemsPerPage") return "1"
        return null
      })

      render(<VideoLibrary />)

      await waitFor(() => {
        expect(screen.getAllByText("Show")[0]).toBeTruthy()
      })

      await waitFor(
        () => {
          // On page 2 with 1 item per page, should show video-2
          expect(screen.getByTestId("video-card-video-2")).toBeTruthy()
          expect(screen.queryByTestId("video-card-video-1")).toBeNull()
          expect(screen.queryByTestId("video-card-video-3")).toBeNull()
        },
        { timeout: 2000 },
      )
    })

    it("should load items per page from localStorage and apply pagination", async () => {
      Storage.prototype.getItem = vi.fn((key) => {
        if (key === "videoLibraryItemsPerPage") return "2"
        return null
      })

      render(<VideoLibrary />)

      await waitFor(() => {
        expect(localStorage.getItem).toHaveBeenCalledWith("videoLibraryItemsPerPage")
        expect(screen.getByTestId("video-card-video-1")).toBeTruthy()
        expect(screen.getByTestId("video-card-video-2")).toBeTruthy()
        expect(screen.queryByTestId("video-card-video-3")).toBeNull()
      })
    })
  })

  describe("View Toggle", () => {
    it("should display view toggle with initial state", async () => {
      render(<VideoLibrary />)

      await waitFor(() => {
        expect(screen.getByTestId("view-toggle")).toBeTruthy()
        expect(screen.getByText("Current: grid")).toBeTruthy()
      })
    })

    it("should handle view change to list", async () => {
      render(<VideoLibrary />)

      await waitFor(() => {
        expect(screen.getByTestId("view-toggle")).toBeTruthy()
      })

      const listButton = screen.getAllByText("List")[0]
      fireEvent.click(listButton)

      await waitFor(() => {
        expect(screen.getByText("Current: list")).toBeTruthy()
        const videoLists = screen.getAllByTestId("video-list")
        expect(videoLists.length).toBeGreaterThan(0)
      })
    })

    it("should load view preference from localStorage and render correct view", async () => {
      Storage.prototype.getItem = vi.fn((key) => {
        if (key === "videoLibraryView") return "list"
        return null
      })

      render(<VideoLibrary />)

      await waitFor(() => {
        expect(localStorage.getItem).toHaveBeenCalledWith("videoLibraryView")
      })

      await waitFor(() => {
        expect(screen.getByText("Current: list")).toBeTruthy()
      })

      await waitFor(() => {
        const videoLists = screen.getAllByTestId("video-list")
        expect(videoLists.length).toBeGreaterThan(0)
      })
    })
  })

  describe("Search", () => {
    it("should display search input with initial value", async () => {
      render(<VideoLibrary />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search videos/i) as HTMLInputElement
        expect(searchInput).toBeTruthy()
        expect(searchInput.value).toBe("")
      })
    })

    it("should sync search query from URL and filter results", async () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === "search") return "Advanced"
        return null
      })

      render(<VideoLibrary />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/Search videos/i) as HTMLInputElement
        expect(searchInput.value).toBe("Advanced")
      })

      await waitFor(() => {
        expect(screen.queryByTestId("video-card-video-1")).toBeNull()
        expect(screen.getByTestId("video-card-video-2")).toBeTruthy()
        expect(screen.queryByTestId("video-card-video-3")).toBeNull()
      })
    })
  })

  describe("URL State Edge Cases", () => {
    it("should handle invalid JSON in filters URL parameter", async () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === "filters") return "invalid-json"
        return null
      })

      render(<VideoLibrary />)

      await waitFor(() => {
        expect(screen.getByTestId("category-filter")).toBeTruthy()
      })

      // Should fall back to empty filters when JSON is invalid
      await waitFor(() => {
        expect(screen.getByTestId("selected-filters")).toHaveTextContent("Filters: 0")
      })
    })

    it("should handle negative page number in URL", async () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === "page") return "-1"
        return null
      })

      render(<VideoLibrary />)

      await waitFor(() => {
        expect(screen.getByTestId("video-card-video-1")).toBeTruthy()
      })

      // Should default to page 1 when page number is invalid
      await waitFor(() => {
        const videos = screen.getAllByTestId(/video-card-/)
        expect(videos.length).toBeGreaterThan(0)
      })
    })

    it("should handle excessively large page number in URL", async () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === "page") return "9999"
        return null
      })

      render(<VideoLibrary />)

      await waitFor(() => {
        expect(screen.getByTestId("video-card-video-1")).toBeTruthy()
      })

      // Should show available videos even when page number exceeds total pages
      await waitFor(() => {
        const videos = screen.getAllByTestId(/video-card-/)
        expect(videos.length).toBeGreaterThan(0)
      })
    })

    it("should handle empty search query in URL", async () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === "search") return ""
        return null
      })

      render(<VideoLibrary />)

      await waitFor(() => {
        expect(screen.getByTestId("video-card-video-1")).toBeTruthy()
      })

      // Should show all videos when search is empty
      await waitFor(() => {
        const videos = screen.getAllByTestId(/video-card-/)
        expect(videos.length).toBe(3)
      })
    })
  })

  describe("Custom Storage Prefix", () => {
    it("should use custom storage prefix when provided", async () => {
      render(<VideoLibrary storagePrefix="customLibrary" />)

      await waitFor(() => {
        expect(screen.getByTestId("view-toggle")).toBeTruthy()
      })

      const listButton = screen.getAllByText("List")[0]
      fireEvent.click(listButton)

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith("customLibraryView", "list")
      })
    })

    it("should use favoritesLibrary prefix when favoritesOnly is true", async () => {
      render(<VideoLibrary favoritesOnly={true} />)

      await waitFor(() => {
        expect(screen.getByTestId("view-toggle")).toBeTruthy()
      })

      const listButton = screen.getAllByText("List")[0]
      fireEvent.click(listButton)

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith("favoritesLibraryView", "list")
      })
    })
  })

  describe("View Change Handling", () => {
    it("should handle view change to list view", async () => {
      render(<VideoLibrary />)

      await waitFor(() => {
        expect(screen.queryByText("Loading videos...")).toBeNull()
      })

      const listButton = screen.getAllByText("List")[0]
      fireEvent.click(listButton)

      await waitFor(() => {
        expect(screen.getAllByTestId("video-list").length).toBeGreaterThan(0)
      })
    })
  })
})
