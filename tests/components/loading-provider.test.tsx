"use client"

import { describe, it, expect, vi, beforeEach, afterEach, fireEvent } from "vitest"
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

    expect(screen.getByText("Test Content")).toBeTruthy()
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

    expect(screen.getByText("Loading: false")).toBeTruthy()
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

  it("should auto-clear loading state after 10 seconds", () => {
    function TestComponent() {
      const { isLoading, setLoading } = useLoading()
      return (
        <div>
          <div>Loading: {isLoading ? "true" : "false"}</div>
          <button onClick={() => setLoading(true)}>Start Loading</button>
        </div>
      )
    }

    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>,
    )

    const button = screen.getByText("Start Loading")
    fireEvent.click(button)

    expect(screen.getByText("Loading: true")).toBeTruthy()

    // Fast-forward 10 seconds
    vi.advanceTimersByTime(10000)

    expect(screen.getByText("Loading: false")).toBeTruthy()
  })

  it("should clear loading state when pathname changes", () => {
    const { rerender } = render(
      <LoadingProvider>
        <div>Test Content</div>
      </LoadingProvider>,
    )

    // Simulate pathname change
    vi.mocked(usePathname).mockReturnValue("/new-page")

    rerender(
      <LoadingProvider>
        <div>Test Content</div>
      </LoadingProvider>,
    )

    // Loading state should be cleared (no spinner visible)
    expect(screen.queryByText("Loading...")).toBeNull()
  })

  it("should skip loading for external links", () => {
    render(
      <LoadingProvider>
        <a href="https://external.com">External Link</a>
      </LoadingProvider>,
    )

    const link = screen.getByText("External Link")
    fireEvent.click(link, { bubbles: true })

    // Should not show loading spinner after delay
    vi.advanceTimersByTime(300)
    expect(screen.queryByText("Loading...")).toBeNull()
  })

  it("should skip loading for mailto links", () => {
    render(
      <LoadingProvider>
        <a href="mailto:test@example.com">Email Link</a>
      </LoadingProvider>,
    )

    const link = screen.getByText("Email Link")
    fireEvent.click(link, { bubbles: true })

    vi.advanceTimersByTime(300)
    expect(screen.queryByText("Loading...")).toBeNull()
  })

  it("should skip loading for tel links", () => {
    render(
      <LoadingProvider>
        <a href="tel:+1234567890">Phone Link</a>
      </LoadingProvider>,
    )

    const link = screen.getByText("Phone Link")
    fireEvent.click(link, { bubbles: true })

    vi.advanceTimersByTime(300)
    expect(screen.queryByText("Loading...")).toBeNull()
  })

  it("should skip loading for hash links", () => {
    render(
      <LoadingProvider>
        <a href="#section">Hash Link</a>
      </LoadingProvider>,
    )

    const link = screen.getByText("Hash Link")
    fireEvent.click(link, { bubbles: true })

    vi.advanceTimersByTime(300)
    expect(screen.queryByText("Loading...")).toBeNull()
  })

  it("should skip loading for elements with data-no-loading attribute", () => {
    render(
      <LoadingProvider>
        <button data-no-loading>No Loading Button</button>
      </LoadingProvider>,
    )

    const button = screen.getByText("No Loading Button")
    fireEvent.click(button, { bubbles: true })

    vi.advanceTimersByTime(300)
    expect(screen.queryByText("Loading...")).toBeNull()
  })

  it("should show loading for elements with data-navigate attribute", () => {
    render(
      <LoadingProvider>
        <button data-navigate>Navigate Button</button>
      </LoadingProvider>,
    )

    const button = screen.getByText("Navigate Button")
    fireEvent.click(button, { bubbles: true })

    // Spinner shows after 200ms delay
    vi.advanceTimersByTime(200)
    expect(screen.getByText("Loading...")).toBeTruthy()
  })
})
