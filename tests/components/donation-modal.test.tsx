"use client"

import type React from "react"

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
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

  beforeEach(() => {
    mockOnClose.mockClear()
    // Mock window.open
    vi.stubGlobal("open", vi.fn())
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it("should not render when isOpen is false", () => {
    render(<DonationModal isOpen={false} onClose={mockOnClose} />)
    expect(screen.queryByText(/Support the Okinawa Kobudo Library/i)).not.toBeInTheDocument()
  })

  it("should render when isOpen is true", () => {
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText(/Support the Okinawa Kobudo Library/i)).toBeInTheDocument()
  })

  it("should display donation message content", () => {
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText(/Thanks for considering to donate!/i)).toBeInTheDocument()
    expect(screen.getByText(/yearly costs for domains, maintenance and hosting/i)).toBeInTheDocument()
    expect(screen.getByText(/Thanks - Tony/i)).toBeInTheDocument()
  })

  it("should have PayPal donate button", () => {
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    const paypalButton = screen.getByRole("button", { name: /donate via paypal/i })
    expect(paypalButton).toBeInTheDocument()
  })

  it("should open PayPal link in new tab when donate button is clicked", () => {
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    const paypalButton = screen.getByRole("button", { name: /donate via paypal/i })

    fireEvent.click(paypalButton)

    expect(window.open).toHaveBeenCalledWith("https://paypal.me/TonyYoung1", "_blank")
  })

  it("should display PayID email address", () => {
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    // Find the PayID section by the CreditCard icon and PayID label
    const payidSection = screen.getByText("PayID").closest("div")
    expect(payidSection).toBeTruthy()
    // Verify email appears within the PayID section
    const emailInSection = payidSection?.querySelector(".font-mono")
    expect(emailInSection?.textContent).toBe("acmyma@gmail.com")
  })

  it("should copy PayID to clipboard when copy button is clicked", async () => {
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    const copyButton = screen.getByTitle(/copy payid/i)

    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("acmyma@gmail.com")
    })
  })

  it("should show check icon after copying", async () => {
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    const copyButton = screen.getByTitle(/copy payid/i)

    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(screen.getByTitle("Copied!")).toBeInTheDocument()
    })
  })

  it("should call onClose when Maybe Later button is clicked", () => {
    render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    const maybeLaterButton = screen.getByRole("button", { name: /maybe later/i })

    fireEvent.click(maybeLaterButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
