"use client"

import { useMemo } from "react"
import {
  compareVideos,
  videoMatchesSearch,
  videoMatchesFilters,
  type SortableVideo,
  type VideoLibrarySortBy,
} from "@/lib/video-sorting"
import type { FilterMode } from "@/types/video"

export interface UseFilteredVideosOptions {
  /** All videos to filter */
  videos: SortableVideo[]
  /** Search query for text filtering */
  searchQuery: string
  /** Selected category filter IDs (includes prefixed filters like "recorded:", "performer:", "views:") */
  selectedCategories: string[]
  /** Selected curriculum filter IDs */
  selectedCurriculums: string[]
  /** Filter mode: AND (all filters must match) or OR (any filter matches) */
  filterMode: FilterMode
  /** Sort field */
  sortBy: VideoLibrarySortBy
  /** Sort direction */
  sortOrder: "asc" | "desc"
  /** Set of favorited video IDs (optional - for favorites-only filtering) */
  userFavorites?: Set<string>
  /** Whether to show only favorited videos */
  favoritesOnly?: boolean
  /** Current page number (1-indexed) */
  currentPage: number
  /** Number of items per page */
  itemsPerPage: number
}

export interface UseFilteredVideosReturn {
  /** Filtered and sorted videos (all matching results) */
  filteredVideos: SortableVideo[]
  /** Paginated subset of filtered videos for current page */
  paginatedVideos: SortableVideo[]
  /** Total number of pages based on filtered results and items per page */
  totalPages: number
  /** Total count of filtered videos */
  totalCount: number
  /** Whether any filters are currently active */
  hasActiveFilters: boolean
}

/**
 * Hook for filtering, sorting, and paginating videos
 * Consolidates all video processing logic into a single reusable hook
 */
export function useFilteredVideos({
  videos,
  searchQuery,
  selectedCategories,
  selectedCurriculums,
  filterMode,
  sortBy,
  sortOrder,
  userFavorites,
  favoritesOnly = false,
  currentPage,
  itemsPerPage,
}: UseFilteredVideosOptions): UseFilteredVideosReturn {
  // Filter and sort videos
  const filteredVideos = useMemo(() => {
    let result = [...videos]

    // Filter by favorites first if favoritesOnly is true
    if (favoritesOnly && userFavorites) {
      result = result.filter((video) => userFavorites.has(video.id))
    }

    // Apply search filter
    if (searchQuery.trim()) {
      result = result.filter((video) => videoMatchesSearch(video, searchQuery))
    }

    // Apply category and curriculum filters
    if (selectedCategories.length > 0 || selectedCurriculums.length > 0) {
      result = result.filter((video) =>
        videoMatchesFilters(video, selectedCategories, selectedCurriculums, filterMode)
      )
    }

    // Sort the results
    result.sort((a, b) => compareVideos(a, b, sortBy, sortOrder))

    return result
  }, [
    videos,
    searchQuery,
    selectedCategories,
    selectedCurriculums,
    filterMode,
    sortBy,
    sortOrder,
    favoritesOnly,
    userFavorites,
  ])

  // Calculate pagination
  const totalCount = filteredVideos.length
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1))

  // Get paginated results
  const paginatedVideos = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredVideos.slice(startIndex, endIndex)
  }, [filteredVideos, validCurrentPage, itemsPerPage])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim().length > 0 ||
      selectedCategories.length > 0 ||
      selectedCurriculums.length > 0
  }, [searchQuery, selectedCategories, selectedCurriculums])

  return {
    filteredVideos,
    paginatedVideos,
    totalPages,
    totalCount,
    hasActiveFilters,
  }
}
