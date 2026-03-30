"use client"

import type React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { DonationCheckout } from "@/components/donation-checkout"

// Mock Stripe
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn().mockResolvedValue({}),
}))

vi.mock("@stripe/react-stripe-js", () => ({
  EmbeddedCheckout: ({ onComplete }: { onComplete?: () => void }) => (
    <div data-testid="embedded-checkout">
      <button onClick={onComplete}>Complete Payment</button>
    </div>
  ),
  EmbeddedCheckoutProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Use vi.hoisted() to ensure mock function is available when vi.mock factories run
const { mockCreateDonationCheckout } = vi.hoisted(() => ({
  mockCreateDonationCheckout: vi.fn(),
}))

vi.mock("@/lib/actions/donations", () => ({
  createDonationCheckout: mockCreateDonationCheckout,
}))

vi.mock("@/lib/donation-products", () => ({
  DONATION_PRESETS: [
    { id: "donation-5", name: "$5", amountCents: 500 },
    { id: "donation-10", name: "$10", amountCents: 1000 },
    { id: "donation-25", name: "$25", amountCents: 2500 },
    { id: "donation-50", name: "$50", amountCents: 5000 },
  ],
}))

vi.mock("@/lib/trace", () => ({
  trace: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe("DonationCheckout", () => {
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateDonationCheckout.mockReset()
  })

  it("should render donation amount options", () => {
    render(
      <DonationCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText("Choose One-off Amount")).toBeTruthy()
    expect(screen.getByText("$5")).toBeTruthy()
    expect(screen.getByText("$10")).toBeTruthy()
    expect(screen.getByText("$25")).toBeTruthy()
    expect(screen.getByText("$50")).toBeTruthy()
  })

  it("should render custom amount option", () => {
    render(
      <DonationCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText("Custom One-off Amount")).toBeTruthy()
  })

  it("should select a preset amount", async () => {
    render(
      <DonationCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const $25Button = screen.getByText("$25")
    fireEvent.click($25Button)

    // The $25 button should now have the selected style
    expect($25Button.className).toContain("bg-red-500")
  })

  it("should switch to custom amount input", async () => {
    render(
      <DonationCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const customRadio = screen.getByLabelText("Custom One-off Amount")
    fireEvent.click(customRadio)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter amount in AUD")).toBeTruthy()
    })
  })

  it("should show error for invalid custom amount", async () => {
    render(
      <DonationCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    // Switch to custom amount
    const customRadio = screen.getByLabelText("Custom One-off Amount")
    fireEvent.click(customRadio)

    // Enter invalid amount
    const input = screen.getByPlaceholderText("Enter amount in AUD")
    fireEvent.change(input, { target: { value: "0.5" } })

    // Click proceed
    const proceedButton = screen.getByText("Proceed to Payment")
    fireEvent.click(proceedButton)

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid amount of at least $1")).toBeTruthy()
    })
  })

  it("should create checkout session with preset amount", async () => {
    mockCreateDonationCheckout.mockResolvedValue({
      success: true,
      clientSecret: "test_client_secret",
      sessionId: "cs_test_123",
    })

    render(
      <DonationCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    // Select $25 preset
    const $25Button = screen.getByText("$25")
    fireEvent.click($25Button)

    // Click proceed
    const proceedButton = screen.getByText("Proceed to Payment")
    fireEvent.click(proceedButton)

    await waitFor(() => {
      expect(mockCreateDonationCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          presetId: "donation-25",
          email: "test@example.com",
        })
      )
    })
  })

  it("should create checkout session with custom amount", async () => {
    mockCreateDonationCheckout.mockResolvedValue({
      success: true,
      clientSecret: "test_client_secret",
      sessionId: "cs_test_123",
    })

    render(
      <DonationCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    // Switch to custom amount
    const customRadio = screen.getByLabelText("Custom One-off Amount")
    fireEvent.click(customRadio)

    // Enter valid amount
    const input = screen.getByPlaceholderText("Enter amount in AUD")
    fireEvent.change(input, { target: { value: "15" } })

    // Click proceed
    const proceedButton = screen.getByText("Proceed to Payment")
    fireEvent.click(proceedButton)

    await waitFor(() => {
      expect(mockCreateDonationCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1500, // $15 in cents
          email: "test@example.com",
        })
      )
    })
  })

  it("should show embedded checkout after successful checkout creation", async () => {
    mockCreateDonationCheckout.mockResolvedValue({
      success: true,
      clientSecret: "test_client_secret",
      sessionId: "cs_test_123",
    })

    render(
      <DonationCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    // Click proceed with default selection
    const proceedButton = screen.getByText("Proceed to Payment")
    fireEvent.click(proceedButton)

    await waitFor(() => {
      expect(screen.getByTestId("embedded-checkout")).toBeTruthy()
    })
  })

  it("should show error when checkout creation fails", async () => {
    mockCreateDonationCheckout.mockResolvedValue({
      success: false,
      error: "Payment processing failed",
    })

    render(
      <DonationCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const proceedButton = screen.getByText("Proceed to Payment")
    fireEvent.click(proceedButton)

    await waitFor(() => {
      expect(screen.getByText("Payment processing failed")).toBeTruthy()
    })
  })

  it("should call onCancel when back button is clicked", () => {
    render(
      <DonationCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const backButton = screen.getByText("Back")
    fireEvent.click(backButton)

    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it("should handle API errors gracefully", async () => {
    mockCreateDonationCheckout.mockRejectedValue(new Error("Network error"))

    render(
      <DonationCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    )

    const proceedButton = screen.getByText("Proceed to Payment")
    fireEvent.click(proceedButton)

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeTruthy()
    })
  })
})
