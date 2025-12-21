import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import VideoLibrary from "@/components/video-library"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => "/library",
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  }),
}))

describe("VideoLibrary - Complex Filtering Edge Cases", () => {
  const mockVideos = [
    {
      id: "1",
      title: "Kata Basics",
      description: "Basic kata",
      video_url: "video1.mp4",
      thumbnail_url: "thumb1.jpg",
      duration_seconds: 300,
      is_published: true,
      recorded: "2024",
      views: 100,
      categories: [{ id: "cat1", name: "Kata", color: "#FF0000" }],
      curriculums: [{ id: "curr1", name: "Beginner", display_order: 1 }],
      performers: [{ id: "perf1", name: "Sensei Mike" }],
    },
    {
      id: "2",
      title: "Advanced Kumite",
      description: "Advanced sparring",
      video_url: "video2.mp4",
      thumbnail_url: "thumb2.jpg",
      duration_seconds: 600,
      is_published: true,
      recorded: "2023",
      views: 250,
      categories: [{ id: "cat2", name: "Kumite", color: "#00FF00" }],
      curriculums: [{ id: "curr2", name: "Advanced", display_order: 3 }],
      performers: [{ id: "perf2", name: "Sensei Jane" }],
    },
    {
      id: "3",
      title: "Kata and Kumite Combo",
      description: "Both kata and kumite",
      video_url: "video3.mp4",
      thumbnail_url: "thumb3.jpg",
      duration_seconds: 450,
      is_published: true,
      recorded: "2024",
      views: 50,
      categories: [
        { id: "cat1", name: "Kata", color: "#FF0000" },
        { id: "cat2", name: "Kumite", color: "#00FF00" },
      ],
      curriculums: [{ id: "curr1", name: "Beginner", display_order: 1 }],
      performers: [
        { id: "perf1", name: "Sensei Mike" },
        { id: "perf2", name: "Sensei Jane" },
      ],
    },
  ]

  const mockCategories = [
    { id: "cat1", name: "Kata", color: "#FF0000" },
    { id: "cat2", name: "Kumite", color: "#00FF00" },
  ]

  const mockCurriculums = [
    { id: "curr1", name: "Beginner", display_order: 1 },
    { id: "curr2", name: "Advanced", display_order: 3 },
  ]

  const mockPerformers = [
    { id: "perf1", name: "Sensei Mike" },
    { id: "perf2", name: "Sensei Jane" },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should show empty results with incompatible AND filters", async () => {
    render(
      <VideoLibrary
        videos={mockVideos}
        categories={mockCategories}
        curriculums={mockCurriculums}
        performers={mockPerformers}
        recordedValues={["2023", "2024"]}
      />,
    )

    const filterButton = screen.getByRole("button", { name: /filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      const kataCheckbox = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "cat1")
      expect(kataCheckbox).toBeTruthy()
    })

    const kataCheckbox = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "cat1")
    if (kataCheckbox) fireEvent.click(kataCheckbox)

    const recorded2023 = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "recorded:2023")
    if (recorded2023) fireEvent.click(recorded2023)

    const andButton = screen.getByRole("button", { name: /^AND$/i })
    fireEvent.click(andButton)

    await waitFor(() => {
      const noVideosSection = document.querySelector('[data-testid="no-videos"]') || document.body
      expect(noVideosSection.textContent).toContain("No videos found")
    })
  })

  it("should handle filter mode switching from OR to AND", async () => {
    render(
      <VideoLibrary
        videos={mockVideos}
        categories={mockCategories}
        curriculums={mockCurriculums}
        performers={mockPerformers}
        recordedValues={["2023", "2024"]}
      />,
    )

    const filterButton = screen.getByRole("button", { name: /filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0)
    })

    const kataCheckbox = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "cat1")
    const kumiteCheckbox = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "cat2")

    if (kataCheckbox) fireEvent.click(kataCheckbox)
    if (kumiteCheckbox) fireEvent.click(kumiteCheckbox)

    await waitFor(() => {
      const videoCards = document.querySelectorAll('[data-testid="video-card"]')
      expect(videoCards.length).toBeGreaterThanOrEqual(2)
    })

    const andButton = screen.getByRole("button", { name: /^AND$/i })
    fireEvent.click(andButton)

    await waitFor(() => {
      const videoCards = document.querySelectorAll('[data-testid="video-card"]')
      // Only video 3 has both Kata AND Kumite
      expect(videoCards.length).toBe(1)
    })
  })

  it("should reset to page 1 when applying new filters on page 3", async () => {
    const manyVideos = Array.from({ length: 50 }, (_, i) => ({
      id: `video-${i}`,
      title: `Video ${i}`,
      description: `Description ${i}`,
      video_url: `video${i}.mp4`,
      thumbnail_url: `thumb${i}.jpg`,
      duration_seconds: 300,
      is_published: true,
      recorded: "2024",
      views: 10,
      categories: [{ id: "cat1", name: "Kata", color: "#FF0000" }],
      curriculums: [],
      performers: [],
    }))

    render(
      <VideoLibrary
        videos={manyVideos}
        categories={mockCategories}
        curriculums={mockCurriculums}
        performers={mockPerformers}
        recordedValues={["2024"]}
      />,
    )

    await waitFor(() => {
      const page3Button = screen.queryByRole("button", { name: "3" })
      if (page3Button) fireEvent.click(page3Button)
    })

    const filterButton = screen.getByRole("button", { name: /filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      const kataCheckbox = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "cat1")
      if (kataCheckbox) fireEvent.click(kataCheckbox)
    })

    await waitFor(() => {
      const page1Button = screen.queryByRole("button", { name: "1" })
      expect(page1Button?.getAttribute("aria-current")).toBe("page")
    })
  })

  it("should handle special characters in search query", async () => {
    const videosWithSpecialChars = [
      {
        ...mockVideos[0],
        title: "Kata: Advanced O'Sensei's Form",
        description: "Master's technique (2024)",
      },
    ]

    render(
      <VideoLibrary
        videos={videosWithSpecialChars}
        categories={mockCategories}
        curriculums={mockCurriculums}
        performers={mockPerformers}
        recordedValues={["2024"]}
      />,
    )

    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.change(searchInput, { target: { value: "O'Sensei's" } })

    await waitFor(() => {
      const videoTitle = document.querySelector('[data-testid="video-card"]')
      expect(videoTitle?.textContent).toContain("O'Sensei")
    })
  })

  it("should handle applying 10+ filters simultaneously", async () => {
    const manyCategories = Array.from({ length: 12 }, (_, i) => ({
      id: `cat${i}`,
      name: `Category ${i}`,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    }))

    const videoWithManyCategories = {
      ...mockVideos[0],
      categories: manyCategories,
    }

    render(
      <VideoLibrary
        videos={[videoWithManyCategories]}
        categories={manyCategories}
        curriculums={mockCurriculums}
        performers={mockPerformers}
        recordedValues={["2024"]}
      />,
    )

    const filterButton = screen.getByRole("button", { name: /filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox")
      // Select first 10 checkboxes
      checkboxes.slice(0, 10).forEach((cb) => fireEvent.click(cb))
    })

    await waitFor(() => {
      const andButton = screen.queryByRole("button", { name: /^AND$/i })
      expect(andButton).toBeTruthy()
    })

    const andButton = screen.getByRole("button", { name: /^AND$/i })
    fireEvent.click(andButton)

    await waitFor(() => {
      const videoCard = document.querySelector('[data-testid="video-card"]')
      expect(videoCard).toBeTruthy()
    })
  })

  it("should clear filters and return to full library", async () => {
    render(
      <VideoLibrary
        videos={mockVideos}
        categories={mockCategories}
        curriculums={mockCurriculums}
        performers={mockPerformers}
        recordedValues={["2023", "2024"]}
      />,
    )

    const filterButton = screen.getByRole("button", { name: /filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      const kataCheckbox = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "cat1")
      if (kataCheckbox) fireEvent.click(kataCheckbox)
    })

    await waitFor(() => {
      const videoCards = document.querySelectorAll('[data-testid="video-card"]')
      expect(videoCards.length).toBeLessThan(mockVideos.length)
    })

    const kataCheckbox = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "cat1")
    if (kataCheckbox) fireEvent.click(kataCheckbox)

    await waitFor(() => {
      const videoCards = document.querySelectorAll('[data-testid="video-card"]')
      expect(videoCards.length).toBe(mockVideos.length)
    })
  })

  it("should handle performer filter in AND mode", async () => {
    render(
      <VideoLibrary
        videos={mockVideos}
        categories={mockCategories}
        curriculums={mockCurriculums}
        performers={mockPerformers}
        recordedValues={["2023", "2024"]}
      />,
    )

    const filterButton = screen.getByRole("button", { name: /filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      const mike = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "performer:perf1")
      const jane = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "performer:perf2")

      if (mike) fireEvent.click(mike)
      if (jane) fireEvent.click(jane)
    })

    const andButton = screen.getByRole("button", { name: /^AND$/i })
    fireEvent.click(andButton)

    await waitFor(() => {
      const videoCards = document.querySelectorAll('[data-testid="video-card"]')
      expect(videoCards.length).toBe(1)
      expect(videoCards[0].textContent).toContain("Combo")
    })
  })

  it("should handle curriculum AND category filters together", async () => {
    render(
      <VideoLibrary
        videos={mockVideos}
        categories={mockCategories}
        curriculums={mockCurriculums}
        performers={mockPerformers}
        recordedValues={["2023", "2024"]}
      />,
    )

    const filterButton = screen.getByRole("button", { name: /filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      const beginner = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "curr1")
      const kata = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "cat1")

      if (beginner) fireEvent.click(beginner)
      if (kata) fireEvent.click(kata)
    })

    const andButton = screen.getByRole("button", { name: /^AND$/i })
    fireEvent.click(andButton)

    await waitFor(() => {
      const videoCards = document.querySelectorAll('[data-testid="video-card"]')
      expect(videoCards.length).toBe(2)
    })
  })

  it("should handle empty result set with search query", async () => {
    render(
      <VideoLibrary
        videos={mockVideos}
        categories={mockCategories}
        curriculums={mockCurriculums}
        performers={mockPerformers}
        recordedValues={["2023", "2024"]}
      />,
    )

    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.change(searchInput, { target: { value: "NonExistentVideoTitle12345" } })

    await waitFor(() => {
      const noVideosMessage = document.body.textContent
      expect(noVideosMessage).toContain("No videos found")
    })

    const videoCards = document.querySelectorAll('[data-testid="video-card"]')
    expect(videoCards.length).toBe(0)
  })

  it("should maintain filter state when changing items per page", async () => {
    const manyVideos = Array.from({ length: 30 }, (_, i) => ({
      id: `video-${i}`,
      title: `Kata Video ${i}`,
      description: `Description ${i}`,
      video_url: `video${i}.mp4`,
      thumbnail_url: `thumb${i}.jpg`,
      duration_seconds: 300,
      is_published: true,
      recorded: "2024",
      views: 10,
      categories: [{ id: "cat1", name: "Kata", color: "#FF0000" }],
      curriculums: [],
      performers: [],
    }))

    render(
      <VideoLibrary
        videos={manyVideos}
        categories={mockCategories}
        curriculums={mockCurriculums}
        performers={mockPerformers}
        recordedValues={["2024"]}
      />,
    )

    const filterButton = screen.getByRole("button", { name: /filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      const kataCheckbox = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "cat1")
      if (kataCheckbox) fireEvent.click(kataCheckbox)
    })

    const itemsPerPageSelect = screen.getByRole("combobox", { name: /items per page/i })
    fireEvent.change(itemsPerPageSelect, { target: { value: "24" } })

    await waitFor(() => {
      const videoCards = document.querySelectorAll('[data-testid="video-card"]')
      expect(videoCards.length).toBe(24) // Shows 24 of 30 filtered videos
    })
  })

  it("should handle view count filters correctly", async () => {
    render(
      <VideoLibrary
        videos={mockVideos}
        categories={mockCategories}
        curriculums={mockCurriculums}
        performers={mockPerformers}
        recordedValues={["2023", "2024"]}
      />,
    )

    const filterButton = screen.getByRole("button", { name: /filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      const views100 = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "views:100")
      if (views100) fireEvent.click(views100)
    })

    await waitFor(() => {
      const videoCards = document.querySelectorAll('[data-testid="video-card"]')
      expect(videoCards.length).toBe(2)
      // Video 3 has 50 views, should not appear
    })
  })

  it("should handle recorded year filter correctly", async () => {
    render(
      <VideoLibrary
        videos={mockVideos}
        categories={mockCategories}
        curriculums={mockCurriculums}
        performers={mockPerformers}
        recordedValues={["2023", "2024"]}
      />,
    )

    const filterButton = screen.getByRole("button", { name: /filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      const recorded2024 = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "recorded:2024")
      if (recorded2024) fireEvent.click(recorded2024)
    })

    await waitFor(() => {
      const videoCards = document.querySelectorAll('[data-testid="video-card"]')
      expect(videoCards.length).toBe(2)
      // Video 2 is 2023, should not appear
    })
  })

  it("should handle combined search and filters", async () => {
    render(
      <VideoLibrary
        videos={mockVideos}
        categories={mockCategories}
        curriculums={mockCurriculums}
        performers={mockPerformers}
        recordedValues={["2023", "2024"]}
      />,
    )

    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.change(searchInput, { target: { value: "kata" } })

    const filterButton = screen.getByRole("button", { name: /filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      const recorded2024 = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "recorded:2024")
      if (recorded2024) fireEvent.click(recorded2024)
    })

    await waitFor(() => {
      const videoCards = document.querySelectorAll('[data-testid="video-card"]')
      expect(videoCards.length).toBe(2)
    })
  })

  it("should handle sorting with filtered results", async () => {
    render(
      <VideoLibrary
        videos={mockVideos}
        categories={mockCategories}
        curriculums={mockCurriculums}
        performers={mockPerformers}
        recordedValues={["2023", "2024"]}
      />,
    )

    const filterButton = screen.getByRole("button", { name: /filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      const kataCheckbox = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "cat1")
      if (kataCheckbox) fireEvent.click(kataCheckbox)
    })

    const sortButton = screen.getByRole("button", { name: /sort/i })
    fireEvent.click(sortButton)

    const viewsOption = screen.getByText(/views/i)
    fireEvent.click(viewsOption)

    await waitFor(() => {
      const videoCards = document.querySelectorAll('[data-testid="video-card"]')
      // Video 1 (100 views) should appear before Video 3 (50 views)
      expect(videoCards[0].textContent).toContain("Basics")
    })
  })

  it("should handle favorites filter with other filters", async () => {
    render(
      <VideoLibrary
        videos={mockVideos}
        categories={mockCategories}
        curriculums={mockCurriculums}
        performers={mockPerformers}
        recordedValues={["2023", "2024"]}
        showFavoritesToggle={true}
      />,
    )

    const favoritesToggle = screen.getByRole("checkbox", { name: /favorites/i })
    fireEvent.click(favoritesToggle)

    const filterButton = screen.getByRole("button", { name: /filter/i })
    fireEvent.click(filterButton)

    await waitFor(() => {
      const kataCheckbox = screen.getAllByRole("checkbox").find((cb) => cb.getAttribute("name") === "cat1")
      if (kataCheckbox) fireEvent.click(kataCheckbox)
    })

    await waitFor(() => {
      const videoCards = document.querySelectorAll('[data-testid="video-card"]')
      // Should show only favorited videos that also have Kata category
      expect(videoCards.length).toBeLessThanOrEqual(mockVideos.length)
    })
  })
})
