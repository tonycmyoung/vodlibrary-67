"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { FilterMode } from "@/types/video"

export interface VideoLibraryUrlState {
  filters: string[]
  search: string
  mode: FilterMode
  page: number
}

export interface UseVideoLibraryUrlReturn {
  /** Current URL state */
  urlState: VideoLibraryUrlState
  /** Update filters in URL (replaces all filters) */
  setFilters: (filters: string[]) => void
  /** Update search query in URL */
  setSearch: (search: string) => void
  /** Update filter mode in URL */
  setMode: (mode: FilterMode) => void
  /** Update page number in URL */
  setPage: (page: number) => void
  /** Update multiple URL parameters at once */
  updateUrl: (updates: Partial<VideoLibraryUrlState>) => void
  /** Build URL string from state (for external use) */
  buildUrlString: (state: Partial<VideoLibraryUrlState>) => string
}

/**
 * Custom hook for managing VideoLibrary URL state
 * Centralizes URL parsing, reconstruction, and updates
 */
export function useVideoLibraryUrl(): UseVideoLibraryUrlReturn {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Parse initial URL state once
  const initialState = useMemo((): VideoLibraryUrlState => {
    const filtersParam = searchParams.get("filters")
    const search = searchParams.get("search") || ""
    const mode = (searchParams.get("mode") as FilterMode) || "AND"
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10))

    let filters: string[] = []
    if (filtersParam) {
      try {
        // searchParams.get() already decodes URL parameters, so just parse JSON directly
        filters = JSON.parse(filtersParam)
      } catch (e) {
        console.error("Error parsing URL filters:", e)
      }
    }

    return { filters, search, mode, page }
  }, [searchParams])

  // Track current state (allows for optimistic updates)
  const [currentState, setCurrentState] = useState<VideoLibraryUrlState>(initialState)

  /**
   * Build URL string from state
   */
  const buildUrlString = useCallback((state: Partial<VideoLibraryUrlState>): string => {
    const mergedState = { ...currentState, ...state }
    const params = new URLSearchParams()

    if (mergedState.filters.length > 0) {
      // URLSearchParams.set() already URL-encodes, so don't double-encode
      params.set("filters", JSON.stringify(mergedState.filters))
    }

    if (mergedState.search.trim()) {
      params.set("search", mergedState.search)
    }

    if (mergedState.mode !== "AND") {
      params.set("mode", mergedState.mode)
    }

    if (mergedState.page > 1) {
      params.set("page", mergedState.page.toString())
    }

    return params.toString() ? `?${params.toString()}` : ""
  }, [currentState])

  /**
   * Update URL with new state
   */
  const updateUrl = useCallback((updates: Partial<VideoLibraryUrlState>) => {
    const newState = { ...currentState, ...updates }
    setCurrentState(newState)

    const newSearch = buildUrlString(updates)
    const currentSearch = typeof window !== "undefined" ? window.location.search : ""

    // Only update if URL actually changed
    if (currentSearch !== newSearch) {
      const pathname = typeof window !== "undefined" ? window.location.pathname : "/"
      const newURL = newSearch ? `${pathname}${newSearch}` : pathname
      router.replace(newURL, { scroll: false })
    }
  }, [currentState, buildUrlString, router])

  /**
   * Set filters (replaces all existing filters)
   */
  const setFilters = useCallback((filters: string[]) => {
    updateUrl({ filters, page: 1 }) // Reset to page 1 when filters change
  }, [updateUrl])

  /**
   * Set search query
   */
  const setSearch = useCallback((search: string) => {
    updateUrl({ search, page: 1 }) // Reset to page 1 when search changes
  }, [updateUrl])

  /**
   * Set filter mode
   */
  const setMode = useCallback((mode: FilterMode) => {
    updateUrl({ mode, page: 1 }) // Reset to page 1 when mode changes
  }, [updateUrl])

  /**
   * Set page number
   */
  const setPage = useCallback((page: number) => {
    updateUrl({ page })
  }, [updateUrl])

  return {
    urlState: currentState,
    setFilters,
    setSearch,
    setMode,
    setPage,
    updateUrl,
    buildUrlString,
  }
}
