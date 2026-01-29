import { describe, it, expect } from "vitest"

// We need to extract and export these helper functions from video-library.tsx
// For now, we'll test the logic by re-implementing the helper functions here
// Once the refactoring stabilizes, these can be moved to a shared utilities file

interface Category {
  id: string
  name: string
  color: string
  description: string | null
}

interface Curriculum {
  id: string
  name: string
  color: string
  display_order: number
  description: string | null
}

interface Performer {
  id: string
  name: string
}

interface Video {
  id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
  created_at: string
  recorded: string | null
  updated_at: string
  views: number
  categories: Category[]
  curriculums: Curriculum[]
  performers: Performer[]
}

// Helper function implementations (mirroring video-library.tsx)
function getVideoCategoriesForVideo(
  videoId: string,
  categoriesData: Array<{ video_id: string; categories: Category }> | null
): Category[] {
  if (!categoriesData) return []
  return categoriesData
    .filter((vc) => vc.video_id === videoId)
    .map((vc) => vc.categories)
}

function getVideoCurriculumsForVideo(
  videoId: string,
  curriculumsData: Array<{ video_id: string; curriculums: Curriculum }> | null
): Curriculum[] {
  if (!curriculumsData) return []
  return curriculumsData
    .filter((vc) => vc.video_id === videoId)
    .map((vc) => vc.curriculums)
}

function getVideoPerformersForVideo(
  videoId: string,
  performersData: Array<{ video_id: string; performers: Performer }> | null
): Performer[] {
  if (!performersData) return []
  return performersData
    .filter((vp) => vp.video_id === videoId)
    .map((vp) => vp.performers)
}

function videoMatchesSearch(video: Video, searchQuery: string): boolean {
  const lowerQuery = searchQuery.toLowerCase()
  const titleMatch = video.title.toLowerCase().includes(lowerQuery)
  const descriptionMatch = video.description?.toLowerCase().includes(lowerQuery) || false
  const performerMatch = video.performers.some((performer) =>
    performer.name.toLowerCase().includes(lowerQuery)
  )
  return titleMatch || descriptionMatch || performerMatch
}

function parseSelectedFilters(selectedCategories: string[]) {
  return {
    categoryIds: selectedCategories.filter(
      (id) => !id.startsWith("recorded:") && !id.startsWith("performer:") && !id.startsWith("views:")
    ),
    recordedValues: selectedCategories
      .filter((id) => id.startsWith("recorded:"))
      .map((id) => id.replace("recorded:", "")),
    performerIds: selectedCategories
      .filter((id) => id.startsWith("performer:"))
      .map((id) => id.replace("performer:", "")),
    viewsValues: selectedCategories
      .filter((id) => id.startsWith("views:"))
      .map((id) => id.replace("views:", "")),
  }
}

function checkFilterMatch<T>(
  selectedItems: T[],
  videoItems: Set<T>,
  filterMode: "AND" | "OR"
): boolean {
  if (selectedItems.length === 0) return true
  return filterMode === "AND"
    ? selectedItems.every((item) => videoItems.has(item))
    : selectedItems.some((item) => videoItems.has(item))
}

function checkViewsMatch(
  selectedViews: string[],
  videoViews: number,
  filterMode: "AND" | "OR"
): boolean {
  if (selectedViews.length === 0) return true
  const viewNumbers = selectedViews.map(Number)
  return filterMode === "AND"
    ? viewNumbers.every((v) => videoViews >= v)
    : viewNumbers.some((v) => videoViews >= v)
}

function videoMatchesFilters(
  video: Video,
  selectedCategories: string[],
  selectedCurriculums: string[],
  filterMode: "AND" | "OR"
): boolean {
  const videoCategories = new Set(video.categories.map((cat) => cat.id))
  const videoCurriculums = new Set(video.curriculums.map((curr) => curr.id))
  const videoPerformers = new Set(video.performers.map((perf) => perf.id))

  const parsed = parseSelectedFilters(selectedCategories)

  const categoryMatches = checkFilterMatch(parsed.categoryIds, videoCategories, filterMode)
  const curriculumMatches = checkFilterMatch(selectedCurriculums, videoCurriculums, filterMode)
  const performerMatches = checkFilterMatch(parsed.performerIds, videoPerformers, filterMode)
  const recordedMatches = parsed.recordedValues.length === 0 || parsed.recordedValues.includes(video.recorded || "")
  const viewsMatches = checkViewsMatch(parsed.viewsValues, video.views || 0, filterMode)

  const activeFilters = [
    parsed.categoryIds.length > 0 ? categoryMatches : null,
    selectedCurriculums.length > 0 ? curriculumMatches : null,
    parsed.recordedValues.length > 0 ? recordedMatches : null,
    parsed.performerIds.length > 0 ? performerMatches : null,
    parsed.viewsValues.length > 0 ? viewsMatches : null,
  ].filter((match) => match !== null) as boolean[]

  if (activeFilters.length === 0) return true
  return filterMode === "AND" ? activeFilters.every(Boolean) : activeFilters.some(Boolean)
}

type VideoSortBy = "title" | "created_at" | "recorded" | "performers" | "category" | "curriculum" | "views"

function compareVideos(a: Video, b: Video, sortBy: VideoSortBy, sortOrder: "asc" | "desc"): number {
  let comparison = 0

  switch (sortBy) {
    case "title":
      comparison = a.title.localeCompare(b.title)
      break
    case "created_at":
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      break
    case "recorded":
      comparison = (a.recorded || "").localeCompare(b.recorded || "")
      break
    case "performers": {
      const aPerformers = a.performers.map((p) => p.name).join(", ")
      const bPerformers = b.performers.map((p) => p.name).join(", ")
      comparison = aPerformers.localeCompare(bPerformers)
      break
    }
    case "category": {
      const aCategories = a.categories.map((c) => c.name).join(", ")
      const bCategories = b.categories.map((c) => c.name).join(", ")
      if (sortOrder === "asc") {
        if (!aCategories && bCategories) return 1
        if (aCategories && !bCategories) return -1
      }
      comparison = aCategories.localeCompare(bCategories)
      break
    }
    case "curriculum": {
      const aMinOrder = a.curriculums.length > 0
        ? Math.min(...a.curriculums.map((c) => c.display_order))
        : Number.MAX_SAFE_INTEGER
      const bMinOrder = b.curriculums.length > 0
        ? Math.min(...b.curriculums.map((c) => c.display_order))
        : Number.MAX_SAFE_INTEGER
      comparison = aMinOrder - bMinOrder
      break
    }
    case "views":
      comparison = (a.views || 0) - (b.views || 0)
      break
  }

  if (comparison === 0 && sortBy !== "title") {
    comparison = a.title.localeCompare(b.title)
  }

  return sortOrder === "asc" ? comparison : -comparison
}

// Test data
const mockCategory1: Category = { id: "cat-1", name: "Bo", color: "#ff0000", description: "Staff weapon" }
const mockCategory2: Category = { id: "cat-2", name: "Sai", color: "#00ff00", description: "Trident weapon" }
const mockCurriculum1: Curriculum = { id: "curr-1", name: "10.Kyu", color: "#ffffff", display_order: 1, description: "White belt" }
const mockCurriculum2: Curriculum = { id: "curr-2", name: "9.Kyu", color: "#ffff00", display_order: 2, description: "Yellow belt" }
const mockPerformer1: Performer = { id: "perf-1", name: "John Doe" }
const mockPerformer2: Performer = { id: "perf-2", name: "Jane Smith" }

const createMockVideo = (overrides: Partial<Video> = {}): Video => ({
  id: "video-1",
  title: "Test Video",
  description: "A test video description",
  video_url: "https://example.com/video.mp4",
  thumbnail_url: "https://example.com/thumb.jpg",
  duration_seconds: 300,
  created_at: "2024-01-01T00:00:00Z",
  recorded: "2024",
  updated_at: "2024-01-01T00:00:00Z",
  views: 10,
  categories: [],
  curriculums: [],
  performers: [],
  ...overrides,
})

describe("Video Library Helper Functions", () => {
  describe("getVideoCategoriesForVideo", () => {
    it("should return empty array when categoriesData is null", () => {
      expect(getVideoCategoriesForVideo("video-1", null)).toEqual([])
    })

    it("should return empty array when no categories match", () => {
      const categoriesData = [{ video_id: "video-2", categories: mockCategory1 }]
      expect(getVideoCategoriesForVideo("video-1", categoriesData)).toEqual([])
    })

    it("should return matching categories for video", () => {
      const categoriesData = [
        { video_id: "video-1", categories: mockCategory1 },
        { video_id: "video-1", categories: mockCategory2 },
        { video_id: "video-2", categories: mockCategory1 },
      ]
      expect(getVideoCategoriesForVideo("video-1", categoriesData)).toEqual([mockCategory1, mockCategory2])
    })
  })

  describe("getVideoCurriculumsForVideo", () => {
    it("should return empty array when curriculumsData is null", () => {
      expect(getVideoCurriculumsForVideo("video-1", null)).toEqual([])
    })

    it("should return matching curriculums for video", () => {
      const curriculumsData = [
        { video_id: "video-1", curriculums: mockCurriculum1 },
        { video_id: "video-2", curriculums: mockCurriculum2 },
      ]
      expect(getVideoCurriculumsForVideo("video-1", curriculumsData)).toEqual([mockCurriculum1])
    })
  })

  describe("getVideoPerformersForVideo", () => {
    it("should return empty array when performersData is null", () => {
      expect(getVideoPerformersForVideo("video-1", null)).toEqual([])
    })

    it("should return matching performers for video", () => {
      const performersData = [
        { video_id: "video-1", performers: mockPerformer1 },
        { video_id: "video-1", performers: mockPerformer2 },
      ]
      expect(getVideoPerformersForVideo("video-1", performersData)).toEqual([mockPerformer1, mockPerformer2])
    })
  })

  describe("videoMatchesSearch", () => {
    it("should match by title (case insensitive)", () => {
      const video = createMockVideo({ title: "Basic Bo Kata" })
      expect(videoMatchesSearch(video, "basic")).toBe(true)
      expect(videoMatchesSearch(video, "KATA")).toBe(true)
      expect(videoMatchesSearch(video, "sai")).toBe(false)
    })

    it("should match by description", () => {
      const video = createMockVideo({ description: "Advanced technique" })
      expect(videoMatchesSearch(video, "advanced")).toBe(true)
      expect(videoMatchesSearch(video, "beginner")).toBe(false)
    })

    it("should match by performer name", () => {
      const video = createMockVideo({ performers: [mockPerformer1] })
      expect(videoMatchesSearch(video, "john")).toBe(true)
      expect(videoMatchesSearch(video, "doe")).toBe(true)
      expect(videoMatchesSearch(video, "jane")).toBe(false)
    })

    it("should handle null description", () => {
      const video = createMockVideo({ description: null })
      expect(videoMatchesSearch(video, "test")).toBe(true) // matches title
      expect(videoMatchesSearch(video, "description")).toBe(false)
    })
  })

  describe("parseSelectedFilters", () => {
    it("should separate category IDs from prefixed values", () => {
      const filters = ["cat-1", "cat-2", "recorded:2024", "performer:perf-1", "views:100"]
      const parsed = parseSelectedFilters(filters)

      expect(parsed.categoryIds).toEqual(["cat-1", "cat-2"])
      expect(parsed.recordedValues).toEqual(["2024"])
      expect(parsed.performerIds).toEqual(["perf-1"])
      expect(parsed.viewsValues).toEqual(["100"])
    })

    it("should handle empty filters", () => {
      const parsed = parseSelectedFilters([])
      expect(parsed.categoryIds).toEqual([])
      expect(parsed.recordedValues).toEqual([])
      expect(parsed.performerIds).toEqual([])
      expect(parsed.viewsValues).toEqual([])
    })

    it("should handle multiple values of same type", () => {
      const filters = ["recorded:2023", "recorded:2024"]
      const parsed = parseSelectedFilters(filters)
      expect(parsed.recordedValues).toEqual(["2023", "2024"])
    })
  })

  describe("checkFilterMatch", () => {
    it("should return true when no items selected", () => {
      expect(checkFilterMatch([], new Set(["a", "b"]), "AND")).toBe(true)
      expect(checkFilterMatch([], new Set(["a", "b"]), "OR")).toBe(true)
    })

    it("should require all items in AND mode", () => {
      const videoItems = new Set(["a", "b", "c"])
      expect(checkFilterMatch(["a", "b"], videoItems, "AND")).toBe(true)
      expect(checkFilterMatch(["a", "d"], videoItems, "AND")).toBe(false)
    })

    it("should require any item in OR mode", () => {
      const videoItems = new Set(["a", "b"])
      expect(checkFilterMatch(["a", "d"], videoItems, "OR")).toBe(true)
      expect(checkFilterMatch(["c", "d"], videoItems, "OR")).toBe(false)
    })
  })

  describe("checkViewsMatch", () => {
    it("should return true when no views filter selected", () => {
      expect(checkViewsMatch([], 100, "AND")).toBe(true)
    })

    it("should check if video views meets threshold in AND mode", () => {
      expect(checkViewsMatch(["50", "100"], 150, "AND")).toBe(true)
      expect(checkViewsMatch(["50", "200"], 150, "AND")).toBe(false)
    })

    it("should check if video views meets any threshold in OR mode", () => {
      expect(checkViewsMatch(["50", "200"], 100, "OR")).toBe(true)
      expect(checkViewsMatch(["150", "200"], 100, "OR")).toBe(false)
    })
  })

  describe("videoMatchesFilters", () => {
    it("should return true when no filters selected", () => {
      const video = createMockVideo()
      expect(videoMatchesFilters(video, [], [], "AND")).toBe(true)
    })

    it("should filter by category in AND mode", () => {
      const video = createMockVideo({ categories: [mockCategory1] })
      expect(videoMatchesFilters(video, ["cat-1"], [], "AND")).toBe(true)
      expect(videoMatchesFilters(video, ["cat-1", "cat-2"], [], "AND")).toBe(false)
    })

    it("should filter by category in OR mode", () => {
      const video = createMockVideo({ categories: [mockCategory1] })
      expect(videoMatchesFilters(video, ["cat-1", "cat-2"], [], "OR")).toBe(true)
      expect(videoMatchesFilters(video, ["cat-2"], [], "OR")).toBe(false)
    })

    it("should filter by curriculum", () => {
      const video = createMockVideo({ curriculums: [mockCurriculum1] })
      expect(videoMatchesFilters(video, [], ["curr-1"], "AND")).toBe(true)
      expect(videoMatchesFilters(video, [], ["curr-2"], "AND")).toBe(false)
    })

    it("should filter by recorded year", () => {
      const video = createMockVideo({ recorded: "2024" })
      expect(videoMatchesFilters(video, ["recorded:2024"], [], "AND")).toBe(true)
      expect(videoMatchesFilters(video, ["recorded:2023"], [], "AND")).toBe(false)
    })

    it("should filter by performer", () => {
      const video = createMockVideo({ performers: [mockPerformer1] })
      expect(videoMatchesFilters(video, ["performer:perf-1"], [], "AND")).toBe(true)
      expect(videoMatchesFilters(video, ["performer:perf-2"], [], "AND")).toBe(false)
    })

    it("should filter by views", () => {
      const video = createMockVideo({ views: 50 })
      expect(videoMatchesFilters(video, ["views:25"], [], "AND")).toBe(true)
      expect(videoMatchesFilters(video, ["views:100"], [], "AND")).toBe(false)
    })

    it("should combine filters in AND mode", () => {
      const video = createMockVideo({
        categories: [mockCategory1],
        recorded: "2024",
        views: 50,
      })
      expect(videoMatchesFilters(video, ["cat-1", "recorded:2024"], [], "AND")).toBe(true)
      expect(videoMatchesFilters(video, ["cat-2", "recorded:2024"], [], "AND")).toBe(false)
    })

    it("should combine filters in OR mode", () => {
      const video = createMockVideo({
        categories: [mockCategory1],
        recorded: "2024",
      })
      expect(videoMatchesFilters(video, ["cat-2", "recorded:2024"], [], "OR")).toBe(true)
      expect(videoMatchesFilters(video, ["cat-2", "recorded:2023"], [], "OR")).toBe(false)
    })
  })

  describe("compareVideos", () => {
    const videoA = createMockVideo({
      id: "video-a",
      title: "Alpha Video",
      created_at: "2024-01-01T00:00:00Z",
      recorded: "2023",
      views: 10,
      categories: [mockCategory1],
      curriculums: [mockCurriculum1],
      performers: [mockPerformer1],
    })

    const videoB = createMockVideo({
      id: "video-b",
      title: "Beta Video",
      created_at: "2024-02-01T00:00:00Z",
      recorded: "2024",
      views: 20,
      categories: [mockCategory2],
      curriculums: [mockCurriculum2],
      performers: [mockPerformer2],
    })

    it("should sort by title ascending", () => {
      expect(compareVideos(videoA, videoB, "title", "asc")).toBeLessThan(0)
      expect(compareVideos(videoB, videoA, "title", "asc")).toBeGreaterThan(0)
    })

    it("should sort by title descending", () => {
      expect(compareVideos(videoA, videoB, "title", "desc")).toBeGreaterThan(0)
    })

    it("should sort by created_at", () => {
      expect(compareVideos(videoA, videoB, "created_at", "asc")).toBeLessThan(0)
      expect(compareVideos(videoA, videoB, "created_at", "desc")).toBeGreaterThan(0)
    })

    it("should sort by recorded year", () => {
      expect(compareVideos(videoA, videoB, "recorded", "asc")).toBeLessThan(0)
    })

    it("should sort by performers", () => {
      expect(compareVideos(videoA, videoB, "performers", "asc")).toBeGreaterThan(0) // videoA has "John Doe", videoB has "Jane Smith", Jane < John alphabetically
    })

    it("should sort by category", () => {
      expect(compareVideos(videoA, videoB, "category", "asc")).toBeLessThan(0) // Bo < Sai
    })

    it("should sort by curriculum display order", () => {
      expect(compareVideos(videoA, videoB, "curriculum", "asc")).toBeLessThan(0) // 1 < 2
    })

    it("should sort by views", () => {
      expect(compareVideos(videoA, videoB, "views", "asc")).toBeLessThan(0) // 10 < 20
      expect(compareVideos(videoA, videoB, "views", "desc")).toBeGreaterThan(0)
    })

    it("should use title as secondary sort when primary values are equal", () => {
      const videoSameDate = createMockVideo({
        id: "video-same",
        title: "Zeta Video",
        created_at: "2024-01-01T00:00:00Z",
      })
      // Same created_at but different titles
      expect(compareVideos(videoA, videoSameDate, "created_at", "asc")).toBeLessThan(0) // Alpha < Zeta
    })

    it("should handle videos with no categories in ascending sort", () => {
      const videoNoCategory = createMockVideo({ id: "no-cat", title: "No Cat", categories: [] })
      expect(compareVideos(videoNoCategory, videoA, "category", "asc")).toBeGreaterThan(0)
    })

    it("should handle videos with no curriculums", () => {
      const videoNoCurriculum = createMockVideo({ id: "no-curr", title: "No Curr", curriculums: [] })
      expect(compareVideos(videoNoCurriculum, videoA, "curriculum", "asc")).toBeGreaterThan(0)
    })
  })

  // Tests for new helper functions added during cognitive complexity refactoring
  describe("isCategoryTypeFilter", () => {
    // Re-implement the function locally to test the logic
    function isCategoryTypeFilter(filterId: string, categoryIds: Set<string>): boolean {
      return (
        categoryIds.has(filterId) ||
        filterId.startsWith("recorded:") ||
        filterId.startsWith("performer:") ||
        filterId.startsWith("views:")
      )
    }

    it("should return true for category IDs in the set", () => {
      const categoryIds = new Set(["cat-1", "cat-2"])
      expect(isCategoryTypeFilter("cat-1", categoryIds)).toBe(true)
      expect(isCategoryTypeFilter("cat-2", categoryIds)).toBe(true)
    })

    it("should return true for recorded: prefixed filters", () => {
      const categoryIds = new Set<string>()
      expect(isCategoryTypeFilter("recorded:2024", categoryIds)).toBe(true)
      expect(isCategoryTypeFilter("recorded:2023", categoryIds)).toBe(true)
    })

    it("should return true for performer: prefixed filters", () => {
      const categoryIds = new Set<string>()
      expect(isCategoryTypeFilter("performer:perf-1", categoryIds)).toBe(true)
    })

    it("should return true for views: prefixed filters", () => {
      const categoryIds = new Set<string>()
      expect(isCategoryTypeFilter("views:100", categoryIds)).toBe(true)
    })

    it("should return false for IDs not in category set and no prefix", () => {
      const categoryIds = new Set(["cat-1"])
      expect(isCategoryTypeFilter("curr-1", categoryIds)).toBe(false)
      expect(isCategoryTypeFilter("other-id", categoryIds)).toBe(false)
    })
  })

  describe("separateUrlFilters", () => {
    // Re-implement locally to test
    function isCategoryTypeFilter(filterId: string, categoryIds: Set<string>): boolean {
      return (
        categoryIds.has(filterId) ||
        filterId.startsWith("recorded:") ||
        filterId.startsWith("performer:") ||
        filterId.startsWith("views:")
      )
    }

    function separateUrlFilters(
      filters: string[],
      categoryIds: Set<string>,
      curriculumIds: Set<string>
    ): { categories: string[]; curriculums: string[] } {
      const categories: string[] = []
      const curriculums: string[] = []
      
      for (const filterId of filters) {
        if (isCategoryTypeFilter(filterId, categoryIds)) {
          categories.push(filterId)
        } else if (curriculumIds.has(filterId)) {
          curriculums.push(filterId)
        }
      }
      
      return { categories, curriculums }
    }

    it("should separate category filters from curriculum filters", () => {
      const categoryIds = new Set(["cat-1", "cat-2"])
      const curriculumIds = new Set(["curr-1", "curr-2"])
      const filters = ["cat-1", "curr-1", "cat-2", "curr-2"]
      
      const result = separateUrlFilters(filters, categoryIds, curriculumIds)
      
      expect(result.categories).toEqual(["cat-1", "cat-2"])
      expect(result.curriculums).toEqual(["curr-1", "curr-2"])
    })

    it("should handle prefixed filters as categories", () => {
      const categoryIds = new Set(["cat-1"])
      const curriculumIds = new Set(["curr-1"])
      const filters = ["cat-1", "recorded:2024", "performer:perf-1", "views:50", "curr-1"]
      
      const result = separateUrlFilters(filters, categoryIds, curriculumIds)
      
      expect(result.categories).toEqual(["cat-1", "recorded:2024", "performer:perf-1", "views:50"])
      expect(result.curriculums).toEqual(["curr-1"])
    })

    it("should return empty arrays when no filters provided", () => {
      const categoryIds = new Set(["cat-1"])
      const curriculumIds = new Set(["curr-1"])
      
      const result = separateUrlFilters([], categoryIds, curriculumIds)
      
      expect(result.categories).toEqual([])
      expect(result.curriculums).toEqual([])
    })

    it("should ignore filters that match neither category nor curriculum", () => {
      const categoryIds = new Set(["cat-1"])
      const curriculumIds = new Set(["curr-1"])
      const filters = ["cat-1", "unknown-id", "curr-1", "another-unknown"]
      
      const result = separateUrlFilters(filters, categoryIds, curriculumIds)
      
      expect(result.categories).toEqual(["cat-1"])
      expect(result.curriculums).toEqual(["curr-1"])
    })
  })
})
