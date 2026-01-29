import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import VideoPlayer from "@/components/video-player"
import { createClient } from "@/lib/supabase/client"
import { incrementVideoViews } from "@/lib/actions"

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/actions", () => ({
  incrementVideoViews: vi.fn(),
}))

window.history.back = vi.fn()

describe("VideoPlayer", () => {
  const mockVideo = {
    id: "video-1",
    title: "Test Video",
    description: "Test description for video",
    video_url: "https://drive.google.com/file/d/abc123/view",
    duration_seconds: 125,
    created_at: "2024-01-01T00:00:00Z",
    recorded: "2023",
    isFavorited: false,
    views: 100,
    curriculums: [{ id: "curr-1", name: "White Belt", color: "#ffffff", display_order: 1 }],
    categories: [{ id: "cat-1", name: "Bo", color: "#ff0000" }],
    performers: [{ id: "perf-1", name: "John Doe" }],
  }

  const mockGetUser = vi.fn()
  const mockDelete = vi.fn()
  const mockInsert = vi.fn()
  const mockEq = vi.fn()
  const mockFrom = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(incrementVideoViews).mockResolvedValue(undefined)

    const mockEq2 = vi.fn().mockResolvedValue({ data: null, error: null })
    mockEq.mockReturnValue({ eq: mockEq2 })
    mockDelete.mockReturnValue({ eq: mockEq })
    mockInsert.mockResolvedValue({ data: null, error: null })

    mockFrom.mockImplementation(() => ({
      delete: mockDelete,
      insert: mockInsert,
    }))

    const mockSupabaseClient = {
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    }

    vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any)
  })

  it("should render video title and description", () => {
    render(<VideoPlayer video={mockVideo} />)

    expect(screen.getByText("Test Video")).toBeTruthy()
    expect(screen.getByText("Test description for video")).toBeTruthy()
  })

  it("should render video information badges", () => {
    render(<VideoPlayer video={mockVideo} />)

    expect(screen.getByText("White Belt")).toBeTruthy()
    expect(screen.getByText("Bo")).toBeTruthy()
    expect(screen.getByText("John Doe")).toBeTruthy()
    expect(screen.getByText("Recorded 2023")).toBeTruthy()
  })

  it("should display view count", async () => {
    render(<VideoPlayer video={mockVideo} />)

    await waitFor(() => {
      expect(screen.getByText(/101 views/i)).toBeTruthy()
    })
  })

  it("should increment video views on mount", async () => {
    render(<VideoPlayer video={mockVideo} />)

    await waitFor(() => {
      expect(incrementVideoViews).toHaveBeenCalledWith("video-1")
    })
  })

  it("should convert Google Drive URL to embeddable format", () => {
    render(<VideoPlayer video={mockVideo} />)

    const iframe = screen.getByTitle("Test Video")
    expect(iframe).toHaveAttribute("src", expect.stringContaining("drive.google.com/file/d/abc123/preview"))
  })

  it("should show Back to Library button", () => {
    render(<VideoPlayer video={mockVideo} />)

    const backButton = screen.getByText("Back to Library")
    expect(backButton).toBeTruthy()
  })

  it("should call window.history.back when Back button is clicked", () => {
    render(<VideoPlayer video={mockVideo} />)

    const backButton = screen.getByText("Back to Library")
    fireEvent.click(backButton)

    expect(window.history.back).toHaveBeenCalled()
  })

  it("should toggle fullscreen mode when Fullscreen View button is clicked", () => {
    render(<VideoPlayer video={mockVideo} />)

    const fullscreenButton = screen.getByText("Fullscreen View")
    fireEvent.click(fullscreenButton)

    expect(screen.getByLabelText("Exit fullscreen")).toBeTruthy()
  })

  it("should exit fullscreen mode when close button is clicked", () => {
    render(<VideoPlayer video={mockVideo} />)

    const fullscreenButton = screen.getByText("Fullscreen View")
    fireEvent.click(fullscreenButton)

    const exitButton = screen.getByLabelText("Exit fullscreen")
    fireEvent.click(exitButton)

    expect(screen.getByText("Fullscreen View")).toBeTruthy()
  })

  it("should toggle favorite when heart button is clicked", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "test@example.com" } },
      error: null,
    })

    render(<VideoPlayer video={mockVideo} />)

    const buttons = screen.getAllByRole("button")
    const heartButton = buttons.find((button) => button.querySelector("svg.lucide-heart"))

    expect(heartButton).toBeDefined()

    await fireEvent.click(heartButton!)

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("user_favorites")
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "user-1",
        video_id: "video-1",
      })
    })
  })

  it("should show No Video Available when video_url is missing", () => {
    const videoWithoutUrl = { ...mockVideo, video_url: "" }
    render(<VideoPlayer video={videoWithoutUrl} />)

    expect(screen.getByText("No Video Available")).toBeTruthy()
  })

  it("should render legal notice", () => {
    render(<VideoPlayer video={mockVideo} />)

    expect(screen.getByText(/Videos are for personal study only/i)).toBeTruthy()
  })

  it("should not render recorded year when it's null", () => {
    const videoWithoutRecorded = { ...mockVideo, recorded: null }
    render(<VideoPlayer video={videoWithoutRecorded} />)

    expect(screen.queryByText("2023")).toBeNull()
  })

  it("should not render recorded year when it's Unset", () => {
    const videoWithUnsetRecorded = { ...mockVideo, recorded: "Unset" }
    render(<VideoPlayer video={videoWithUnsetRecorded} />)

    expect(screen.queryByText("Unset")).toBeNull()
  })
})
