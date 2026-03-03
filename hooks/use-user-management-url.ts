"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"

export type SortOrder = "asc" | "desc"

export interface UserManagementUrlState {
  role: string
  school: string
  belt: string
  search: string
  sortBy: string
  sortOrder: SortOrder
}

export interface UseUserManagementUrlOptions {
  /** Base path for URL (e.g., "/admin/users" or "/students") */
  basePath: string
  /** Default sort field */
  defaultSortBy?: string
  /** Default sort order */
  defaultSortOrder?: SortOrder
  /** Whether to persist sort to URL (default: true) */
  persistSort?: boolean
}

export interface UseUserManagementUrlReturn {
  /** Current URL state */
  urlState: UserManagementUrlState
  /** Update role filter */
  setRole: (role: string) => void
  /** Update school filter */
  setSchool: (school: string) => void
  /** Update belt filter */
  setBelt: (belt: string) => void
  /** Update search query */
  setSearch: (search: string) => void
  /** Update sort settings */
  setSort: (sortBy: string, sortOrder: SortOrder) => void
  /** Update multiple URL parameters at once (debounced by default) */
  updateUrl: (updates: Partial<UserManagementUrlState>) => void
  /** Update URL immediately without debouncing */
  updateUrlImmediate: (updates: Partial<UserManagementUrlState>) => void
  /** Commit any pending URL updates immediately */
  commitUrl: () => void
  /** Build URL string from state (for external use) */
  buildUrlString: (state: Partial<UserManagementUrlState>) => string
}

/** Debounce delay for URL updates (ms) */
const URL_UPDATE_DEBOUNCE = 500

/**
 * Parse URL search params into UserManagementUrlState
 * Extracted for reuse in both initial parse and browser navigation sync
 */
function parseUrlState(
  searchParams: URLSearchParams,
  defaultSortBy: string,
  defaultSortOrder: SortOrder
): UserManagementUrlState {
  return {
    role: searchParams.get("role") || "all",
    school: searchParams.get("school") || "all",
    belt: searchParams.get("belt") || "all",
    search: searchParams.get("search") || "",
    sortBy: searchParams.get("sortBy") || defaultSortBy,
    sortOrder: (searchParams.get("sortOrder") as SortOrder) || defaultSortOrder,
  }
}

/**
 * Custom hook for managing User/Student Management URL state
 * Centralizes URL parsing, reconstruction, and updates
 * Uses shallow routing (window.history) for performance - no Next.js navigation re-renders
 */
export function useUserManagementUrl(options: UseUserManagementUrlOptions): UseUserManagementUrlReturn {
  const {
    basePath,
    defaultSortBy = "full_name",
    defaultSortOrder = "asc",
    persistSort = true,
  } = options

  const searchParams = useSearchParams()

  // Parse initial URL state once
  const initialState = useMemo(
    (): UserManagementUrlState => parseUrlState(searchParams, defaultSortBy, defaultSortOrder),
    [searchParams, defaultSortBy, defaultSortOrder]
  )

  // Track current state (allows for optimistic updates)
  const [currentState, setCurrentState] = useState<UserManagementUrlState>(initialState)

  // Ref to track current state for use in callbacks (avoids stale closures and infinite loops)
  const currentStateRef = useRef<UserManagementUrlState>(currentState)
  currentStateRef.current = currentState

  // Refs for debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingUpdatesRef = useRef<Partial<UserManagementUrlState> | null>(null)

  // Sync state when URL changes externally (browser back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const newState = parseUrlState(params, defaultSortBy, defaultSortOrder)
      setCurrentState(newState)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [defaultSortBy, defaultSortOrder])

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
   * Uses ref to avoid dependency on currentState (prevents infinite loops)
   */
  const buildUrlString = useCallback((state: Partial<UserManagementUrlState>): string => {
    const mergedState = { ...currentStateRef.current, ...state }
    const params = new URLSearchParams()

    if (mergedState.role && mergedState.role !== "all") {
      params.set("role", mergedState.role)
    }

    if (mergedState.school && mergedState.school !== "all") {
      params.set("school", mergedState.school)
    }

    if (mergedState.belt && mergedState.belt !== "all") {
      params.set("belt", mergedState.belt)
    }

    if (mergedState.search.trim()) {
      params.set("search", mergedState.search)
    }

    if (persistSort) {
      if (mergedState.sortBy && mergedState.sortBy !== defaultSortBy) {
        params.set("sortBy", mergedState.sortBy)
      }

      if (mergedState.sortOrder && mergedState.sortOrder !== defaultSortOrder) {
        params.set("sortOrder", mergedState.sortOrder)
      }
    }

    return params.toString() ? `?${params.toString()}` : ""
  }, [defaultSortBy, defaultSortOrder, persistSort])

  /**
   * Apply URL update to browser using shallow routing
   * Uses window.history.replaceState for better performance - avoids Next.js router re-renders
   */
  const applyUrlUpdate = useCallback((newState: UserManagementUrlState) => {
    if (typeof window === "undefined") return

    const newSearch = buildUrlString(newState)
    const currentSearch = window.location.search

    // Only update if URL actually changed
    if (currentSearch !== newSearch) {
      const newURL = newSearch ? `${basePath}${newSearch}` : basePath
      window.history.replaceState(
        { ...window.history.state, as: newURL, url: newURL },
        "",
        newURL
      )
    }
  }, [basePath, buildUrlString])

  /**
   * Update URL immediately without debouncing
   * Uses ref to avoid dependency on currentState (prevents infinite loops)
   */
  const updateUrlImmediate = useCallback((updates: Partial<UserManagementUrlState>) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    pendingUpdatesRef.current = null

    const newState = { ...currentStateRef.current, ...updates }
    setCurrentState(newState)
    applyUrlUpdate(newState)
  }, [applyUrlUpdate])

  /**
   * Commit any pending URL updates immediately
   * Uses ref to avoid dependency on currentState (prevents infinite loops)
   */
  const commitUrl = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    if (pendingUpdatesRef.current) {
      const newState = { ...currentStateRef.current, ...pendingUpdatesRef.current }
      pendingUpdatesRef.current = null
      applyUrlUpdate(newState)
    }
  }, [applyUrlUpdate])

  /**
   * Update URL with new state (debounced for filter changes)
   * State updates immediately for UI responsiveness, URL updates after delay
   * Uses ref to avoid dependency on currentState (prevents infinite loops)
   */
  const updateUrl = useCallback((updates: Partial<UserManagementUrlState>) => {
    const newState = { ...currentStateRef.current, ...updates }
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
        applyUrlUpdate({ ...currentStateRef.current, ...pendingUpdatesRef.current })
        pendingUpdatesRef.current = null
      }
      debounceTimerRef.current = null
    }, URL_UPDATE_DEBOUNCE)
  }, [applyUrlUpdate])

  /**
   * Set role filter
   */
  const setRole = useCallback((role: string) => {
    updateUrl({ role })
  }, [updateUrl])

  /**
   * Set school filter
   */
  const setSchool = useCallback((school: string) => {
    updateUrl({ school })
  }, [updateUrl])

  /**
   * Set belt filter
   */
  const setBelt = useCallback((belt: string) => {
    updateUrl({ belt })
  }, [updateUrl])

  /**
   * Set search query
   */
  const setSearch = useCallback((search: string) => {
    updateUrl({ search })
  }, [updateUrl])

  /**
   * Set sort settings
   */
  const setSort = useCallback((sortBy: string, sortOrder: SortOrder) => {
    updateUrl({ sortBy, sortOrder })
  }, [updateUrl])

  return {
    urlState: currentState,
    setRole,
    setSchool,
    setBelt,
    setSearch,
    setSort,
    updateUrl,
    updateUrlImmediate,
    commitUrl,
    buildUrlString,
  }
}
