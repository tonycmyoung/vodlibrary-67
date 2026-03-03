import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useVideoLibraryFilters, type VideoLibraryFilterState } from "@/hooks/use-video-library-filters"

describe("useVideoLibraryFilters", () => {
  describe("initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useVideoLibraryFilters())

      expect(result.current.state).toEqual({
        selectedCategories: [],
        selectedCurriculums: [],
        filterMode: "AND",
      })
    })

    it("should initialize with provided initial state", () => {
      const initialState: Partial<VideoLibraryFilterState> = {
        selectedCategories: ["cat-1"],
        selectedCurriculums: ["curr-1"],
        filterMode: "OR",
      }

      const { result } = renderHook(() => useVideoLibraryFilters(initialState))

      expect(result.current.state).toEqual(initialState)
    })
  })

  describe("toggleCategory", () => {
    it("should add a category when not selected", () => {
      const { result } = renderHook(() => useVideoLibraryFilters())

      act(() => {
        result.current.toggleCategory("cat-1")
      })

      expect(result.current.state.selectedCategories).toEqual(["cat-1"])
    })

    it("should remove a category when already selected", () => {
      const { result } = renderHook(() =>
        useVideoLibraryFilters({ selectedCategories: ["cat-1", "cat-2"] })
      )

      act(() => {
        result.current.toggleCategory("cat-1")
      })

      expect(result.current.state.selectedCategories).toEqual(["cat-2"])
    })

    it("should handle multiple toggles correctly", () => {
      const { result } = renderHook(() => useVideoLibraryFilters())

      act(() => {
        result.current.toggleCategory("cat-1")
        result.current.toggleCategory("cat-2")
      })

      expect(result.current.state.selectedCategories).toEqual(["cat-1", "cat-2"])

      act(() => {
        result.current.toggleCategory("cat-1")
      })

      expect(result.current.state.selectedCategories).toEqual(["cat-2"])
    })
  })

  describe("toggleCurriculum", () => {
    it("should add a curriculum when not selected", () => {
      const { result } = renderHook(() => useVideoLibraryFilters())

      act(() => {
        result.current.toggleCurriculum("curr-1")
      })

      expect(result.current.state.selectedCurriculums).toEqual(["curr-1"])
    })

    it("should remove a curriculum when already selected", () => {
      const { result } = renderHook(() =>
        useVideoLibraryFilters({ selectedCurriculums: ["curr-1", "curr-2"] })
      )

      act(() => {
        result.current.toggleCurriculum("curr-1")
      })

      expect(result.current.state.selectedCurriculums).toEqual(["curr-2"])
    })
  })

  describe("setCategories", () => {
    it("should replace all categories", () => {
      const { result } = renderHook(() =>
        useVideoLibraryFilters({ selectedCategories: ["cat-1"] })
      )

      act(() => {
        result.current.setCategories(["cat-2", "cat-3"])
      })

      expect(result.current.state.selectedCategories).toEqual(["cat-2", "cat-3"])
    })
  })

  describe("setCurriculums", () => {
    it("should replace all curriculums", () => {
      const { result } = renderHook(() =>
        useVideoLibraryFilters({ selectedCurriculums: ["curr-1"] })
      )

      act(() => {
        result.current.setCurriculums(["curr-2", "curr-3"])
      })

      expect(result.current.state.selectedCurriculums).toEqual(["curr-2", "curr-3"])
    })
  })

  describe("setFilterMode", () => {
    it("should update filter mode to OR", () => {
      const { result } = renderHook(() => useVideoLibraryFilters())

      act(() => {
        result.current.setFilterMode("OR")
      })

      expect(result.current.state.filterMode).toBe("OR")
    })

    it("should update filter mode to AND", () => {
      const { result } = renderHook(() =>
        useVideoLibraryFilters({ filterMode: "OR" })
      )

      act(() => {
        result.current.setFilterMode("AND")
      })

      expect(result.current.state.filterMode).toBe("AND")
    })
  })

  describe("clearAllFilters", () => {
    it("should clear all filters and reset mode", () => {
      const { result } = renderHook(() =>
        useVideoLibraryFilters({
          selectedCategories: ["cat-1", "cat-2"],
          selectedCurriculums: ["curr-1"],
          filterMode: "OR",
        })
      )

      act(() => {
        result.current.clearAllFilters()
      })

      expect(result.current.state).toEqual({
        selectedCategories: [],
        selectedCurriculums: [],
        filterMode: "AND",
      })
    })
  })

  describe("hasActiveFilters", () => {
    it("should return false when no filters are selected", () => {
      const { result } = renderHook(() => useVideoLibraryFilters())

      expect(result.current.hasActiveFilters).toBe(false)
    })

    it("should return true when categories are selected", () => {
      const { result } = renderHook(() =>
        useVideoLibraryFilters({ selectedCategories: ["cat-1"] })
      )

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it("should return true when curriculums are selected", () => {
      const { result } = renderHook(() =>
        useVideoLibraryFilters({ selectedCurriculums: ["curr-1"] })
      )

      expect(result.current.hasActiveFilters).toBe(true)
    })
  })

  describe("activeFilterCount", () => {
    it("should return 0 when no filters are selected", () => {
      const { result } = renderHook(() => useVideoLibraryFilters())

      expect(result.current.activeFilterCount).toBe(0)
    })

    it("should return correct count with mixed filters", () => {
      const { result } = renderHook(() =>
        useVideoLibraryFilters({
          selectedCategories: ["cat-1", "cat-2"],
          selectedCurriculums: ["curr-1"],
        })
      )

      expect(result.current.activeFilterCount).toBe(3)
    })
  })

  describe("getAllFilters", () => {
    it("should return empty array when no filters", () => {
      const { result } = renderHook(() => useVideoLibraryFilters())

      expect(result.current.getAllFilters()).toEqual([])
    })

    it("should return combined array of all filters", () => {
      const { result } = renderHook(() =>
        useVideoLibraryFilters({
          selectedCategories: ["cat-1", "cat-2"],
          selectedCurriculums: ["curr-1"],
        })
      )

      const filters = result.current.getAllFilters()
      expect(filters).toContain("cat-1")
      expect(filters).toContain("cat-2")
      expect(filters).toContain("curr-1")
      expect(filters.length).toBe(3)
    })
  })
})
