import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useVideoLibraryUrl } from "@/hooks/use-video-library-url"

// Mock for window.history.replaceState (shallow routing)
const mockHistoryReplaceState = vi.fn()
const mockSearchParams = new Map<string, string>()

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
    toString: () => {
      const params = new URLSearchParams()
      mockSearchParams.forEach((value, key) => params.set(key, value))
      return params.toString()
    },
  }),
}))

describe("useVideoLibraryUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockSearchParams.clear()
    // Mock window.location
    Object.defineProperty(window, "location", {
      value: { pathname: "/", search: "" },
      writable: true,
    })
    // Mock window.history.replaceState for shallow routing
    Object.defineProperty(window, "history", {
      value: {
        state: {},
        replaceState: mockHistoryReplaceState,
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("initial state parsing", () => {
    it("should parse empty URL params correctly", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      expect(result.current.urlState).toEqual({
        filters: [],
        search: "",
        mode: "AND",
        page: 1,
      })
    })

    it("should parse filters from URL", () => {
      mockSearchParams.set("filters", JSON.stringify(["cat-1", "curr-1"]))

      const { result } = renderHook(() => useVideoLibraryUrl())

      expect(result.current.urlState.filters).toEqual(["cat-1", "curr-1"])
    })

    it("should parse search from URL", () => {
      mockSearchParams.set("search", "test query")

      const { result } = renderHook(() => useVideoLibraryUrl())

      expect(result.current.urlState.search).toBe("test query")
    })

    it("should parse mode from URL", () => {
      mockSearchParams.set("mode", "OR")

      const { result } = renderHook(() => useVideoLibraryUrl())

      expect(result.current.urlState.mode).toBe("OR")
    })

    it("should parse page from URL", () => {
      mockSearchParams.set("page", "3")

      const { result } = renderHook(() => useVideoLibraryUrl())

      expect(result.current.urlState.page).toBe(3)
    })

    it("should handle invalid filters JSON gracefully", () => {
      mockSearchParams.set("filters", "invalid-json")

      const { result } = renderHook(() => useVideoLibraryUrl())

      expect(result.current.urlState.filters).toEqual([])
    })

    it("should handle negative page numbers", () => {
      mockSearchParams.set("page", "-1")

      const { result } = renderHook(() => useVideoLibraryUrl())

      expect(result.current.urlState.page).toBe(1)
    })
  })

  describe("updateUrl (debounced)", () => {
    it("should update state immediately but debounce URL update", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.updateUrl({ filters: ["cat-1"], page: 1 })
      })

      // State should update immediately
      expect(result.current.urlState.filters).toEqual(["cat-1"])
      // URL should not be updated yet (debounced)
      expect(mockHistoryReplaceState).not.toHaveBeenCalled()

      // Fast forward debounce timer
      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(mockHistoryReplaceState).toHaveBeenCalled()
      const callArg = mockHistoryReplaceState.mock.calls[0][2] // Third arg is the URL
      expect(callArg).toContain("filters")
    })

    it("should batch multiple updates within debounce window", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.updateUrl({ filters: ["cat-1"] })
      })

      act(() => {
        result.current.updateUrl({ filters: ["cat-1", "cat-2"] })
      })

      act(() => {
        result.current.updateUrl({ filters: ["cat-1", "cat-2", "cat-3"] })
      })

      // Should not have called replaceState yet
      expect(mockHistoryReplaceState).not.toHaveBeenCalled()

      // Fast forward debounce timer
      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Should only call replaceState once with final state
      expect(mockHistoryReplaceState).toHaveBeenCalledTimes(1)
    })
  })

  describe("updateUrlImmediate", () => {
    it("should update URL immediately without debounce", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.updateUrlImmediate({ filters: ["cat-1"], page: 1 })
      })

      expect(mockHistoryReplaceState).toHaveBeenCalled()
      const callArg = mockHistoryReplaceState.mock.calls[0][2] // Third arg is the URL
      expect(callArg).toContain("filters")
    })

    it("should update search query immediately", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.updateUrlImmediate({ search: "test", page: 1 })
      })

      expect(mockHistoryReplaceState).toHaveBeenCalled()
      const callArg = mockHistoryReplaceState.mock.calls[0][2] // Third arg is the URL
      expect(callArg).toContain("search=test")
    })

    it("should update mode immediately", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.updateUrlImmediate({ mode: "OR", page: 1 })
      })

      expect(mockHistoryReplaceState).toHaveBeenCalled()
      const callArg = mockHistoryReplaceState.mock.calls[0][2] // Third arg is the URL
      expect(callArg).toContain("mode=OR")
    })

    it("should update page immediately", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.updateUrlImmediate({ page: 5 })
      })

      expect(mockHistoryReplaceState).toHaveBeenCalled()
      const callArg = mockHistoryReplaceState.mock.calls[0][2] // Third arg is the URL
      expect(callArg).toContain("page=5")
    })

    it("should not include AND mode in URL (default)", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.updateUrlImmediate({ mode: "AND", page: 1 })
      })

      // Should not include mode=AND since it's the default
      if (mockHistoryReplaceState.mock.calls.length > 0) {
        const callArg = mockHistoryReplaceState.mock.calls[0][2] // Third arg is the URL
        expect(callArg).not.toContain("mode=AND")
      }
    })

    it("should not include page=1 in URL (default)", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.updateUrlImmediate({ filters: ["cat-1"], page: 1 })
      })

      expect(mockHistoryReplaceState).toHaveBeenCalled()
      const callArg = mockHistoryReplaceState.mock.calls[0][2] // Third arg is the URL
      expect(callArg).not.toContain("page=1")
    })
  })

  describe("commitUrl", () => {
    it("should commit pending debounced updates immediately", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.updateUrl({ filters: ["cat-1"], page: 1 })
      })

      // URL should not be updated yet
      expect(mockHistoryReplaceState).not.toHaveBeenCalled()

      act(() => {
        result.current.commitUrl()
      })

      // Now URL should be updated
      expect(mockHistoryReplaceState).toHaveBeenCalled()
    })
  })

  describe("setFilters", () => {
    it("should update filters via setFilters helper", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.setFilters(["cat-1", "cat-2"])
      })

      expect(result.current.urlState.filters).toEqual(["cat-1", "cat-2"])
    })
  })

  describe("setSearch", () => {
    it("should update search via setSearch helper", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.setSearch("new search")
      })

      expect(result.current.urlState.search).toBe("new search")
    })
  })

  describe("setMode", () => {
    it("should update mode via setMode helper", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.setMode("OR")
      })

      expect(result.current.urlState.mode).toBe("OR")
    })
  })

  describe("setPage", () => {
    it("should update page via setPage helper", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.setPage(3)
      })

      expect(result.current.urlState.page).toBe(3)
    })
  })

  describe("browser navigation sync", () => {
    it("should sync state when URL changes externally (browser back/forward)", () => {
      // Start with filters in URL
      mockSearchParams.set("filters", JSON.stringify(["cat-1", "cat-2"]))
      mockSearchParams.set("page", "2")

      const { result, rerender } = renderHook(() => useVideoLibraryUrl())

      // Verify initial state
      expect(result.current.urlState.filters).toEqual(["cat-1", "cat-2"])
      expect(result.current.urlState.page).toBe(2)

      // Simulate browser back navigation by changing searchParams
      mockSearchParams.clear()
      mockSearchParams.set("filters", JSON.stringify(["cat-3"]))
      mockSearchParams.set("page", "1")

      // Re-render to trigger useSearchParams update
      rerender()

      // State should sync to new URL
      expect(result.current.urlState.filters).toEqual(["cat-3"])
      expect(result.current.urlState.page).toBe(1)
    })
  })

  describe("buildUrlString", () => {
    it("should build URL string with filters", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      const urlString = result.current.buildUrlString({ filters: ["cat-1"] })

      expect(urlString).toContain("filters")
    })

    it("should build URL string with search", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      const urlString = result.current.buildUrlString({ search: "test" })

      expect(urlString).toContain("search=test")
    })

    it("should build empty string for default state", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      const urlString = result.current.buildUrlString({})

      expect(urlString).toBe("")
    })
  })
})
