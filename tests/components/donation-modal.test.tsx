import type React from "react"

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DonationModal from "@/components/donation-modal"

// Mock the Dialog component
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

describe("DonationModal", () => {
  const mockOnClose = vi.fn()
  const testPayId = "test-payid@example.com"

  beforeEach(() => {
    mockOnClose.mockClear()
    // Set up environment variable
    process.env.NEXT_PUBLIC_DONATE_PAYID = testPayId
    // Mock window.open
    vi.stubGlobal("open", vi.fn())
  })

  it("should not render when isOpen is false", () => {
    render(<DonationModal isOpen={false} onClose={mockOnClose} />)
    expect(screen.queryByText(/Support the Okinawa Kobudo Library/i)).toBeNull()
  })

  it("should render when isOpen is true", () => {
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText(/Support the Okinawa Kobudo Library/i)).toBeTruthy()
  })

  it("should display donation message content", () => {
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText(/Thanks for considering to donate!/i)).toBeTruthy()
    expect(screen.getByText(/yearly costs for domains, maintenance and hosting/i)).toBeTruthy()
    expect(screen.getByText(/Thanks - Tony/i)).toBeTruthy()
  })

  it("should have PayPal donate button", () => {
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    const paypalButton = screen.getByRole("button", { name: /donate via paypal/i })
    expect(paypalButton).toBeTruthy()
  })

  it("should open PayPal link in new tab when donate button is clicked", async () => {
    const user = userEvent.setup()
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    const paypalButton = screen.getByRole("button", { name: /donate via paypal/i })

    await user.click(paypalButton)

    expect(globalThis.open).toHaveBeenCalledWith("https://paypal.me/TonyYoung1", "_blank")
  })

  it("should display PayID from environment variable", () => {
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    const emailElement = screen.getByText(testPayId)
    expect(emailElement).toBeTruthy()
    // Verify it has the font-mono class
    expect(emailElement.className).toContain("font-mono")
  })

  it("should copy PayID to clipboard when copy button is clicked", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    const originalClipboard = navigator.clipboard
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    })

    const user = userEvent.setup()
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    const copyButton = screen.getByTitle(/copy payid/i)

    await user.click(copyButton)

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(testPayId)
    })

    // Restore original clipboard
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    })
  })

  it("should show check icon after copying", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    const originalClipboard = navigator.clipboard
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    })

    const user = userEvent.setup()
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    const copyButton = screen.getByTitle(/copy payid/i)

    await user.click(copyButton)

    await waitFor(() => {
      expect(screen.getByTitle("Copied!")).toBeTruthy()
    })

    // Restore original clipboard
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    })
  })

  it("should call onClose when Maybe Later button is clicked", async () => {
    const user = userEvent.setup()
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    const maybeLaterButton = screen.getByRole("button", { name: /maybe later/i })

    await user.click(maybeLaterButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
