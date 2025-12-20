import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AdminDashboardClient from "@/components/admin-dashboard-client"

// Mock the child components
vi.mock("@/components/admin-stats", () => ({
  default: () => <div data-testid="admin-stats">Admin Stats</div>,
}))

vi.mock("@/components/pending-users", () => ({
  default: () => <div data-testid="pending-users">Pending Users</div>,
}))

vi.mock("@/components/unconfirmed-email-users", () => ({
  default: () => <div data-testid="unconfirmed-email-users">Unconfirmed Email Users</div>,
}))

describe("AdminDashboardClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render dashboard title and description", () => {
    render(<AdminDashboardClient />)

    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Manage users, videos, and categories")).toBeInTheDocument()
  })

  it("should render all child components", () => {
    render(<AdminDashboardClient />)

    expect(screen.getByTestId("admin-stats")).toBeInTheDocument()
    expect(screen.getByTestId("pending-users")).toBeInTheDocument()
    expect(screen.getByTestId("unconfirmed-email-users")).toBeInTheDocument()
  })

  it("should render refresh button", () => {
    render(<AdminDashboardClient />)

    const refreshButton = screen.getByRole("button", { name: /refresh all/i })
    expect(refreshButton).toBeInTheDocument()
  })

  it("should dispatch custom events when refresh button is clicked", async () => {
    const user = userEvent.setup()
    const dispatchSpy = vi.spyOn(window, "dispatchEvent")

    render(<AdminDashboardClient />)

    const refreshButton = screen.getByRole("button", { name: /refresh all/i })
    await user.click(refreshButton)

    // Wait for events to be dispatched
    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "admin-refresh-stats" }))
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "admin-refresh-pending-users" }))
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "admin-refresh-unconfirmed-users" }))
    })
  })

  it("should show refreshing state when button is clicked", async () => {
    const user = userEvent.setup()
    render(<AdminDashboardClient />)

    const refreshButton = screen.getByRole("button", { name: /refresh all/i })
    await user.click(refreshButton)

    // Button should show "Refreshing..." immediately
    expect(screen.getByText("Refreshing...")).toBeInTheDocument()
    expect(refreshButton).toBeDisabled()

    // Wait for refresh to complete
    await waitFor(() => {
      expect(screen.getByText("Refresh All")).toBeInTheDocument()
    })
  })

  it("should show spinning icon during refresh", async () => {
    const user = userEvent.setup()
    render(<AdminDashboardClient />)

    const refreshButton = screen.getByRole("button", { name: /refresh all/i })

    const icon = refreshButton.querySelector("svg")
    expect(icon).not.toHaveClass("animate-spin")

    await user.click(refreshButton)

    const spinningIcon = refreshButton.querySelector("svg.animate-spin")
    expect(spinningIcon).toBeInTheDocument()
  })

  it("should handle refresh errors gracefully", async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.spyOn(window, "dispatchEvent").mockImplementation(() => {
      throw new Error("Event dispatch failed")
    })

    render(<AdminDashboardClient />)

    const refreshButton = screen.getByRole("button", { name: /refresh all/i })
    await user.click(refreshButton)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error refreshing admin data:", expect.any(Error))
    })

    // Button should still reset to normal state
    await waitFor(() => {
      expect(screen.getByText("Refresh All")).toBeInTheDocument()
      expect(refreshButton).not.toBeDisabled()
    })

    consoleErrorSpy.mockRestore()
  })
})
