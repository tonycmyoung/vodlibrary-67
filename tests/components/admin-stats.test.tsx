import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import AdminStats from "@/components/admin-stats"
import * as actions from "@/lib/actions"

vi.mock("@/lib/actions", () => ({
  getTelemetryData: vi.fn(),
}))

describe("AdminStats", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should display loading skeletons while fetching stats", () => {
    vi.mocked(actions.getTelemetryData).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    )

    render(<AdminStats />)

    const skeletons = screen.getAllByRole("generic").filter((el) => el.className.includes("animate-pulse"))
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("should display stats after successful fetch", async () => {
    vi.mocked(actions.getTelemetryData).mockResolvedValue({
      success: true,
      data: {
        totalUsers: 150,
        totalViews: 5000,
        thisWeekViews: 300,
        lastWeekViews: 250,
        thisWeekUserLogins: 75,
        lastWeekUserLogins: 60,
      },
    })

    render(<AdminStats />)

    await waitFor(() => {
      expect(screen.getByText("Total Users")).toBeTruthy()
    })

    expect(screen.getByText("150")).toBeTruthy()
    expect(screen.getByText("Videos Viewed This Week")).toBeTruthy()
    expect(screen.getByText("300")).toBeTruthy()
    expect(screen.getByText("Last week: 250")).toBeTruthy()
    expect(screen.getByText("Total Views: 5,000")).toBeTruthy()
    expect(screen.getByText("Logons This Week")).toBeTruthy()
    expect(screen.getByText("75")).toBeTruthy()
    expect(screen.getByText("Last week: 60")).toBeTruthy()
  })

  it("should handle fetch errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.mocked(actions.getTelemetryData).mockRejectedValue(new Error("Fetch failed"))

    render(<AdminStats />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching stats:", expect.any(Error))
    })

    consoleErrorSpy.mockRestore()
  })

  it("should display all stat card icons", async () => {
    vi.mocked(actions.getTelemetryData).mockResolvedValue({
      success: true,
      data: {
        totalUsers: 100,
        totalViews: 2000,
        thisWeekViews: 200,
        lastWeekViews: 150,
        thisWeekUserLogins: 50,
        lastWeekUserLogins: 40,
      },
    })

    render(<AdminStats />)

    await waitFor(() => {
      expect(screen.getByText("Total Users")).toBeTruthy()
    })

    // Icons are rendered as SVG elements with lucide classes
    const cards = screen.getAllByRole("generic").filter((el) => el.className.includes("border-gray-800"))
    expect(cards.length).toBe(3)
  })

  it("should refresh stats when admin-refresh-stats event is dispatched", async () => {
    vi.mocked(actions.getTelemetryData)
      .mockResolvedValueOnce({
        success: true,
        data: {
          totalUsers: 100,
          totalViews: 2000,
          thisWeekViews: 200,
          lastWeekViews: 150,
          thisWeekUserLogins: 50,
          lastWeekUserLogins: 40,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          totalUsers: 120,
          totalViews: 2500,
          thisWeekViews: 250,
          lastWeekViews: 200,
          thisWeekUserLogins: 60,
          lastWeekUserLogins: 50,
        },
      })

    render(<AdminStats />)

    await waitFor(() => {
      expect(screen.getByText("100")).toBeTruthy()
    })

    // Dispatch refresh event
    window.dispatchEvent(new Event("admin-refresh-stats"))

    await waitFor(() => {
      expect(screen.getByText("120")).toBeTruthy()
    })

    expect(actions.getTelemetryData).toHaveBeenCalledTimes(2)
  })

  it("should handle unsuccessful fetch response", async () => {
    vi.mocked(actions.getTelemetryData).mockResolvedValue({
      success: false,
      error: "Database error",
    })

    render(<AdminStats />)

    await waitFor(() => {
      // Stats should remain at default values (0)
      const cards = screen.getAllByRole("generic").filter((el) => el.className.includes("border-gray-800"))
      expect(cards.length).toBe(3)
    })
  })

  it("should clean up event listener on unmount", async () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener")

    vi.mocked(actions.getTelemetryData).mockResolvedValue({
      success: true,
      data: {
        totalUsers: 100,
        totalViews: 2000,
        thisWeekViews: 200,
        lastWeekViews: 150,
        thisWeekUserLogins: 50,
        lastWeekUserLogins: 40,
      },
    })

    const { unmount } = render(<AdminStats />)

    await waitFor(() => {
      expect(screen.getByText("Total Users")).toBeTruthy()
    })

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith("admin-refresh-stats", expect.any(Function))

    removeEventListenerSpy.mockRestore()
  })
})
