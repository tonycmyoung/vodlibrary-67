"use client"

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { LoadingProvider, useLoading } from "@/components/loading-provider"
import { usePathname } from "next/navigation"

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}))

describe("LoadingProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(usePathname).mockReturnValue("/")
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("should render children", () => {
    render(
      <LoadingProvider>
        <div>Test Content</div>
      </LoadingProvider>,
    )

    expect(screen.getByText("Test Content")).toBeInTheDocument()
  })

  it("should provide loading context", () => {
    function TestComponent() {
      const { isLoading } = useLoading()
      return <div>Loading: {isLoading ? "true" : "false"}</div>
    }

    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>,
    )

    expect(screen.getByText("Loading: false")).toBeInTheDocument()
  })

  it("should throw error when useLoading is used outside provider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() => {
      function TestComponent() {
        useLoading()
        return null
      }
      render(<TestComponent />)
    }).toThrow("useLoading must be used within a LoadingProvider")

    consoleSpy.mockRestore()
  })
})
