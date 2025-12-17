import type React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import VideoCardList from "@/components/video-card-list"

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

const { createClient } = await import("@/lib/supabase/client")

describe("VideoCardList", () => {
  const mockVideo = {
    id: "video-1",
    title: "Test Video",
    description: "Test Description",
    video_url: "https://example.com/video.mp4",
    thumbnail_url: "https://example.com/thumb.jpg",
    duration_seconds: 300,
    created_at: "2024-01-01",
    recorded: "2024-01-01",
    views: 100,
    categories: [{ id: "cat-1", name: "Category 1", color: "#ff0000" }],
    performers: [{ id: "perf-1", name: "Performer 1" }],
  }

  beforeEach(() => {
    vi.clearAllMocks()

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    }

    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
  })

  it("should render video title and description", () => {
    render(<VideoCardList video={mockVideo} />)

    expect(screen.getByText("Test Video")).toBeInTheDocument()
    expect(screen.getByText("Test Description")).toBeInTheDocument()
  })

  it("should render thumbnail image", () => {
    render(<VideoCardList video={mockVideo} />)

    const img = screen.getByAltText("Test Video")
    expect(img).toHaveAttribute("src", "https://example.com/thumb.jpg")
  })

  it("should render duration badge", () => {
    render(<VideoCardList video={mockVideo} />)

    expect(screen.getByText("5:00")).toBeInTheDocument()
  })

  it("should render categories and performers", () => {
    render(<VideoCardList video={mockVideo} />)

    expect(screen.getByText("Category 1")).toBeInTheDocument()
    expect(screen.getByText("Performer 1")).toBeInTheDocument()
  })

  it("should render recorded date when not Unset", () => {
    render(<VideoCardList video={mockVideo} />)

    expect(screen.getByText("2024-01-01")).toBeInTheDocument()
  })

  it("should not render recorded badge when Unset", () => {
    const videoWithoutRecorded = { ...mockVideo, recorded: "Unset" }
    render(<VideoCardList video={videoWithoutRecorded} />)

    const badges = screen.queryAllByText("Unset")
    expect(badges.length).toBe(0)
  })

  it("should display view count", () => {
    render(<VideoCardList video={mockVideo} viewCount={150} />)

    expect(screen.getByText("150 views")).toBeInTheDocument()
  })

  it("should use video.views when viewCount not provided", () => {
    render(<VideoCardList video={mockVideo} />)

    expect(screen.getByText("100 views")).toBeInTheDocument()
  })

  it("should render favorite button", () => {
    render(<VideoCardList video={mockVideo} />)

    const favoriteButton = screen.getByRole("button")
    expect(favoriteButton).toBeInTheDocument()
  })

  it("should show filled heart when favorited", () => {
    render(<VideoCardList video={mockVideo} isFavorited={true} />)

    const heart = screen.getByRole("button").querySelector("svg")
    expect(heart).toHaveClass("fill-red-500")
  })

  it("should toggle favorite when button clicked", async () => {
    const user = userEvent.setup()
    const onFavoriteToggle = vi.fn()
    render(<VideoCardList video={mockVideo} isFavorited={false} onFavoriteToggle={onFavoriteToggle} />)

    const favoriteButton = screen.getByRole("button")
    await user.click(favoriteButton)

    expect(onFavoriteToggle).toHaveBeenCalledWith("video-1", true)
  })

  it("should format duration as Unknown when null", () => {
    const videoWithoutDuration = { ...mockVideo, duration_seconds: null }
    render(<VideoCardList video={videoWithoutDuration} />)

    // Duration badge should not render when duration is null
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument()
  })

  it("should render link to video page", () => {
    render(<VideoCardList video={mockVideo} />)

    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/video/video-1")
  })
})
