"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
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
  /** Update multiple URL parameters at once (debounced by default) */
  updateUrl: (updates: Partial<VideoLibraryUrlState>) => void
  /** Update URL immediately without debouncing */
  updateUrlImmediate: (updates: Partial<VideoLibraryUrlState>) => void
  /** Commit any pending URL updates immediately */
  commitUrl: () => void
  /** Build URL string from state (for external use) */
  buildUrlString: (state: Partial<VideoLibraryUrlState>) => string
}

/** Debounce delay for URL updates (ms) */
const URL_UPDATE_DEBOUNCE = 500

/**
 * Parse URL search params into VideoLibraryUrlState
 * Extracted for reuse in both initial parse and browser navigation sync
 */
function parseUrlState(searchParams: URLSearchParams): VideoLibraryUrlState {
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
}

/**
 * Custom hook for managing VideoLibrary URL state
 * Centralizes URL parsing, reconstruction, and updates
 * Uses shallow routing (window.history) for performance - no Next.js navigation re-renders
 */
export function useVideoLibraryUrl(): UseVideoLibraryUrlReturn {
  const searchParams = useSearchParams()

  // Parse initial URL state once
  const initialState = useMemo(
    (): VideoLibraryUrlState => parseUrlState(searchParams),
    [searchParams]
  )

  // Track current state (allows for optimistic updates)
  const [currentState, setCurrentState] = useState<VideoLibraryUrlState>(initialState)

  // Refs for debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingUpdatesRef = useRef<Partial<VideoLibraryUrlState> | null>(null)

  // Sync state when URL changes externally (browser back/forward navigation)
  useEffect(() => {
    const newState = parseUrlState(searchParams)
    // Only update if the URL actually changed (compare stringified to handle array comparison)
    if (JSON.stringify(newState) !== JSON.stringify(currentState)) {
      setCurrentState(newState)
    }
  }, [searchParams]) // Note: intentionally not including currentState to avoid loops

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

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
   * Apply URL update to browser using shallow routing (internal helper)
   * Uses window.history.replaceState for better performance - avoids Next.js router
   * re-renders and provides a lighter-weight URL update
   */
  const applyUrlUpdate = useCallback((newState: VideoLibraryUrlState) => {
    if (typeof window === "undefined") return

    const newSearch = buildUrlString(newState)
    const currentSearch = window.location.search

    // Only update if URL actually changed
    if (currentSearch !== newSearch) {
      const pathname = window.location.pathname
      const newURL = newSearch ? `${pathname}${newSearch}` : pathname
      // Use shallow routing via history API - doesn't trigger Next.js navigation
      window.history.replaceState(
        { ...window.history.state, as: newURL, url: newURL },
        "",
        newURL
      )
    }
  }, [buildUrlString])

  /**
   * Update URL immediately without debouncing
   * Use for explicit user actions like clicking "Apply" or pagination
   */
  const updateUrlImmediate = useCallback((updates: Partial<VideoLibraryUrlState>) => {
    // Clear any pending debounced updates
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    pendingUpdatesRef.current = null

    const newState = { ...currentState, ...updates }
    setCurrentState(newState)
    applyUrlUpdate(newState)
  }, [currentState, applyUrlUpdate])

  /**
   * Commit any pending URL updates immediately
   * Call this when user explicitly wants to apply filters (e.g., mobile "Apply" button)
   */
  const commitUrl = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    if (pendingUpdatesRef.current) {
      const newState = { ...currentState, ...pendingUpdatesRef.current }
      pendingUpdatesRef.current = null
      applyUrlUpdate(newState)
    }
  }, [currentState, applyUrlUpdate])

  /**
   * Update URL with new state (debounced for filter changes)
   * State updates immediately for UI responsiveness, URL updates after delay
   */
  const updateUrl = useCallback((updates: Partial<VideoLibraryUrlState>) => {
    const newState = { ...currentState, ...updates }
    setCurrentState(newState)

    // Accumulate updates for debouncing
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new debounced timer
    debounceTimerRef.current = setTimeout(() => {
      if (pendingUpdatesRef.current) {
        applyUrlUpdate({ ...currentState, ...pendingUpdatesRef.current })
        pendingUpdatesRef.current = null
      }
      debounceTimerRef.current = null
    }, URL_UPDATE_DEBOUNCE)
  }, [currentState, applyUrlUpdate])

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
    updateUrlImmediate,
    commitUrl,
    buildUrlString,
  }
}
