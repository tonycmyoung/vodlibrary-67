import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AdminRefreshButton from "@/components/admin-refresh-button"

describe("AdminRefreshButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it("should render button with correct initial text", () => {
    render(<AdminRefreshButton />)

    expect(screen.getByRole("button", { name: /refresh all/i })).toBeInTheDocument()
  })

  it("should dispatch three custom events when clicked", async () => {
    const user = userEvent.setup({ delay: null })
    const eventSpy = vi.fn()

    window.addEventListener("admin-refresh-pending-users", eventSpy)
    window.addEventListener("admin-refresh-unconfirmed-users", eventSpy)
    window.addEventListener("admin-refresh-stats", eventSpy)

    render(<AdminRefreshButton />)

    const button = screen.getByRole("button", { name: /refresh all/i })
    await user.click(button)

    expect(eventSpy).toHaveBeenCalledTimes(3)

    window.removeEventListener("admin-refresh-pending-users", eventSpy)
    window.removeEventListener("admin-refresh-unconfirmed-users", eventSpy)
    window.removeEventListener("admin-refresh-stats", eventSpy)
  })

  it("should show refreshing state with spinning icon", async () => {
    const user = userEvent.setup({ delay: null })

    render(<AdminRefreshButton />)

    const button = screen.getByRole("button", { name: /refresh all/i })
    await user.click(button)

    expect(screen.getByRole("button", { name: /refreshing/i })).toBeInTheDocument()
    const icon = button.querySelector("svg")
    expect(icon).toHaveClass("animate-spin")
  })

  it("should disable button while refreshing", async () => {
    const user = userEvent.setup({ delay: null })

    render(<AdminRefreshButton />)

    const button = screen.getByRole("button", { name: /refresh all/i })
    await user.click(button)

    expect(button).toBeDisabled()
  })

  it("should re-enable button after refresh completes", async () => {
    const user = userEvent.setup({ delay: null })

    render(<AdminRefreshButton />)

    const button = screen.getByRole("button", { name: /refresh all/i })
    await user.click(button)

    vi.advanceTimersByTime(1000)
    await vi.runAllTimersAsync()

    expect(button).not.toBeDisabled()
    expect(screen.getByRole("button", { name: /refresh all/i })).toBeInTheDocument()
  })

  it("should handle errors gracefully and still re-enable button", async () => {
    const user = userEvent.setup({ delay: null })
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.spyOn(window, "dispatchEvent").mockImplementationOnce(() => {
      throw new Error("Event dispatch failed")
    })

    render(<AdminRefreshButton />)

    const button = screen.getByRole("button", { name: /refresh all/i })
    await user.click(button)

    expect(consoleErrorSpy).toHaveBeenCalledWith("Error refreshing admin data:", expect.any(Error))

    expect(button).not.toBeDisabled()

    consoleErrorSpy.mockRestore()
  })
})
