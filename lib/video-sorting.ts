/**
 * Shared video sorting and filtering utilities
 * Used by both video-library.tsx and video-management.tsx
 */

// Common interfaces that both components share
export interface VideoCategory {
  id: string
  name: string
  color: string
}

export interface VideoCurriculum {
  id: string
  name: string
  color: string
  display_order: number
}

export interface VideoPerformer {
  id: string
  name: string
}

// Base video interface with common properties for sorting
export interface SortableVideo {
  id: string
  title: string
  description: string | null
  created_at: string
  recorded: string | null
  views: number | null
  categories: VideoCategory[]
  curriculums: VideoCurriculum[]
  performers: VideoPerformer[]
}

// Extended interface for video-management which has last_viewed_at
export interface SortableVideoWithLastViewed extends SortableVideo {
  last_viewed_at: string | null
}

// Sort types supported by video-library
export type VideoLibrarySortBy = "title" | "created_at" | "recorded" | "performers" | "category" | "curriculum" | "views"

// Sort types supported by video-management (includes last_viewed)
export type VideoManagementSortBy = VideoLibrarySortBy | "last_viewed"

/**
 * Get the performers as a sortable string
 */
export function getPerformersSortValue(video: SortableVideo): string {
  return video.performers.map((p) => p.name).join(", ")
}

/**
 * Get the categories as a sortable string
 */
export function getCategoriesSortValue(video: SortableVideo): string {
  return video.categories.map((c) => c.name).join(", ")
}

/**
 * Get the minimum curriculum display order for sorting
 * Returns MAX_SAFE_INTEGER if no curriculums to sort empty to the end
 */
export function getCurriculumSortValue(video: SortableVideo): number {
  return video.curriculums.length > 0
    ? Math.min(...video.curriculums.map((c) => c.display_order))
    : Number.MAX_SAFE_INTEGER
}

/**
 * Compare two videos for sorting
 * Uses a lookup object pattern to reduce cognitive complexity
 */
export function compareVideos(
  a: SortableVideo,
  b: SortableVideo,
  sortBy: VideoLibrarySortBy,
  sortOrder: "asc" | "desc"
): number {
  const comparisons: Record<VideoLibrarySortBy, () => number> = {
    title: () => a.title.localeCompare(b.title),
    created_at: () => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    recorded: () => (a.recorded || "").localeCompare(b.recorded || ""),
    performers: () => getPerformersSortValue(a).localeCompare(getPerformersSortValue(b)),
    category: () => {
      const aCategories = getCategoriesSortValue(a)
      const bCategories = getCategoriesSortValue(b)
      // In ascending sort, push empty categories to the end
      if (sortOrder === "asc") {
        if (!aCategories && bCategories) return 1
        if (aCategories && !bCategories) return -1
      }
      return aCategories.localeCompare(bCategories)
    },
    curriculum: () => getCurriculumSortValue(a) - getCurriculumSortValue(b),
    views: () => (a.views || 0) - (b.views || 0),
  }

  // Fallback to title sort for unknown sortBy values
  const compareFn = comparisons[sortBy] || comparisons.title
  let comparison = compareFn()

  // Secondary sort by title if primary values are equal
  if (comparison === 0 && sortBy !== "title") {
    comparison = a.title.localeCompare(b.title)
  }

  return sortOrder === "asc" ? comparison : -comparison
}

/**
 * Compare two videos for sorting with last_viewed support
 * Extended version for video-management
 */
export function compareVideosWithLastViewed(
  a: SortableVideoWithLastViewed,
  b: SortableVideoWithLastViewed,
  sortBy: VideoManagementSortBy,
  sortOrder: "asc" | "desc"
): number {
  // Handle last_viewed separately since it's only in video-management
  if (sortBy === "last_viewed") {
    const aTime = a.last_viewed_at ? new Date(a.last_viewed_at).getTime() : 0
    const bTime = b.last_viewed_at ? new Date(b.last_viewed_at).getTime() : 0
    let comparison = aTime - bTime

    // Secondary sort by title if primary values are equal
    if (comparison === 0) {
      comparison = a.title.localeCompare(b.title)
    }

    return sortOrder === "asc" ? comparison : -comparison
  }

  // Delegate to the base compare function for all other sort types
  return compareVideos(a, b, sortBy as VideoLibrarySortBy, sortOrder)
}

/**
 * Check if video matches search query (title, description, or performer name)
 */
export function videoMatchesSearch(video: SortableVideo, searchQuery: string): boolean {
  const lowerQuery = searchQuery.toLowerCase()
  const titleMatch = video.title.toLowerCase().includes(lowerQuery)
  const descriptionMatch = video.description?.toLowerCase().includes(lowerQuery) || false
  const performerMatch = video.performers.some((performer) =>
    performer.name.toLowerCase().includes(lowerQuery)
  )
  return titleMatch || descriptionMatch || performerMatch
}

/**
 * Parse selected filters into categorized groups
 */
export function parseSelectedFilters(selectedCategories: string[]) {
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

/**
 * Check if items match based on filter mode (AND/OR)
 */
export function checkFilterMatch<T>(
  selectedItems: T[],
  videoItems: Set<T>,
  filterMode: "AND" | "OR"
): boolean {
  if (selectedItems.length === 0) return true
  return filterMode === "AND"
    ? selectedItems.every((item) => videoItems.has(item))
    : selectedItems.some((item) => videoItems.has(item))
}

/**
 * Check if video views meet the filter threshold
 */
export function checkViewsMatch(
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

/**
 * Check if video matches all active filters
 */
export function videoMatchesFilters(
  video: SortableVideo,
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
