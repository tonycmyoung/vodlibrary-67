import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useUserManagementUrl } from "@/hooks/use-user-management-url"

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

describe("useUserManagementUrl", () => {
  const defaultOptions = {
    basePath: "/admin/users",
    defaultSortBy: "full_name",
    defaultSortOrder: "asc" as const,
    persistSort: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockSearchParams.clear()
    // Mock window.location
    Object.defineProperty(window, "location", {
      value: { pathname: "/admin/users", search: "" },
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
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      expect(result.current.urlState).toEqual({
        role: "all",
        school: "all",
        belt: "all",
        search: "",
        sortBy: "full_name",
        sortOrder: "asc",
      })
    })

    it("should parse role from URL", () => {
      mockSearchParams.set("role", "Student")

      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      expect(result.current.urlState.role).toBe("Student")
    })

    it("should parse school from URL", () => {
      mockSearchParams.set("school", "Test School")

      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      expect(result.current.urlState.school).toBe("Test School")
    })

    it("should parse belt from URL", () => {
      mockSearchParams.set("belt", "Yellow")

      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      expect(result.current.urlState.belt).toBe("Yellow")
    })

    it("should parse search from URL", () => {
      mockSearchParams.set("search", "test query")

      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      expect(result.current.urlState.search).toBe("test query")
    })

    it("should parse sortBy from URL", () => {
      mockSearchParams.set("sortBy", "created_at")

      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      expect(result.current.urlState.sortBy).toBe("created_at")
    })

    it("should parse sortOrder from URL", () => {
      mockSearchParams.set("sortOrder", "desc")

      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      expect(result.current.urlState.sortOrder).toBe("desc")
    })
  })

  describe("updateUrl (debounced)", () => {
    it("should update state immediately but debounce URL update", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      act(() => {
        result.current.updateUrl({ role: "Teacher" })
      })

      // State should update immediately
      expect(result.current.urlState.role).toBe("Teacher")
      // URL should not be updated yet (debounced)
      expect(mockHistoryReplaceState).not.toHaveBeenCalled()

      // Fast forward debounce timer
      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(mockHistoryReplaceState).toHaveBeenCalled()
      const callArg = mockHistoryReplaceState.mock.calls[0][2] // Third arg is the URL
      expect(callArg).toContain("role=Teacher")
    })

    it("should batch multiple updates within debounce window", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      act(() => {
        result.current.updateUrl({ role: "Student" })
      })

      act(() => {
        result.current.updateUrl({ school: "Test School" })
      })

      act(() => {
        result.current.updateUrl({ belt: "Yellow" })
      })

      // Should not have called replaceState yet
      expect(mockHistoryReplaceState).not.toHaveBeenCalled()

      // Fast forward debounce timer
      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Should only call replaceState once with final state
      expect(mockHistoryReplaceState).toHaveBeenCalledTimes(1)
      const callArg = mockHistoryReplaceState.mock.calls[0][2]
      expect(callArg).toContain("role=Student")
      expect(callArg).toContain("school=Test")
      expect(callArg).toContain("belt=Yellow")
    })
  })

  describe("updateUrlImmediate", () => {
    it("should update URL immediately without debounce", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      act(() => {
        result.current.updateUrlImmediate({ role: "Admin" })
      })

      expect(mockHistoryReplaceState).toHaveBeenCalled()
      const callArg = mockHistoryReplaceState.mock.calls[0][2]
      expect(callArg).toContain("role=Admin")
    })

    it("should not include 'all' values in URL (defaults)", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      act(() => {
        result.current.updateUrlImmediate({ role: "all", school: "all" })
      })

      // Should not include role=all or school=all since they're defaults
      if (mockHistoryReplaceState.mock.calls.length > 0) {
        const callArg = mockHistoryReplaceState.mock.calls[0][2]
        expect(callArg).not.toContain("role=all")
        expect(callArg).not.toContain("school=all")
      }
    })

    it("should not include default sort values in URL when persistSort is true", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      act(() => {
        result.current.updateUrlImmediate({ sortBy: "full_name", sortOrder: "asc" })
      })

      // Should not include default sort values
      if (mockHistoryReplaceState.mock.calls.length > 0) {
        const callArg = mockHistoryReplaceState.mock.calls[0][2]
        expect(callArg).not.toContain("sortBy=full_name")
        expect(callArg).not.toContain("sortOrder=asc")
      }
    })
  })

  describe("persistSort option", () => {
    it("should not persist sort to URL when persistSort is false", () => {
      const { result } = renderHook(() =>
        useUserManagementUrl({ ...defaultOptions, persistSort: false })
      )

      act(() => {
        result.current.updateUrlImmediate({ sortBy: "created_at", sortOrder: "desc" })
      })

      // Sort should not be in URL when persistSort is false
      if (mockHistoryReplaceState.mock.calls.length > 0) {
        const callArg = mockHistoryReplaceState.mock.calls[0][2]
        expect(callArg).not.toContain("sortBy")
        expect(callArg).not.toContain("sortOrder")
      }
    })

    it("should persist non-default sort to URL when persistSort is true", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      act(() => {
        result.current.updateUrlImmediate({ sortBy: "created_at", sortOrder: "desc" })
      })

      expect(mockHistoryReplaceState).toHaveBeenCalled()
      const callArg = mockHistoryReplaceState.mock.calls[0][2]
      expect(callArg).toContain("sortBy=created_at")
      expect(callArg).toContain("sortOrder=desc")
    })
  })

  describe("commitUrl", () => {
    it("should commit pending debounced updates immediately", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      act(() => {
        result.current.updateUrl({ role: "Teacher" })
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

  describe("helper methods", () => {
    it("should update role via setRole helper", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      act(() => {
        result.current.setRole("Teacher")
      })

      expect(result.current.urlState.role).toBe("Teacher")
    })

    it("should update school via setSchool helper", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      act(() => {
        result.current.setSchool("Test School")
      })

      expect(result.current.urlState.school).toBe("Test School")
    })

    it("should update belt via setBelt helper", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      act(() => {
        result.current.setBelt("Yellow")
      })

      expect(result.current.urlState.belt).toBe("Yellow")
    })

    it("should update search via setSearch helper", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      act(() => {
        result.current.setSearch("test query")
      })

      expect(result.current.urlState.search).toBe("test query")
    })

    it("should update sort via setSort helper", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      act(() => {
        result.current.setSort("created_at", "desc")
      })

      expect(result.current.urlState.sortBy).toBe("created_at")
      expect(result.current.urlState.sortOrder).toBe("desc")
    })
  })

  describe("browser navigation sync", () => {
    it("should sync state when URL changes externally (browser back/forward via popstate)", () => {
      // Start with filters in URL
      mockSearchParams.set("role", "Teacher")
      mockSearchParams.set("school", "School A")

      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      // Verify initial state
      expect(result.current.urlState.role).toBe("Teacher")
      expect(result.current.urlState.school).toBe("School A")

      // Simulate browser back navigation by changing window.location.search and firing popstate
      Object.defineProperty(window, "location", {
        value: { pathname: "/admin/users", search: "?role=Student&belt=Yellow" },
        writable: true,
      })

      // Fire popstate event to simulate browser navigation
      act(() => {
        window.dispatchEvent(new PopStateEvent("popstate"))
      })

      // State should sync to new URL
      expect(result.current.urlState.role).toBe("Student")
      expect(result.current.urlState.belt).toBe("Yellow")
      expect(result.current.urlState.school).toBe("all") // Reset to default
    })
  })

  describe("buildUrlString", () => {
    it("should build URL string with role", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      const urlString = result.current.buildUrlString({ role: "Teacher" })

      expect(urlString).toContain("role=Teacher")
    })

    it("should build URL string with search", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      const urlString = result.current.buildUrlString({ search: "test" })

      expect(urlString).toContain("search=test")
    })

    it("should build empty string for default state", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      const urlString = result.current.buildUrlString({})

      expect(urlString).toBe("")
    })

    it("should build URL with multiple non-default values", () => {
      const { result } = renderHook(() => useUserManagementUrl(defaultOptions))

      const urlString = result.current.buildUrlString({
        role: "Student",
        school: "Test School",
        belt: "Yellow",
        search: "john",
      })

      expect(urlString).toContain("role=Student")
      expect(urlString).toContain("school=Test")
      expect(urlString).toContain("belt=Yellow")
      expect(urlString).toContain("search=john")
    })
  })

  describe("different base paths", () => {
    it("should use correct base path for user management", () => {
      const { result } = renderHook(() =>
        useUserManagementUrl({ ...defaultOptions, basePath: "/admin/users" })
      )

      act(() => {
        result.current.updateUrlImmediate({ role: "Teacher" })
      })

      expect(mockHistoryReplaceState).toHaveBeenCalled()
      const callArg = mockHistoryReplaceState.mock.calls[0][2]
      expect(callArg).toContain("/admin/users")
    })

    it("should use correct base path for student management", () => {
      const { result } = renderHook(() =>
        useUserManagementUrl({ ...defaultOptions, basePath: "/students" })
      )

      act(() => {
        result.current.updateUrlImmediate({ role: "Student" })
      })

      expect(mockHistoryReplaceState).toHaveBeenCalled()
      const callArg = mockHistoryReplaceState.mock.calls[0][2]
      expect(callArg).toContain("/students")
    })
  })
})
