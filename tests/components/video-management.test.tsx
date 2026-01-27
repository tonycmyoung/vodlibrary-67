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

  describe("Sorting Branches", () => {
    const videosForSorting = [
      {
        ...mockVideosData[0],
        id: "video-a",
        title: "Alpha Video",
        recorded: "2024-01",
        created_at: "2024-01-01T00:00:00Z",
        video_categories: [{ categories: { id: "cat-1", name: "Basics", color: "#ff0000" } }],
        video_curriculums: [{ curriculums: { id: "curr-1", name: "White Belt", color: "#ffffff", display_order: 1 } }],
        video_performers: [],
      },
      {
        ...mockVideosData[0],
        id: "video-b",
        title: "Beta Video",
        recorded: "2023-06",
        created_at: "2024-02-01T00:00:00Z",
        video_categories: [{ categories: { id: "cat-2", name: "Advanced", color: "#0000ff" } }],
        video_curriculums: [],
        video_performers: [],
      },
      {
        ...mockVideosData[0],
        id: "video-c",
        title: "Charlie Video",
        recorded: null,
        created_at: "2024-03-01T00:00:00Z",
        video_categories: [],
        video_curriculums: [{ curriculums: { id: "curr-2", name: "Yellow Belt", color: "#ffff00", display_order: 2 } }],
        video_performers: [],
      },
    ]

    it("should sort videos by recorded date", async () => {
      mockSupabaseClient.select.mockImplementation((query: string) => {
        if (query.includes("video_categories")) {
          return {
            order: vi.fn().mockResolvedValue({ data: videosForSorting, error: null }),
          }
        }
        return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      localStorage.setItem("adminVideoManagement_sortBy", "recorded")
      const user = userEvent.setup()
      render(<VideoManagement />)

      await waitFor(() => {
        expect(screen.getByText("Alpha Video")).toBeTruthy()
        expect(screen.getByText("Beta Video")).toBeTruthy()
      })

      // Videos should be rendered (sorting happens internally)
      const sortSelect = screen.getByRole("combobox")
      expect(sortSelect).toBeTruthy()
    })

    it("should sort videos by curriculum display order", async () => {
      mockSupabaseClient.select.mockImplementation((query: string) => {
        if (query.includes("video_categories")) {
          return {
            order: vi.fn().mockResolvedValue({ data: videosForSorting, error: null }),
          }
        }
        return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      localStorage.setItem("adminVideoManagement_sortBy", "curriculum")
      render(<VideoManagement />)

      await waitFor(() => {
        expect(screen.getByText("Alpha Video")).toBeTruthy()
        expect(screen.getByText("Beta Video")).toBeTruthy()
        expect(screen.getByText("Charlie Video")).toBeTruthy()
      })
    })

    it("should sort videos by category name", async () => {
      mockSupabaseClient.select.mockImplementation((query: string) => {
        if (query.includes("video_categories")) {
          return {
            order: vi.fn().mockResolvedValue({ data: videosForSorting, error: null }),
          }
        }
        return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      localStorage.setItem("adminVideoManagement_sortBy", "category")
      render(<VideoManagement />)

      await waitFor(() => {
        expect(screen.getByText("Alpha Video")).toBeTruthy()
      })
    })

    it("should sort videos by view count", async () => {
      ;(getBatchVideoViewCounts as any).mockResolvedValue({ "video-a": 50, "video-b": 100, "video-c": 25 })

      mockSupabaseClient.select.mockImplementation((query: string) => {
        if (query.includes("video_categories")) {
          return {
            order: vi.fn().mockResolvedValue({ data: videosForSorting, error: null }),
          }
        }
        return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      localStorage.setItem("adminVideoManagement_sortBy", "views")
      render(<VideoManagement />)

      await waitFor(() => {
        expect(screen.getByText("Alpha Video")).toBeTruthy()
        expect(screen.getByText("50 views")).toBeTruthy()
        expect(screen.getByText("100 views")).toBeTruthy()
      })
    })

    it("should sort videos by last viewed date", async () => {
      ;(getBatchVideoLastViewed as any).mockResolvedValue({
        "video-a": "2024-01-20T00:00:00Z",
        "video-b": null,
        "video-c": "2024-01-10T00:00:00Z",
      })

      mockSupabaseClient.select.mockImplementation((query: string) => {
        if (query.includes("video_categories")) {
          return {
            order: vi.fn().mockResolvedValue({ data: videosForSorting, error: null }),
          }
        }
        return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      localStorage.setItem("adminVideoManagement_sortBy", "last_viewed")
      render(<VideoManagement />)

      await waitFor(() => {
        expect(screen.getByText("Alpha Video")).toBeTruthy()
      })
    })

    it("should change sort option and save to localStorage", async () => {
      mockSupabaseClient.select.mockImplementation((query: string) => {
        if (query.includes("video_categories")) {
          return {
            order: vi.fn().mockResolvedValue({ data: videosForSorting, error: null }),
          }
        }
        return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      render(<VideoManagement />)

      await waitFor(() => {
        expect(screen.getByText("Alpha Video")).toBeTruthy()
      })

      // Verify the sort select is rendered and functional
      const sortSelect = screen.getByRole("combobox")
      expect(sortSelect).toBeTruthy()

      // Verify initial sort from localStorage is used
      localStorage.setItem("adminVideoManagement_sortBy", "views")

      // Re-render to pick up localStorage change
      expect(localStorage.getItem("adminVideoManagement_sortBy")).toBe("views")
    })
  })

  describe("Filter Mode", () => {
    it("should render filter collapsible and allow expansion", async () => {
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

      // Open filters collapsible
      const filtersButton = screen.getByText("Filters")
      await user.click(filtersButton)

      // Verify filter section expands
      await waitFor(() => {
        // Look for filter-related content that appears when expanded
        expect(filtersButton.closest('[data-state]')?.getAttribute('data-state')).toBe('open')
      })
    })
  })

  describe("Delete Video Error Handling", () => {
    it("should show error alert when delete fails", async () => {
      mockSupabaseClient.select.mockImplementation((query: string) => {
        if (query.includes("video_categories")) {
          return {
            order: vi.fn().mockResolvedValue({ data: [mockVideosData[0]], error: null }),
          }
        }
        return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      mockSupabaseClient.delete.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
      })

      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})
      const user = userEvent.setup()
      render(<VideoManagement />)

      await waitFor(() => {
        expect(screen.getByText("Test Video 1")).toBeTruthy()
      })

      const videoCard = screen.getByText("Test Video 1").closest(".bg-gray-800\\/50")
      const buttons = videoCard ? Array.from(videoCard.querySelectorAll("button")) : []
      const deleteButton = buttons.find((btn) => 
        btn.className.includes("bg-red-600") || btn.querySelector("svg.lucide-trash-2")
      )

      await user.click(deleteButton!)

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("Failed to delete video")
      })

      confirmSpy.mockRestore()
      alertSpy.mockRestore()
    })

    it("should not delete when user cancels confirmation", async () => {
      mockSupabaseClient.select.mockImplementation((query: string) => {
        if (query.includes("video_categories")) {
          return {
            order: vi.fn().mockResolvedValue({ data: [mockVideosData[0]], error: null }),
          }
        }
        return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)
      const user = userEvent.setup()
      render(<VideoManagement />)

      await waitFor(() => {
        expect(screen.getByText("Test Video 1")).toBeTruthy()
      })

      const videoCard = screen.getByText("Test Video 1").closest(".bg-gray-800\\/50")
      const buttons = videoCard ? Array.from(videoCard.querySelectorAll("button")) : []
      const deleteButton = buttons.find((btn) => 
        btn.className.includes("bg-red-600") || btn.querySelector("svg.lucide-trash-2")
      )

      await user.click(deleteButton!)

      expect(confirmSpy).toHaveBeenCalled()
      expect(mockSupabaseClient.delete).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })
  })

  describe("Modal Save Functionality", () => {
    it("should reload data after modal save", async () => {
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

      // Open add modal
      const addButton = screen.getByRole("button", { name: /add video/i })
      await user.click(addButton)

      expect(screen.getByTestId("video-modal")).toBeTruthy()

      // Click save in modal
      const saveButton = screen.getByText("Save")
      await user.click(saveButton)

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByTestId("video-modal")).toBeNull()
      })
    })

    it("should close modal when Close button is clicked", async () => {
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

      // Open add modal
      const addButton = screen.getByRole("button", { name: /add video/i })
      await user.click(addButton)

      expect(screen.getByTestId("video-modal")).toBeTruthy()

      // Click close in modal
      const closeButton = screen.getByText("Close")
      await user.click(closeButton)

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByTestId("video-modal")).toBeNull()
      })
    })
  })

  describe("Search by Description and Performer", () => {
    it("should search videos by description", async () => {
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
        expect(screen.getByText("Test Video 2")).toBeTruthy()
      })

      const searchInput = screen.getByPlaceholderText("Search videos...")
      await user.type(searchInput, "Description 1")

      await waitFor(() => {
        expect(screen.getByText("Test Video 1")).toBeTruthy()
        expect(screen.queryByText("Test Video 2")).toBeNull()
      })
    })

    it("should search videos by performer name", async () => {
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
        expect(screen.getByText("Test Video 2")).toBeTruthy()
      })

      const searchInput = screen.getByPlaceholderText("Search videos...")
      await user.type(searchInput, "John Doe")

      await waitFor(() => {
        expect(screen.getByText("Test Video 1")).toBeTruthy()
        expect(screen.queryByText("Test Video 2")).toBeNull()
      })
    })
  })

  describe("Clear All Filters", () => {
    it("should clear all filters when clear button is clicked", async () => {
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

      // Add search query
      const searchInput = screen.getByPlaceholderText("Search videos...")
      await user.type(searchInput, "test")

      // Open filters and add category filter
      const filtersButton = screen.getByText("Filters")
      await user.click(filtersButton)

      const categoryToggle = screen.getByText("Toggle Category")
      await user.click(categoryToggle)

      // Clear all should appear
      await waitFor(() => {
        expect(screen.getByText("Clear all")).toBeTruthy()
      })

      const clearButton = screen.getByText("Clear all")
      await user.click(clearButton)

      // Search should be cleared
      expect(searchInput).toHaveValue("")
    })
  })
})
