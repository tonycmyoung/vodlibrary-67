import type React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import VideoCardList from "@/components/video-card-list"
import { createClient } from "@/lib/supabase/client"

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

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

    vi.mocked(createClient).mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>)
  })

  it("should render video title and description", async () => {
    await act(async () => {
      render(<VideoCardList video={mockVideo} />)
    })

    expect(screen.getByText("Test Video")).toBeTruthy()
    expect(screen.getByText("Test Description")).toBeTruthy()
  })

  it("should render thumbnail image", async () => {
    await act(async () => {
      render(<VideoCardList video={mockVideo} />)
    })

    const img = screen.getByAltText("Test Video")
    expect(img).toHaveAttribute("src", "https://example.com/thumb.jpg")
  })

  it("should render duration badge", async () => {
    await act(async () => {
      render(<VideoCardList video={mockVideo} />)
    })

    expect(screen.getByText("5:00")).toBeTruthy()
  })

  it("should render categories and performers", async () => {
    await act(async () => {
      render(<VideoCardList video={mockVideo} />)
    })

    expect(screen.getByText("Category 1")).toBeTruthy()
    expect(screen.getByText("Performer 1")).toBeTruthy()
  })

  it("should render recorded date when not Unset", async () => {
    await act(async () => {
      render(<VideoCardList video={mockVideo} />)
    })

    expect(screen.getByText("2024-01-01")).toBeTruthy()
  })

  it("should not render recorded badge when Unset", async () => {
    const videoWithoutRecorded = { ...mockVideo, recorded: "Unset" }
    await act(async () => {
      render(<VideoCardList video={videoWithoutRecorded} />)
    })

    const badges = screen.queryAllByText("Unset")
    expect(badges.length).toBe(0)
  })

  it("should display view count", async () => {
    await act(async () => {
      render(<VideoCardList video={mockVideo} viewCount={150} />)
    })

    expect(screen.getByText("150 views")).toBeTruthy()
  })

  it("should use video.views when viewCount not provided", async () => {
    await act(async () => {
      render(<VideoCardList video={mockVideo} />)
    })

    expect(screen.getByText("100 views")).toBeTruthy()
  })

  it("should render favorite button", async () => {
    await act(async () => {
      render(<VideoCardList video={mockVideo} />)
    })

    const favoriteButton = screen.getByRole("button")
    expect(favoriteButton).toBeTruthy()
  })

  it("should show filled heart when favorited", async () => {
    await act(async () => {
      render(<VideoCardList video={mockVideo} isFavorited={true} />)
    })

    const heart = screen.getByRole("button").querySelector("svg")
    expect(heart).toHaveClass("fill-red-500")
  })

  it("should toggle favorite when button clicked", async () => {
    const user = userEvent.setup()
    const onFavoriteToggle = vi.fn()
    await act(async () => {
      render(<VideoCardList video={mockVideo} isFavorited={false} onFavoriteToggle={onFavoriteToggle} />)
    })

    const favoriteButton = screen.getByRole("button")
    await user.click(favoriteButton)

    expect(onFavoriteToggle).toHaveBeenCalledWith("video-1", true)
  })

  it("should format duration as Unknown when null", async () => {
    const videoWithoutDuration = { ...mockVideo, duration_seconds: null }
    await act(async () => {
      render(<VideoCardList video={videoWithoutDuration} />)
    })

    // Duration badge should not render when duration is null
    expect(screen.queryByText("Unknown")).toBeNull()
  })

  it("should render link to video page", async () => {
    await act(async () => {
      render(<VideoCardList video={mockVideo} />)
    })

    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/video/video-1")
  })
})
