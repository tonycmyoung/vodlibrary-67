import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ViewLogDashboard from "@/components/view-log-dashboard"

// Mock Supabase client
const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockIn = vi.fn()
const mockFrom = vi.fn()

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}))

const mockViewLogs = [
  {
    id: "view-1",
    video_id: "video-1",
    user_id: "user-1",
    viewed_at: new Date().toISOString(),
    videos: { id: "video-1", title: "Basic Bo Techniques" },
    users: { id: "user-1", full_name: "John Doe", email: "john@example.com" },
  },
  {
    id: "view-2",
    video_id: "video-2",
    user_id: null,
    viewed_at: new Date(Date.now() - 3600000).toISOString(),
    videos: { id: "video-2", title: "Advanced Sai Forms" },
    users: null,
  },
  {
    id: "view-3",
    video_id: "video-3",
    user_id: "user-2",
    viewed_at: new Date(Date.now() - 7200000).toISOString(),
    videos: { id: "video-3", title: "Tonfa Combinations" },
    users: { id: "user-2", full_name: null, email: "jane@example.com" },
  },
]

const mockCategoryData = [
  { video_id: "video-1", categories: { name: "Bo" } },
  { video_id: "video-1", categories: { name: "Basics" } },
  { video_id: "video-2", categories: { name: "Sai" } },
]

describe("ViewLogDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementation
    mockFrom.mockImplementation((table: string) => {
      if (table === "video_views") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockViewLogs,
              error: null,
            }),
          }),
        }
      }
      if (table === "video_categories") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: mockCategoryData,
              error: null,
            }),
          }),
        }
      }
      return { select: vi.fn() }
    })
  })

  it("should display loading state initially", () => {
    // Make the query hang
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockImplementation(() => new Promise(() => {})),
      }),
    }))

    render(<ViewLogDashboard />)

    const spinner = document.querySelector(".animate-spin")
    expect(spinner).toBeTruthy()
  })

  it("should display view logs after successful fetch", async () => {
    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Basic Bo Techniques")).toBeTruthy()
    })

    expect(screen.getByText("Advanced Sai Forms")).toBeTruthy()
    expect(screen.getByText("Tonfa Combinations")).toBeTruthy()
  })

  it("should display empty state when no logs exist", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "video_views") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }
      }
      return { select: vi.fn() }
    })

    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("No video views recorded yet")).toBeTruthy()
    })

    expect(screen.getByText("View logs will appear here when users watch videos")).toBeTruthy()
  })

  it("should display user information for authenticated views", async () => {
    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    expect(screen.getByText("john@example.com")).toBeTruthy()
  })

  it("should display Anonymous for unauthenticated views", async () => {
    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Anonymous")).toBeTruthy()
    })
  })

  it("should display email prefix when name is not available", async () => {
    render(<ViewLogDashboard />)

    await waitFor(() => {
      // User 2 has no name but has email - should show email prefix as name
      expect(screen.getByText("jane")).toBeTruthy()
    })
  })

  it("should display category badges", async () => {
    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Bo")).toBeTruthy()
    })

    expect(screen.getByText("Basics")).toBeTruthy()
    expect(screen.getByText("Sai")).toBeTruthy()
  })

  it("should display dash for videos without categories", async () => {
    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Tonfa Combinations")).toBeTruthy()
    })

    // Check that there's a dash in the row (for empty categories)
    const row = screen.getByText("Tonfa Combinations").closest("tr")
    expect(row?.textContent).toContain("-")
  })

  it("should refresh logs when refresh button is clicked", async () => {
    const user = userEvent.setup()
    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Basic Bo Techniques")).toBeTruthy()
    })

    // Clear calls count
    mockFrom.mockClear()

    const refreshButton = screen.getByRole("button", { name: /refresh/i })
    await user.click(refreshButton)

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("video_views")
    })
  })

  it("should handle fetch errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      }),
    }))

    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })

  it("should filter logs client-side when search query is entered", async () => {
    const user = userEvent.setup()
    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Basic Bo Techniques")).toBeTruthy()
    })

    // All three videos should be visible initially
    expect(screen.getByText("Advanced Sai Forms")).toBeTruthy()
    expect(screen.getByText("Tonfa Combinations")).toBeTruthy()

    const searchInput = screen.getByPlaceholderText("Search video or user...")
    await user.type(searchInput, "Bo")

    // After search, only Bo video should be visible
    await waitFor(() => {
      expect(screen.getByText("Basic Bo Techniques")).toBeTruthy()
      expect(screen.queryByText("Advanced Sai Forms")).toBeNull()
      expect(screen.queryByText("Tonfa Combinations")).toBeNull()
    })
  })

  it("should show search term in results count", async () => {
    const user = userEvent.setup()
    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Basic Bo Techniques")).toBeTruthy()
    })

    const searchInput = screen.getByPlaceholderText("Search video or user...")
    await user.type(searchInput, "Bo")

    await waitFor(() => {
      expect(screen.getByText(/matching "Bo"/)).toBeTruthy()
    })
  })

  it("should display no results message when search returns empty", async () => {
    const user = userEvent.setup()
    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Basic Bo Techniques")).toBeTruthy()
    })

    const searchInput = screen.getByPlaceholderText("Search video or user...")
    await user.type(searchInput, "nonexistent")

    await waitFor(() => {
      expect(screen.getByText("No view logs match your search")).toBeTruthy()
    })

    expect(screen.getByText("Try a different search term")).toBeTruthy()
  })

  it("should display pagination controls when there are multiple pages", async () => {
    // Create 30 mock logs to span 2 pages
    const manyLogs = Array.from({ length: 30 }, (_, i) => ({
      id: `view-${i}`,
      video_id: `video-${i}`,
      user_id: null,
      viewed_at: new Date(Date.now() - i * 3600000).toISOString(),
      videos: { id: `video-${i}`, title: `Video ${i}` },
      users: null,
    }))

    mockFrom.mockImplementation((table: string) => {
      if (table === "video_views") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: manyLogs,
              error: null,
            }),
          }),
        }
      }
      if (table === "video_categories") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }
      }
      return { select: vi.fn() }
    })

    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 2")).toBeTruthy()
    })

    expect(screen.getByRole("button", { name: /previous/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /next/i })).toBeTruthy()
  })

  it("should disable previous button on first page", async () => {
    const manyLogs = Array.from({ length: 30 }, (_, i) => ({
      id: `view-${i}`,
      video_id: `video-${i}`,
      user_id: null,
      viewed_at: new Date(Date.now() - i * 3600000).toISOString(),
      videos: { id: `video-${i}`, title: `Video ${i}` },
      users: null,
    }))

    mockFrom.mockImplementation((table: string) => {
      if (table === "video_views") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: manyLogs,
              error: null,
            }),
          }),
        }
      }
      if (table === "video_categories") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }
      }
      return { select: vi.fn() }
    })

    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 2")).toBeTruthy()
    })

    const prevButton = screen.getByRole("button", { name: /previous/i })
    expect(prevButton).toBeDisabled()
  })

  it("should navigate to next page when next button is clicked", async () => {
    const manyLogs = Array.from({ length: 30 }, (_, i) => ({
      id: `view-${i}`,
      video_id: `video-${i}`,
      user_id: null,
      viewed_at: new Date(Date.now() - i * 3600000).toISOString(),
      videos: { id: `video-${i}`, title: `Video ${i}` },
      users: null,
    }))

    mockFrom.mockImplementation((table: string) => {
      if (table === "video_views") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: manyLogs,
              error: null,
            }),
          }),
        }
      }
      if (table === "video_categories") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }
      }
      return { select: vi.fn() }
    })

    const user = userEvent.setup()
    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 2")).toBeTruthy()
    })

    const nextButton = screen.getByRole("button", { name: /next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText("Page 2 of 2")).toBeTruthy()
    })
  })

  it("should not show pagination for single page results", async () => {
    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Basic Bo Techniques")).toBeTruthy()
    })

    expect(screen.queryByRole("button", { name: /previous/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /next/i })).toBeNull()
  })

  it("should reset to page 1 when search query changes", async () => {
    const manyLogs = Array.from({ length: 30 }, (_, i) => ({
      id: `view-${i}`,
      video_id: `video-${i}`,
      user_id: null,
      viewed_at: new Date(Date.now() - i * 3600000).toISOString(),
      videos: { id: `video-${i}`, title: `Video ${i}` },
      users: null,
    }))

    mockFrom.mockImplementation((table: string) => {
      if (table === "video_views") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: manyLogs,
              error: null,
            }),
          }),
        }
      }
      if (table === "video_categories") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }
      }
      return { select: vi.fn() }
    })

    const user = userEvent.setup()
    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 2")).toBeTruthy()
    })

    // Navigate to page 2
    const nextButton = screen.getByRole("button", { name: /next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText("Page 2 of 2")).toBeTruthy()
    })

    // Search - should reset to page 1
    const searchInput = screen.getByPlaceholderText("Search video or user...")
    await user.type(searchInput, "Video 1")

    await waitFor(() => {
      // Should show filtered results with fewer pages or just one page
      expect(screen.queryByText("Page 2 of 2")).toBeNull()
    })
  })
})
