import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import VideoCard from "@/components/video-card"
import { createClient } from "@/lib/supabase/client"
import { useIsMobile } from "@/hooks/use-mobile"

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(),
}))

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe("VideoCard", () => {
  const mockVideo = {
    id: "video-1",
    title: "Test Video",
    description: "Test description",
    video_url: "https://example.com/video.mp4",
    thumbnail_url: "https://example.com/thumb.jpg",
    duration_seconds: 125,
    created_at: "2024-01-01",
    recorded: "2023",
    views: 100,
    categories: [
      { id: "cat-1", name: "Bo", color: "#ff0000" },
      { id: "cat-2", name: "Sai", color: "#00ff00" },
    ],
    performers: [{ id: "perf-1", name: "John Doe" }],
    curriculums: [
      { id: "curr-1", name: "10.Kyu", color: "#ffffff", display_order: 1 },
      { id: "curr-2", name: "9.Kyu", color: "#ffff00", display_order: 2 },
    ],
  }

  const mockGetUser = vi.fn()
  const mockDelete = vi.fn()
  const mockInsert = vi.fn()
  const mockEq = vi.fn()
  const mockFrom = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useIsMobile).mockReturnValue(false)

    const mockEq2 = vi.fn().mockResolvedValue({ data: null, error: null })
    mockEq.mockReturnValue({ eq: mockEq2 })
    mockDelete.mockReturnValue({ eq: mockEq })
    mockInsert.mockResolvedValue({ data: null, error: null })

    // Return the same mock object structure for all table queries
    mockFrom.mockReturnValue({
      delete: mockDelete,
      insert: mockInsert,
    })

    const mockSupabaseClient = {
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    }

    vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any)
  })

  it("should render video card with all information", () => {
    render(<VideoCard video={mockVideo} />)

    expect(screen.getByText("Test Video")).toBeTruthy()
    expect(screen.getByText("Test description")).toBeTruthy()
    expect(screen.getByText("2:05")).toBeTruthy() // 125 seconds
    expect(screen.getByText("100 views")).toBeTruthy()
  })

  it("should render categories and curriculums", () => {
    render(<VideoCard video={mockVideo} />)

    expect(screen.getByText("Bo")).toBeTruthy()
    expect(screen.getByText("Sai")).toBeTruthy()
    expect(screen.getByText("10.Kyu")).toBeTruthy()
    expect(screen.getByText("9.Kyu")).toBeTruthy()
  })

  it("should render performer badge", () => {
    render(<VideoCard video={mockVideo} />)

    expect(screen.getByText("John Doe")).toBeTruthy()
  })

  it("should render recorded year", () => {
    render(<VideoCard video={mockVideo} />)

    expect(screen.getByText("2023")).toBeTruthy()
  })

  it("should format duration correctly", () => {
    const videoWithDuration = { ...mockVideo, duration_seconds: 3665 } // 1 hour, 1 minute, 5 seconds
    render(<VideoCard video={videoWithDuration} />)

    expect(screen.getByText("61:05")).toBeTruthy()
  })

  it("should not show duration badge when duration is null", () => {
    const videoWithoutDuration = { ...mockVideo, duration_seconds: null }
    render(<VideoCard video={videoWithoutDuration} />)

    // Badge should not be present when duration is null
    expect(screen.queryByText("Unknown")).toBeNull()
    // The Clock icon should also not be present
    const card = screen.getByText("Test Video").closest(".group")
    const clockIcon = card?.querySelector('[class*="lucide-clock"]')
    expect(clockIcon).toBeNull()
  })

  it("should render placeholder when no thumbnail", () => {
    const videoWithoutThumbnail = { ...mockVideo, thumbnail_url: null }
    render(<VideoCard video={videoWithoutThumbnail} />)

    // Should render gradient background with Play icon
    const card = screen.getByText("Test Video").closest(".group")
    expect(card).toBeTruthy()
  })

  it("should toggle favorite when heart button is clicked", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
      error: null,
    })

    const onFavoriteToggle = vi.fn()
    render(<VideoCard video={mockVideo} isFavorited={false} onFavoriteToggle={onFavoriteToggle} />)

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled()
    })

    const heartButton = screen.getByRole("button")
    fireEvent.click(heartButton)

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("user_favorites")
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user-1",
        video_id: "video-1",
      })
      expect(onFavoriteToggle).toHaveBeenCalledWith("video-1", true)
    })
  })

  it("should remove favorite when already favorited", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
      error: null,
    })

    const onFavoriteToggle = vi.fn()
    render(<VideoCard video={mockVideo} isFavorited={true} onFavoriteToggle={onFavoriteToggle} />)

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled()
    })

    await new Promise((resolve) => setTimeout(resolve, 50))

    const heartButton = screen.getByRole("button")
    fireEvent.click(heartButton)

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("user_favorites")
      expect(mockDelete).toHaveBeenCalled()
      expect(onFavoriteToggle).toHaveBeenCalledWith("video-1", false)
    })
  })

  it("should not toggle favorite when user is not logged in", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    render(<VideoCard video={mockVideo} />)

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled()
    })

    const heartButton = screen.getByRole("button")
    fireEvent.click(heartButton)

    await waitFor(() => {
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  it("should display custom view count", () => {
    render(<VideoCard video={mockVideo} viewCount={250} />)

    expect(screen.getByText("250 views")).toBeTruthy()
  })

  it("should filter out invalid categories", () => {
    const videoWithInvalidCategories = {
      ...mockVideo,
      categories: [
        { id: "cat-1", name: "Bo", color: "#ff0000" },
        { id: null, name: null, color: null }, // Invalid
      ],
    }
    render(<VideoCard video={videoWithInvalidCategories as any} />)

    expect(screen.getByText("Bo")).toBeTruthy()
    expect(screen.queryByText("null")).toBeNull()
  })

  it("should sort curriculums by display_order", () => {
    const videoWithUnsortedCurriculums = {
      ...mockVideo,
      curriculums: [
        { id: "curr-2", name: "9.Kyu", color: "#ffff00", display_order: 2 },
        { id: "curr-1", name: "10.Kyu", color: "#ffffff", display_order: 1 },
      ],
    }
    render(<VideoCard video={videoWithUnsortedCurriculums} />)

    const badges = screen.getAllByText(/Kyu/)
    expect(badges[0]).toHaveTextContent("10.Kyu")
    expect(badges[1]).toHaveTextContent("9.Kyu")
  })

  it("should not render recorded badge when value is Unset", () => {
    const videoWithUnsetRecorded = { ...mockVideo, recorded: "Unset" }
    render(<VideoCard video={videoWithUnsetRecorded} />)

    expect(screen.queryByText("Unset")).toBeNull()
  })
})
