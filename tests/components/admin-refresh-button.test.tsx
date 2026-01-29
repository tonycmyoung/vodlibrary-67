import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import AdminRefreshButton from "@/components/admin-refresh-button"

describe("AdminRefreshButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render button with correct initial text", () => {
    render(<AdminRefreshButton />)

    expect(screen.getByRole("button", { name: /refresh all/i })).toBeTruthy()
  })

  it("should dispatch three custom events when clicked", async () => {
    const user = userEvent.setup()
    const eventSpy = vi.fn()

    globalThis.addEventListener("admin-refresh-pending-users", eventSpy)
    globalThis.addEventListener("admin-refresh-unconfirmed-users", eventSpy)
    globalThis.addEventListener("admin-refresh-stats", eventSpy)

    render(<AdminRefreshButton />)

    const button = screen.getByRole("button", { name: /refresh all/i })
    await user.click(button)

    await waitFor(() => {
      expect(eventSpy).toHaveBeenCalledTimes(3)
    })

    globalThis.removeEventListener("admin-refresh-pending-users", eventSpy)
    globalThis.removeEventListener("admin-refresh-unconfirmed-users", eventSpy)
    globalThis.removeEventListener("admin-refresh-stats", eventSpy)
  })

  it("should show refreshing state with spinning icon", async () => {
    const user = userEvent.setup()

    render(<AdminRefreshButton />)

    const button = screen.getByRole("button", { name: /refresh all/i })
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refreshing/i })).toBeTruthy()
    })

    const refreshingButton = screen.getByRole("button", { name: /refreshing/i })
    const icon = refreshingButton.querySelector("svg")
    expect(icon).toHaveClass("animate-spin")
  })

  it("should disable button while refreshing", async () => {
    const user = userEvent.setup()

    render(<AdminRefreshButton />)

    const button = screen.getByRole("button", { name: /refresh all/i })
    await user.click(button)

    await waitFor(() => {
      expect(button).toBeDisabled()
    })
  })

  it("should re-enable button after refresh completes", async () => {
    const user = userEvent.setup()

    render(<AdminRefreshButton />)

    const button = screen.getByRole("button", { name: /refresh all/i })
    await user.click(button)

    await waitFor(() => {
      expect(button).toBeDisabled()
    })

    await waitFor(
      () => {
        expect(button).not.toBeDisabled()
        expect(screen.getByRole("button", { name: /refresh all/i })).toBeTruthy()
      },
      { timeout: 2000 },
    )
  })

  it("should handle errors gracefully and still re-enable button", async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    let callCount = 0
    const originalDispatch = globalThis.dispatchEvent
    vi.spyOn(globalThis, "dispatchEvent").mockImplementation((event) => {
      callCount++
      if (callCount === 1) {
        throw new Error("Event dispatch failed")
      }
      return originalDispatch.call(globalThis, event)
    })

    render(<AdminRefreshButton />)

    const button = screen.getByRole("button", { name: /refresh all/i })
    await user.click(button)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error refreshing admin data:", expect.any(Error))
    })

    await waitFor(
      () => {
        expect(button).not.toBeDisabled()
      },
      { timeout: 2000 },
    )

    consoleErrorSpy.mockRestore()
  })
})
