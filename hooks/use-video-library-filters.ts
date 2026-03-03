"use client"

import { useState, useCallback, useMemo } from "react"

export type FilterMode = "AND" | "OR"

export interface VideoLibraryFilterState {
  selectedCategories: string[]
  selectedCurriculums: string[]
  filterMode: FilterMode
}

const DEFAULT_STATE: VideoLibraryFilterState = {
  selectedCategories: [],
  selectedCurriculums: [],
  filterMode: "AND",
}

/**
 * Hook for managing video library filter state
 * Provides a unified interface for category, curriculum, and mode filters
 */
export function useVideoLibraryFilters(initialState?: Partial<VideoLibraryFilterState>) {
  const [state, setState] = useState<VideoLibraryFilterState>({
    ...DEFAULT_STATE,
    ...initialState,
  })

  // Toggle a category filter on/off
  const toggleCategory = useCallback((categoryId: string) => {
    setState((prev) => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(categoryId)
        ? prev.selectedCategories.filter((id) => id !== categoryId)
        : [...prev.selectedCategories, categoryId],
    }))
  }, [])

  // Toggle a curriculum filter on/off
  const toggleCurriculum = useCallback((curriculumId: string) => {
    setState((prev) => ({
      ...prev,
      selectedCurriculums: prev.selectedCurriculums.includes(curriculumId)
        ? prev.selectedCurriculums.filter((id) => id !== curriculumId)
        : [...prev.selectedCurriculums, curriculumId],
    }))
  }, [])

  // Set all categories at once
  const setCategories = useCallback((categories: string[]) => {
    setState((prev) => ({
      ...prev,
      selectedCategories: categories,
    }))
  }, [])

  // Set all curriculums at once
  const setCurriculums = useCallback((curriculums: string[]) => {
    setState((prev) => ({
      ...prev,
      selectedCurriculums: curriculums,
    }))
  }, [])

  // Set the filter mode (AND/OR)
  const setFilterMode = useCallback((mode: FilterMode) => {
    setState((prev) => ({
      ...prev,
      filterMode: mode,
    }))
  }, [])

  // Clear all filters and reset to defaults
  const clearAllFilters = useCallback(() => {
    setState(DEFAULT_STATE)
  }, [])

  // Check if any filters are active
  const hasActiveFilters = useMemo(
    () => state.selectedCategories.length > 0 || state.selectedCurriculums.length > 0,
    [state.selectedCategories.length, state.selectedCurriculums.length]
  )

  // Get total count of active filters
  const activeFilterCount = useMemo(
    () => state.selectedCategories.length + state.selectedCurriculums.length,
    [state.selectedCategories.length, state.selectedCurriculums.length]
  )

  // Get all filters as a single array (for URL serialization)
  const getAllFilters = useCallback(
    () => [...state.selectedCategories, ...state.selectedCurriculums],
    [state.selectedCategories, state.selectedCurriculums]
  )

  return {
    state,
    toggleCategory,
    toggleCurriculum,
    setCategories,
    setCurriculums,
    setFilterMode,
    clearAllFilters,
    hasActiveFilters,
    activeFilterCount,
    getAllFilters,
  }
}
