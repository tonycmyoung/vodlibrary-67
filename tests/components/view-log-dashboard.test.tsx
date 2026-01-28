import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ViewLogDashboard from "@/components/view-log-dashboard"
import * as actions from "@/lib/actions"

vi.mock("@/lib/actions", () => ({
  fetchVideoViewLogs: vi.fn(),
}))

const mockLogs = [
  {
    id: "view-1",
    video_id: "video-1",
    video_title: "Basic Bo Techniques",
    categories: ["Bo", "Basics"],
    user_id: "user-1",
    user_name: "John Doe",
    user_email: "john@example.com",
    viewed_at: new Date().toISOString(),
  },
  {
    id: "view-2",
    video_id: "video-2",
    video_title: "Advanced Sai Forms",
    categories: ["Sai"],
    user_id: null,
    user_name: null,
    user_email: null,
    viewed_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "view-3",
    video_id: "video-3",
    video_title: "Tonfa Combinations",
    categories: [],
    user_id: "user-2",
    user_name: null,
    user_email: "jane@example.com",
    viewed_at: new Date(Date.now() - 7200000).toISOString(),
  },
]

describe("ViewLogDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should display loading state initially", () => {
    vi.mocked(actions.fetchVideoViewLogs).mockImplementation(() => new Promise(() => {}))

    render(<ViewLogDashboard />)

    expect(screen.getByText("Loading view logs...")).toBeTruthy()
    const spinner = document.querySelector(".animate-spin")
    expect(spinner).toBeTruthy()
  })

  it("should display view logs after successful fetch", async () => {
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: mockLogs,
      totalCount: 3,
    })

    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Basic Bo Techniques")).toBeTruthy()
    })

    expect(screen.getByText("Advanced Sai Forms")).toBeTruthy()
    expect(screen.getByText("Tonfa Combinations")).toBeTruthy()
    expect(screen.getByText("3 views total")).toBeTruthy()
  })

  it("should display empty state when no logs exist", async () => {
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: [],
      totalCount: 0,
    })

    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("No video views recorded yet")).toBeTruthy()
    })

    expect(screen.getByText("View logs will appear here when users watch videos")).toBeTruthy()
  })

  it("should display user information for authenticated views", async () => {
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: mockLogs,
      totalCount: 3,
    })

    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeTruthy()
    })

    expect(screen.getByText("john@example.com")).toBeTruthy()
  })

  it("should display Anonymous for unauthenticated views", async () => {
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: mockLogs,
      totalCount: 3,
    })

    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Anonymous")).toBeTruthy()
    })
  })

  it("should display email when name is not available", async () => {
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: mockLogs,
      totalCount: 3,
    })

    render(<ViewLogDashboard />)

    await waitFor(() => {
      // User 2 has no name but has email - should show email prefix as name
      expect(screen.getByText("jane")).toBeTruthy()
    })
  })

  it("should display category badges", async () => {
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: mockLogs,
      totalCount: 3,
    })

    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Bo")).toBeTruthy()
    })

    expect(screen.getByText("Basics")).toBeTruthy()
    expect(screen.getByText("Sai")).toBeTruthy()
  })

  it("should display dash for videos without categories", async () => {
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: [mockLogs[2]], // Tonfa Combinations has no categories
      totalCount: 1,
    })

    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Tonfa Combinations")).toBeTruthy()
    })

    const row = screen.getByText("Tonfa Combinations").closest("tr")
    expect(row?.textContent).toContain("-")
  })

  it("should refresh logs when refresh button is clicked", async () => {
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: mockLogs,
      totalCount: 3,
    })

    const user = userEvent.setup()
    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Basic Bo Techniques")).toBeTruthy()
    })

    const refreshButton = screen.getByRole("button", { name: /refresh/i })
    await user.click(refreshButton)

    expect(actions.fetchVideoViewLogs).toHaveBeenCalledTimes(2)
  })

  it("should handle fetch errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.mocked(actions.fetchVideoViewLogs).mockRejectedValue(new Error("Fetch failed"))

    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load view logs:", expect.any(Error))
    })

    consoleErrorSpy.mockRestore()
  })

  it("should filter logs when search query is entered", async () => {
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: mockLogs,
      totalCount: 3,
    })

    const user = userEvent.setup()
    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Basic Bo Techniques")).toBeTruthy()
    })

    const searchInput = screen.getByPlaceholderText("Search video or user...")
    await user.type(searchInput, "Bo")

    await waitFor(() => {
      expect(actions.fetchVideoViewLogs).toHaveBeenCalledWith(1, 25, "Bo")
    })
  })

  it("should show search term in results count", async () => {
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: [mockLogs[0]],
      totalCount: 1,
    })

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
    vi.mocked(actions.fetchVideoViewLogs)
      .mockResolvedValueOnce({
        success: true,
        data: mockLogs,
        totalCount: 3,
      })
      .mockResolvedValueOnce({
        success: true,
        data: [],
        totalCount: 0,
      })

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
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: mockLogs,
      totalCount: 75, // 3 pages with 25 per page
    })

    render(<ViewLogDashboard />)

    await waitFor(() => {
      // Page info appears in both stats row and pagination - use getAllByText
      const pageTexts = screen.getAllByText("Page 1 of 3")
      expect(pageTexts.length).toBeGreaterThan(0)
    })

    expect(screen.getByRole("button", { name: /previous/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /next/i })).toBeTruthy()
  })

  it("should disable previous button on first page", async () => {
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: mockLogs,
      totalCount: 75,
    })

    render(<ViewLogDashboard />)

    await waitFor(() => {
      const pageTexts = screen.getAllByText("Page 1 of 3")
      expect(pageTexts.length).toBeGreaterThan(0)
    })

    const prevButton = screen.getByRole("button", { name: /previous/i })
    expect(prevButton).toBeDisabled()
  })

  it("should navigate to next page when next button is clicked", async () => {
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: mockLogs,
      totalCount: 75,
    })

    const user = userEvent.setup()
    render(<ViewLogDashboard />)

    await waitFor(() => {
      const pageTexts = screen.getAllByText("Page 1 of 3")
      expect(pageTexts.length).toBeGreaterThan(0)
    })

    const nextButton = screen.getByRole("button", { name: /next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(actions.fetchVideoViewLogs).toHaveBeenCalledWith(2, 25, "")
    })
  })

  it("should navigate to previous page when previous button is clicked", async () => {
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: mockLogs,
      totalCount: 75,
    })

    const user = userEvent.setup()
    render(<ViewLogDashboard />)

    await waitFor(() => {
      const pageTexts = screen.getAllByText("Page 1 of 3")
      expect(pageTexts.length).toBeGreaterThan(0)
    })

    // Go to page 2 first
    const nextButton = screen.getByRole("button", { name: /next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(actions.fetchVideoViewLogs).toHaveBeenCalledWith(2, 25, "")
    })

    // Then go back to page 1
    const prevButton = screen.getByRole("button", { name: /previous/i })
    await user.click(prevButton)

    await waitFor(() => {
      expect(actions.fetchVideoViewLogs).toHaveBeenCalledWith(1, 25, "")
    })
  })

  it("should not show pagination for single page results", async () => {
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: mockLogs,
      totalCount: 3, // Less than 25 per page
    })

    render(<ViewLogDashboard />)

    await waitFor(() => {
      expect(screen.getByText("Basic Bo Techniques")).toBeTruthy()
    })

    expect(screen.queryByRole("button", { name: /previous/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /next/i })).toBeNull()
  })

  it("should reset to page 1 when search query changes", async () => {
    vi.mocked(actions.fetchVideoViewLogs).mockResolvedValue({
      success: true,
      data: mockLogs,
      totalCount: 75,
    })

    const user = userEvent.setup()
    render(<ViewLogDashboard />)

    await waitFor(() => {
      const pageTexts = screen.getAllByText("Page 1 of 3")
      expect(pageTexts.length).toBeGreaterThan(0)
    })

    // Navigate to page 2
    const nextButton = screen.getByRole("button", { name: /next/i })
    await user.click(nextButton)

    await waitFor(() => {
      expect(actions.fetchVideoViewLogs).toHaveBeenCalledWith(2, 25, "")
    })

    // Now search - should reset to page 1
    const searchInput = screen.getByPlaceholderText("Search video or user...")
    await user.type(searchInput, "test")

    await waitFor(() => {
      expect(actions.fetchVideoViewLogs).toHaveBeenCalledWith(1, 25, "test")
    })
  })
})
