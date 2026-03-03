"use client"

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useFilteredVideos } from "@/hooks/use-filtered-videos"
import type { SortableVideo } from "@/lib/video-sorting"

// Mock the video-sorting module
vi.mock("@/lib/video-sorting", () => ({
  videoMatchesSearch: vi.fn((video: SortableVideo, query: string) => {
    const searchLower = query.toLowerCase()
    return (
      video.title.toLowerCase().includes(searchLower) ||
      (video.description?.toLowerCase().includes(searchLower) ?? false)
    )
  }),
  videoMatchesFilters: vi.fn(
    (video: SortableVideo, categories: string[], curriculums: string[], mode: "AND" | "OR") => {
      const categoryMatch =
        categories.length === 0 || categories.some((cat) => video.categories?.some((c) => c.id === cat))
      const curriculumMatch =
        curriculums.length === 0 || curriculums.some((curr) => video.curriculums?.some((c) => c.id === curr))

      if (mode === "AND") {
        return categoryMatch && curriculumMatch
      }
      return categoryMatch || curriculumMatch
    }
  ),
  compareVideos: vi.fn((a: SortableVideo, b: SortableVideo, sortBy: string, sortOrder: "asc" | "desc") => {
    let comparison = 0
    if (sortBy === "title") {
      comparison = a.title.localeCompare(b.title)
    } else if (sortBy === "created_at") {
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    return sortOrder === "desc" ? -comparison : comparison
  }),
}))

// Sample test videos
const createTestVideo = (overrides: Partial<SortableVideo> = {}): SortableVideo => ({
  id: `video-${Math.random().toString(36).slice(2)}`,
  title: "Test Video",
  description: "Test description",
  youtube_id: "abc123",
  created_at: new Date().toISOString(),
  categories: [],
  curriculums: [],
  performers: [],
  ...overrides,
})

describe("useFilteredVideos", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("basic filtering", () => {
    it("returns all videos when no filters are active", () => {
      const videos = [
        createTestVideo({ id: "1", title: "Video 1" }),
        createTestVideo({ id: "2", title: "Video 2" }),
        createTestVideo({ id: "3", title: "Video 3" }),
      ]

      const { result } = renderHook(() =>
        useFilteredVideos({
          videos,
          searchQuery: "",
          selectedCategories: [],
          selectedCurriculums: [],
          filterMode: "AND",
          sortBy: "title",
          sortOrder: "asc",
          currentPage: 1,
          itemsPerPage: 10,
        })
      )

      expect(result.current.filteredVideos).toHaveLength(3)
      expect(result.current.totalCount).toBe(3)
      expect(result.current.hasActiveFilters).toBe(false)
    })

    it("filters by search query", () => {
      const videos = [
        createTestVideo({ id: "1", title: "Guard Pass Tutorial" }),
        createTestVideo({ id: "2", title: "Armbar Basics" }),
        createTestVideo({ id: "3", title: "Guard Recovery" }),
      ]

      const { result } = renderHook(() =>
        useFilteredVideos({
          videos,
          searchQuery: "Guard",
          selectedCategories: [],
          selectedCurriculums: [],
          filterMode: "AND",
          sortBy: "title",
          sortOrder: "asc",
          currentPage: 1,
          itemsPerPage: 10,
        })
      )

      expect(result.current.filteredVideos).toHaveLength(2)
      expect(result.current.hasActiveFilters).toBe(true)
    })

    it("filters by categories", () => {
      const videos = [
        createTestVideo({ id: "1", title: "Video 1", categories: [{ id: "cat-1", name: "Guard" }] }),
        createTestVideo({ id: "2", title: "Video 2", categories: [{ id: "cat-2", name: "Mount" }] }),
      ]

      const { result } = renderHook(() =>
        useFilteredVideos({
          videos,
          searchQuery: "",
          selectedCategories: ["cat-1"],
          selectedCurriculums: [],
          filterMode: "AND",
          sortBy: "title",
          sortOrder: "asc",
          currentPage: 1,
          itemsPerPage: 10,
        })
      )

      expect(result.current.filteredVideos).toHaveLength(1)
      expect(result.current.filteredVideos[0].id).toBe("1")
      expect(result.current.hasActiveFilters).toBe(true)
    })

    it("filters by curriculums", () => {
      const videos = [
        createTestVideo({ id: "1", title: "Video 1", curriculums: [{ id: "curr-1", name: "White Belt" }] }),
        createTestVideo({ id: "2", title: "Video 2", curriculums: [{ id: "curr-2", name: "Blue Belt" }] }),
      ]

      const { result } = renderHook(() =>
        useFilteredVideos({
          videos,
          searchQuery: "",
          selectedCategories: [],
          selectedCurriculums: ["curr-1"],
          filterMode: "AND",
          sortBy: "title",
          sortOrder: "asc",
          currentPage: 1,
          itemsPerPage: 10,
        })
      )

      expect(result.current.filteredVideos).toHaveLength(1)
      expect(result.current.filteredVideos[0].id).toBe("1")
    })
  })

  describe("favorites filtering", () => {
    it("filters to favorites only when favoritesOnly is true", () => {
      const videos = [
        createTestVideo({ id: "1", title: "Favorited Video" }),
        createTestVideo({ id: "2", title: "Not Favorited" }),
        createTestVideo({ id: "3", title: "Also Favorited" }),
      ]

      const userFavorites = new Set(["1", "3"])

      const { result } = renderHook(() =>
        useFilteredVideos({
          videos,
          searchQuery: "",
          selectedCategories: [],
          selectedCurriculums: [],
          filterMode: "AND",
          sortBy: "title",
          sortOrder: "asc",
          userFavorites,
          favoritesOnly: true,
          currentPage: 1,
          itemsPerPage: 10,
        })
      )

      expect(result.current.filteredVideos).toHaveLength(2)
      expect(result.current.filteredVideos.map((v) => v.id)).toContain("1")
      expect(result.current.filteredVideos.map((v) => v.id)).toContain("3")
    })

    it("shows all videos when favoritesOnly is false", () => {
      const videos = [
        createTestVideo({ id: "1", title: "Video 1" }),
        createTestVideo({ id: "2", title: "Video 2" }),
      ]

      const userFavorites = new Set(["1"])

      const { result } = renderHook(() =>
        useFilteredVideos({
          videos,
          searchQuery: "",
          selectedCategories: [],
          selectedCurriculums: [],
          filterMode: "AND",
          sortBy: "title",
          sortOrder: "asc",
          userFavorites,
          favoritesOnly: false,
          currentPage: 1,
          itemsPerPage: 10,
        })
      )

      expect(result.current.filteredVideos).toHaveLength(2)
    })
  })

  describe("pagination", () => {
    it("calculates correct total pages", () => {
      const videos = Array.from({ length: 25 }, (_, i) =>
        createTestVideo({ id: String(i), title: `Video ${i}` })
      )

      const { result } = renderHook(() =>
        useFilteredVideos({
          videos,
          searchQuery: "",
          selectedCategories: [],
          selectedCurriculums: [],
          filterMode: "AND",
          sortBy: "title",
          sortOrder: "asc",
          currentPage: 1,
          itemsPerPage: 10,
        })
      )

      expect(result.current.totalPages).toBe(3)
      expect(result.current.totalCount).toBe(25)
    })

    it("returns correct page of results", () => {
      const videos = Array.from({ length: 25 }, (_, i) =>
        createTestVideo({ id: String(i), title: `Video ${String(i).padStart(2, "0")}` })
      )

      const { result } = renderHook(() =>
        useFilteredVideos({
          videos,
          searchQuery: "",
          selectedCategories: [],
          selectedCurriculums: [],
          filterMode: "AND",
          sortBy: "title",
          sortOrder: "asc",
          currentPage: 2,
          itemsPerPage: 10,
        })
      )

      expect(result.current.paginatedVideos).toHaveLength(10)
    })

    it("handles last page with fewer items", () => {
      const videos = Array.from({ length: 25 }, (_, i) =>
        createTestVideo({ id: String(i), title: `Video ${i}` })
      )

      const { result } = renderHook(() =>
        useFilteredVideos({
          videos,
          searchQuery: "",
          selectedCategories: [],
          selectedCurriculums: [],
          filterMode: "AND",
          sortBy: "title",
          sortOrder: "asc",
          currentPage: 3,
          itemsPerPage: 10,
        })
      )

      expect(result.current.paginatedVideos).toHaveLength(5)
    })

    it("bounds page to valid range", () => {
      const videos = Array.from({ length: 5 }, (_, i) =>
        createTestVideo({ id: String(i), title: `Video ${i}` })
      )

      const { result } = renderHook(() =>
        useFilteredVideos({
          videos,
          searchQuery: "",
          selectedCategories: [],
          selectedCurriculums: [],
          filterMode: "AND",
          sortBy: "title",
          sortOrder: "asc",
          currentPage: 100, // Way beyond valid pages
          itemsPerPage: 10,
        })
      )

      // Should return results from page 1 (bounded)
      expect(result.current.paginatedVideos).toHaveLength(5)
    })
  })

  describe("sorting", () => {
    it("sorts by title ascending", () => {
      const videos = [
        createTestVideo({ id: "1", title: "Zebra Video" }),
        createTestVideo({ id: "2", title: "Alpha Video" }),
        createTestVideo({ id: "3", title: "Beta Video" }),
      ]

      const { result } = renderHook(() =>
        useFilteredVideos({
          videos,
          searchQuery: "",
          selectedCategories: [],
          selectedCurriculums: [],
          filterMode: "AND",
          sortBy: "title",
          sortOrder: "asc",
          currentPage: 1,
          itemsPerPage: 10,
        })
      )

      expect(result.current.filteredVideos[0].title).toBe("Alpha Video")
      expect(result.current.filteredVideos[2].title).toBe("Zebra Video")
    })

    it("sorts by title descending", () => {
      const videos = [
        createTestVideo({ id: "1", title: "Alpha Video" }),
        createTestVideo({ id: "2", title: "Zebra Video" }),
        createTestVideo({ id: "3", title: "Beta Video" }),
      ]

      const { result } = renderHook(() =>
        useFilteredVideos({
          videos,
          searchQuery: "",
          selectedCategories: [],
          selectedCurriculums: [],
          filterMode: "AND",
          sortBy: "title",
          sortOrder: "desc",
          currentPage: 1,
          itemsPerPage: 10,
        })
      )

      expect(result.current.filteredVideos[0].title).toBe("Zebra Video")
      expect(result.current.filteredVideos[2].title).toBe("Alpha Video")
    })
  })

  describe("combined filters", () => {
    it("applies search and category filters together", () => {
      const videos = [
        createTestVideo({
          id: "1",
          title: "Guard Pass",
          categories: [{ id: "cat-1", name: "Guard" }],
        }),
        createTestVideo({
          id: "2",
          title: "Guard Recovery",
          categories: [{ id: "cat-2", name: "Other" }],
        }),
        createTestVideo({
          id: "3",
          title: "Mount Escape",
          categories: [{ id: "cat-1", name: "Guard" }],
        }),
      ]

      const { result } = renderHook(() =>
        useFilteredVideos({
          videos,
          searchQuery: "Guard",
          selectedCategories: ["cat-1"],
          selectedCurriculums: [],
          filterMode: "AND",
          sortBy: "title",
          sortOrder: "asc",
          currentPage: 1,
          itemsPerPage: 10,
        })
      )

      // Should match "Guard Pass" (has search term AND category)
      expect(result.current.filteredVideos).toHaveLength(1)
      expect(result.current.filteredVideos[0].id).toBe("1")
    })
  })
})
