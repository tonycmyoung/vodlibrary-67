import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useVideoLibraryUrl } from "@/hooks/use-video-library-url"

// Mock next/navigation
const mockReplace = vi.fn()
const mockSearchParams = new Map<string, string>()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    back: vi.fn(),
  }),
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
    mockSearchParams.clear()
    // Mock window.location
    Object.defineProperty(window, "location", {
      value: { pathname: "/", search: "" },
      writable: true,
    })
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

  describe("updateUrl", () => {
    it("should update filters and reset page to 1", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.updateUrl({ filters: ["cat-1"], page: 1 })
      })

      expect(mockReplace).toHaveBeenCalled()
      const callArg = mockReplace.mock.calls[0][0]
      expect(callArg).toContain("filters")
    })

    it("should update search query", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.updateUrl({ search: "test", page: 1 })
      })

      expect(mockReplace).toHaveBeenCalled()
      const callArg = mockReplace.mock.calls[0][0]
      expect(callArg).toContain("search=test")
    })

    it("should update mode", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.updateUrl({ mode: "OR", page: 1 })
      })

      expect(mockReplace).toHaveBeenCalled()
      const callArg = mockReplace.mock.calls[0][0]
      expect(callArg).toContain("mode=OR")
    })

    it("should update page", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.updateUrl({ page: 5 })
      })

      expect(mockReplace).toHaveBeenCalled()
      const callArg = mockReplace.mock.calls[0][0]
      expect(callArg).toContain("page=5")
    })

    it("should not include AND mode in URL (default)", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.updateUrl({ mode: "AND", page: 1 })
      })

      // Should not include mode=AND since it's the default
      if (mockReplace.mock.calls.length > 0) {
        const callArg = mockReplace.mock.calls[0][0]
        expect(callArg).not.toContain("mode=AND")
      }
    })

    it("should not include page=1 in URL (default)", () => {
      const { result } = renderHook(() => useVideoLibraryUrl())

      act(() => {
        result.current.updateUrl({ filters: ["cat-1"], page: 1 })
      })

      expect(mockReplace).toHaveBeenCalled()
      const callArg = mockReplace.mock.calls[0][0]
      expect(callArg).not.toContain("page=1")
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
