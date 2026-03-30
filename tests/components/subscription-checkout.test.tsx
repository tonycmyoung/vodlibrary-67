"use client"

import type React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { SubscriptionCheckout } from "@/components/subscription-checkout"

// Mock Stripe
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn().mockResolvedValue({}),
}))

vi.mock("@stripe/react-stripe-js", () => ({
  EmbeddedCheckout: ({ onComplete }: { onComplete?: () => void }) => (
    <div data-testid="embedded-checkout">
      <button onClick={onComplete}>Complete Subscription</button>
    </div>
  ),
  EmbeddedCheckoutProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Use vi.hoisted() to ensure mock function is available when vi.mock factories run
const { mockCreateSubscriptionCheckout } = vi.hoisted(() => ({
  mockCreateSubscriptionCheckout: vi.fn(),
}))

vi.mock("@/lib/actions/donations", () => ({
  createSubscriptionCheckout: mockCreateSubscriptionCheckout,
}))

vi.mock("@/lib/donation-products", () => ({
  SUBSCRIPTION_TIERS: [
    {
      id: "supporter",
      name: "Supporter",
      prices: {
        monthly: { amount: 200, priceId: "price_supporter_monthly" },
        annual: { amount: 2000, priceId: "price_supporter_annual" },
      },
    },
    {
      id: "patron",
      name: "Patron",
      prices: {
        monthly: { amount: 500, priceId: "price_patron_monthly" },
        annual: { amount: 5000, priceId: "price_patron_annual" },
      },
    },
    {
      id: "champion",
      name: "Champion",
      prices: {
        monthly: { amount: 1000, priceId: "price_champion_monthly" },
        annual: { amount: 10000, priceId: "price_champion_annual" },
      },
    },
  ],
}))

vi.mock("@/lib/trace", () => ({
  trace: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe("SubscriptionCheckout", () => {
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateSubscriptionCheckout.mockReset()
  })

  it("should render subscription tier options", () => {
    render(
      <SubscriptionCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        onBack={mockOnBack}
      />
    )

    expect(screen.getByText("Supporter")).toBeTruthy()
    expect(screen.getByText("Patron")).toBeTruthy()
    expect(screen.getByText("Champion")).toBeTruthy()
  })

  it("should render interval toggle buttons", () => {
    render(
      <SubscriptionCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        onBack={mockOnBack}
      />
    )

    expect(screen.getByText("Monthly")).toBeTruthy()
    expect(screen.getByText("Annual")).toBeTruthy()
  })

  it("should show monthly prices by default", () => {
    render(
      <SubscriptionCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        onBack={mockOnBack}
      />
    )

    // Check for monthly price display ($2.00/month for Supporter)
    expect(screen.getByText("$2.00")).toBeTruthy()
  })

  it("should switch to annual prices when annual is selected", async () => {
    render(
      <SubscriptionCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        onBack={mockOnBack}
      />
    )

    const annualButton = screen.getByText("Annual")
    fireEvent.click(annualButton)

    await waitFor(() => {
      // Check for annual price display ($20.00/year for Supporter)
      expect(screen.getByText("$20.00")).toBeTruthy()
    })
  })

  it("should select supporter tier by default", () => {
    render(
      <SubscriptionCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        onBack={mockOnBack}
      />
    )

    const supporterButton = screen.getByText("Supporter").closest("button")
    expect(supporterButton?.className).toContain("border-purple-500")
  })

  it("should select a different tier when clicked", async () => {
    render(
      <SubscriptionCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        onBack={mockOnBack}
      />
    )

    const patronButton = screen.getByText("Patron").closest("button")
    fireEvent.click(patronButton!)

    await waitFor(() => {
      expect(patronButton?.className).toContain("border-purple-500")
    })
  })

  it("should create subscription checkout with selected tier and interval", async () => {
    mockCreateSubscriptionCheckout.mockResolvedValue({
      success: true,
      clientSecret: "test_client_secret",
      sessionId: "cs_test_123",
    })

    render(
      <SubscriptionCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        onBack={mockOnBack}
      />
    )

    // Select Patron tier
    const patronButton = screen.getByText("Patron").closest("button")
    fireEvent.click(patronButton!)

    // Click Subscribe
    const subscribeButton = screen.getByText("Subscribe")
    fireEvent.click(subscribeButton)

    await waitFor(() => {
      expect(mockCreateSubscriptionCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          tierId: "patron",
          interval: "monthly",
          email: "test@example.com",
        })
      )
    })
  })

  it("should create subscription checkout with annual interval", async () => {
    mockCreateSubscriptionCheckout.mockResolvedValue({
      success: true,
      clientSecret: "test_client_secret",
      sessionId: "cs_test_123",
    })

    render(
      <SubscriptionCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        onBack={mockOnBack}
      />
    )

    // Switch to annual
    const annualButton = screen.getByText("Annual")
    fireEvent.click(annualButton)

    // Click Subscribe
    const subscribeButton = screen.getByText("Subscribe")
    fireEvent.click(subscribeButton)

    await waitFor(() => {
      expect(mockCreateSubscriptionCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          tierId: "supporter",
          interval: "annual",
          email: "test@example.com",
        })
      )
    })
  })

  it("should show embedded checkout after successful subscription creation", async () => {
    mockCreateSubscriptionCheckout.mockResolvedValue({
      success: true,
      clientSecret: "test_client_secret",
      sessionId: "cs_test_123",
    })

    render(
      <SubscriptionCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        onBack={mockOnBack}
      />
    )

    const subscribeButton = screen.getByText("Subscribe")
    fireEvent.click(subscribeButton)

    await waitFor(() => {
      expect(screen.getByTestId("embedded-checkout")).toBeTruthy()
    })
  })

  it("should show error when subscription creation fails", async () => {
    mockCreateSubscriptionCheckout.mockResolvedValue({
      success: false,
      error: "Subscription creation failed",
    })

    render(
      <SubscriptionCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        onBack={mockOnBack}
      />
    )

    const subscribeButton = screen.getByText("Subscribe")
    fireEvent.click(subscribeButton)

    await waitFor(() => {
      expect(screen.getByText("Subscription creation failed")).toBeTruthy()
    })
  })

  it("should call onBack when back button is clicked", () => {
    render(
      <SubscriptionCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        onBack={mockOnBack}
      />
    )

    const backButton = screen.getByText("Back")
    fireEvent.click(backButton)

    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it("should use onCancel as fallback when onBack is not provided", () => {
    render(
      <SubscriptionCheckout
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
    mockCreateSubscriptionCheckout.mockRejectedValue(new Error("Network error"))

    render(
      <SubscriptionCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        onBack={mockOnBack}
      />
    )

    const subscribeButton = screen.getByText("Subscribe")
    fireEvent.click(subscribeButton)

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeTruthy()
    })
  })

  it("should show loading state while creating subscription", async () => {
    // Make the mock take a bit to resolve
    mockCreateSubscriptionCheckout.mockImplementation(() => new Promise(() => {}))

    render(
      <SubscriptionCheckout
        email="test@example.com"
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        onBack={mockOnBack}
      />
    )

    const subscribeButton = screen.getByText("Subscribe")
    fireEvent.click(subscribeButton)

    await waitFor(() => {
      expect(screen.getByText("Processing...")).toBeTruthy()
    })
  })
})
