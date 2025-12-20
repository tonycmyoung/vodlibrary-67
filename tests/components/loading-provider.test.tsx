"use client"

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
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

  it("should show spinner after delay when clicking internal link", async () => {
    render(
      <LoadingProvider>
        <a href="/dashboard">Dashboard</a>
      </LoadingProvider>,
    )

    const link = screen.getByText("Dashboard")
    fireEvent.click(link, { bubbles: true })

    // Should not show spinner immediately
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()

    // Advance timers by 200ms to trigger spinner
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Spinner should now be visible
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })

  it("should not show loading for external links", () => {
    render(
      <LoadingProvider>
        <a href="https://external.com" target="_blank" rel="noreferrer">
          External
        </a>
      </LoadingProvider>,
    )

    const link = screen.getByText("External")
    fireEvent.click(link, { bubbles: true })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
  })

  it("should not show loading for mailto links", () => {
    render(
      <LoadingProvider>
        <a href="mailto:test@example.com">Email</a>
      </LoadingProvider>,
    )

    const link = screen.getByText("Email")
    fireEvent.click(link, { bubbles: true })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
  })

  it("should not show loading for tel links", () => {
    render(
      <LoadingProvider>
        <a href="tel:+1234567890">Call</a>
      </LoadingProvider>,
    )

    const link = screen.getByText("Call")
    fireEvent.click(link, { bubbles: true })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
  })

  it("should not show loading for hash links", () => {
    render(
      <LoadingProvider>
        <a href="#section">Section</a>
      </LoadingProvider>,
    )

    const link = screen.getByText("Section")
    fireEvent.click(link, { bubbles: true })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
  })

  it("should not show loading when clicking on input elements", () => {
    render(
      <LoadingProvider>
        <a href="/dashboard">
          <input type="text" />
        </a>
      </LoadingProvider>,
    )

    const input = screen.getByRole("textbox")
    fireEvent.click(input, { bubbles: true })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
  })

  it("should not show loading for elements with data-no-loading attribute", () => {
    render(
      <LoadingProvider>
        <a href="/dashboard">
          <button data-no-loading>No Loading</button>
        </a>
      </LoadingProvider>,
    )

    const button = screen.getByText("No Loading")
    fireEvent.click(button, { bubbles: true })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
  })

  it("should show loading for elements with data-navigate attribute", async () => {
    render(
      <LoadingProvider>
        <button data-navigate>Navigate</button>
      </LoadingProvider>,
    )

    const button = screen.getByText("Navigate")
    fireEvent.click(button, { bubbles: true })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })

  it("should clear loading state when pathname changes", () => {
    const { rerender } = render(
      <LoadingProvider>
        <a href="/dashboard">Dashboard</a>
      </LoadingProvider>,
    )

    const link = screen.getByText("Dashboard")
    fireEvent.click(link, { bubbles: true })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Change pathname
    vi.mocked(usePathname).mockReturnValue("/dashboard")
    rerender(
      <LoadingProvider>
        <a href="/dashboard">Dashboard</a>
      </LoadingProvider>,
    )

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
  })

  it("should auto-clear loading after 10 seconds as fallback", async () => {
    render(
      <LoadingProvider>
        <a href="/dashboard">Dashboard</a>
      </LoadingProvider>,
    )

    const link = screen.getByText("Dashboard")
    fireEvent.click(link, { bubbles: true })

    // Advance to show spinner
    act(() => {
      vi.advanceTimersByTime(200)
    })

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })

    // Advance 10 seconds to trigger auto-clear
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    })
  })

  it("should allow manual control of loading state via setLoading", async () => {
    function TestComponent() {
      const { setLoading } = useLoading()
      return <button onClick={() => setLoading(true)}>Set Loading</button>
    }

    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>,
    )

    const button = screen.getByText("Set Loading")
    fireEvent.click(button)

    // Note: Manual setLoading(true) sets isLoading but doesn't show spinner
    // (spinner only shows from click handler after delay)
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
  })

  it("should clear spinner when manually setting loading to false", async () => {
    function TestComponent() {
      const { setLoading } = useLoading()
      return (
        <>
          <a href="/dashboard">Dashboard</a>
          <button onClick={() => setLoading(false)}>Stop Loading</button>
        </>
      )
    }

    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>,
    )

    // Trigger loading with link click
    const link = screen.getByText("Dashboard")
    fireEvent.click(link, { bubbles: true })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })

    // Manually stop loading
    const stopButton = screen.getByText("Stop Loading")
    fireEvent.click(stopButton)

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    })
  })
})
