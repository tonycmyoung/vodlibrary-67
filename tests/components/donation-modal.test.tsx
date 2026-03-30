"use client"

import type React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import DonationModal from "@/components/donation-modal"
import { createClient } from "@/lib/supabase/client"
import { checkExistingSubscription, createCustomerPortalSession } from "@/lib/actions/donations"

// Mock the Stripe library to prevent initialization errors
vi.mock("@/lib/stripe", () => ({
  stripe: {},
  getStripe: vi.fn(),
}))

// Mock the donations actions
vi.mock("@/lib/actions/donations", () => ({
  createDonationCheckout: vi.fn(),
  checkExistingSubscription: vi.fn(),
  createCustomerPortalSession: vi.fn(),
}))

// Mock the Dialog component
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

// Mock DonationCheckout and SubscriptionCheckout
vi.mock("@/components/donation-checkout", () => ({
  DonationCheckout: ({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) => (
    <div data-testid="donation-checkout">
      <button onClick={onSuccess}>Complete Donation</button>
      <button onClick={onCancel}>Cancel Donation</button>
    </div>
  ),
}))

vi.mock("@/components/subscription-checkout", () => ({
  SubscriptionCheckout: ({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) => (
    <div data-testid="subscription-checkout">
      <button onClick={onSuccess}>Complete Subscription</button>
      <button onClick={onCancel}>Cancel Subscription</button>
    </div>
  ),
}))

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

// Mock trace
vi.mock("@/lib/trace", () => ({
  trace: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe("DonationModal", () => {
  const mockOnClose = vi.fn()
  const testPayId = "test-payid@example.com"

  beforeEach(() => {
    vi.clearAllMocks()

    // Set up Supabase mock following video-card-list.test.tsx pattern
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { email: "test@example.com" } }, error: null }),
      },
    }
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    // Set up environment variable
    process.env.NEXT_PUBLIC_DONATE_PAYID = testPayId
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
    expect(screen.queryByText(/Support the Okinawa Kobudo Library/i)).toBeNull()
  })

  it("should render when isOpen is true", async () => {
    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })
    expect(screen.getByText(/Support the Okinawa Kobudo Library/i)).toBeTruthy()
  })

  it("should display donation message content", async () => {
    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })
    expect(screen.getByText(/Thanks for considering to donate!/i)).toBeTruthy()
    expect(screen.getByText(/yearly costs for domains, maintenance and hosting/i)).toBeTruthy()
    expect(screen.getByText(/Thanks - Tony/i)).toBeTruthy()
  })

  it("should have PayPal donate button", async () => {
    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })
    const paypalButton = screen.getByRole("button", { name: /donate once-off via paypal/i })
    expect(paypalButton).toBeTruthy()
  })

  it("should open PayPal link in new tab when donate button is clicked", async () => {
    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })
    const paypalButton = screen.getByRole("button", { name: /donate once-off via paypal/i })

    fireEvent.click(paypalButton)

    expect(globalThis.open).toHaveBeenCalledWith("https://paypal.me/TonyYoung1", "_blank")
  })

  it("should display PayID from environment variable", async () => {
    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })
    const emailElement = screen.getByText(testPayId)
    expect(emailElement).toBeTruthy()
    // Verify it has the font-mono class
    expect(emailElement.className).toContain("font-mono")
  })

  it("should copy PayID to clipboard when copy button is clicked", async () => {
    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })
    const copyButton = screen.getByTitle(/copy payid/i)

    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testPayId)
    })
  })

  it("should show check icon after copying", async () => {
    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })
    const copyButton = screen.getByTitle(/copy payid/i)

    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(screen.getByTitle("Copied!")).toBeTruthy()
    })
  })

  it("should call onClose when Maybe Later button is clicked", async () => {
    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })
    const maybeLaterButton = screen.getByRole("button", { name: /maybe later/i })

    fireEvent.click(maybeLaterButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it("should show stripe checkout when clicking donate with card (with email)", async () => {
    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })

    const stripeButton = screen.getByRole("button", { name: /donate once-off with card/i })
    fireEvent.click(stripeButton)

    await waitFor(() => {
      expect(screen.getByTestId("donation-checkout")).toBeTruthy()
    })
  })

  it("should show success screen after donation completes", async () => {
    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })

    const stripeButton = screen.getByRole("button", { name: /donate once-off with card/i })
    fireEvent.click(stripeButton)

    await waitFor(() => {
      expect(screen.getByTestId("donation-checkout")).toBeTruthy()
    })

    const completeDonationButton = screen.getByText("Complete Donation")
    fireEvent.click(completeDonationButton)

    await waitFor(() => {
      expect(screen.getByText("Thank You!")).toBeTruthy()
    })
  })

  it("should show subscription checkout when clicking donate regularly", async () => {
    vi.mocked(checkExistingSubscription).mockResolvedValue({
      hasSubscription: false,
      subscriptionCount: 0,
    })

    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })

    const subscribeButton = screen.getByRole("button", { name: /donate regularly with card/i })
    fireEvent.click(subscribeButton)

    await waitFor(() => {
      expect(screen.getByTestId("subscription-checkout")).toBeTruthy()
    })
  })

  it("should show existing subscription warning when user has active subscription", async () => {
    vi.mocked(checkExistingSubscription).mockResolvedValue({
      hasSubscription: true,
      subscriptionCount: 1,
    })

    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })

    const subscribeButton = screen.getByRole("button", { name: /donate regularly with card/i })
    fireEvent.click(subscribeButton)

    await waitFor(() => {
      expect(screen.getByText(/You Already Have a Regular Donation/i)).toBeTruthy()
      expect(screen.getByText(/1 active regular donation/i)).toBeTruthy()
    })
  })

  it("should proceed to subscription checkout when user confirms additional subscription", async () => {
    vi.mocked(checkExistingSubscription).mockResolvedValue({
      hasSubscription: true,
      subscriptionCount: 1,
    })

    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })

    const subscribeButton = screen.getByRole("button", { name: /donate regularly with card/i })
    fireEvent.click(subscribeButton)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /You Already Have a Regular Donation/i })).toBeTruthy()
    })

    const confirmButton = screen.getByRole("button", { name: /Yes, Set Up Additional Donation/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(screen.getByTestId("subscription-checkout")).toBeTruthy()
    })
  })

  it("should go back when user cancels additional subscription", async () => {
    vi.mocked(checkExistingSubscription).mockResolvedValue({
      hasSubscription: true,
      subscriptionCount: 1,
    })

    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })

    const subscribeButton = screen.getByRole("button", { name: /donate regularly with card/i })
    fireEvent.click(subscribeButton)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /You Already Have a Regular Donation/i })).toBeTruthy()
    })

    const cancelButton = screen.getByRole("button", { name: /No, Go Back/i })
    fireEvent.click(cancelButton)

    await waitFor(() => {
      // Should be back to main view
      expect(screen.getByText(/Thanks for considering to donate!/i)).toBeTruthy()
    })
  })

  it("should show manage subscription view when clicking manage link", async () => {
    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })

    const manageButton = screen.getByRole("button", { name: /manage a regular donation/i })
    fireEvent.click(manageButton)

    await waitFor(() => {
      // Use getByRole to specifically target the heading element
      expect(screen.getByRole("heading", { name: /Manage Your Subscription/i })).toBeTruthy()
    })
  })

  it("should open portal when user clicks access portal", async () => {
    vi.mocked(createCustomerPortalSession).mockResolvedValue({
      success: true,
      portalUrl: "https://billing.stripe.com/test",
      error: null,
    })

    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })

    const manageButton = screen.getByRole("button", { name: /manage a regular donation/i })
    fireEvent.click(manageButton)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Manage Your Subscription/i })).toBeTruthy()
    })

    const portalButton = screen.getByRole("button", { name: /Access Subscription Portal/i })
    fireEvent.click(portalButton)

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith("https://billing.stripe.com/test", "_blank")
    })
  })

  it("should show error when portal session fails", async () => {
    vi.mocked(createCustomerPortalSession).mockResolvedValue({
      success: false,
      portalUrl: null,
      error: "No active subscription found",
    })

    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })

    const manageButton = screen.getByRole("button", { name: /manage a regular donation/i })
    fireEvent.click(manageButton)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Manage Your Subscription/i })).toBeTruthy()
    })

    const portalButton = screen.getByRole("button", { name: /Access Subscription Portal/i })
    fireEvent.click(portalButton)

    await waitFor(() => {
      expect(createCustomerPortalSession).toHaveBeenCalledWith("test@example.com")
    })

    await waitFor(() => {
      expect(screen.getByText(/No active subscription found/i)).toBeTruthy()
    })
  })

  it("should go back from manage view when back button is clicked", async () => {
    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })

    const manageButton = screen.getByRole("button", { name: /manage a regular donation/i })
    fireEvent.click(manageButton)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Manage Your Subscription/i })).toBeTruthy()
    })

    const backButton = screen.getByRole("button", { name: /^Back$/i })
    fireEvent.click(backButton)

    await waitFor(() => {
      expect(screen.getByText(/Thanks for considering to donate!/i)).toBeTruthy()
    })
  })

  it("should show success message for subscription completion", async () => {
    vi.mocked(checkExistingSubscription).mockResolvedValue({
      hasSubscription: false,
      subscriptionCount: 0,
    })

    await act(async () => {
      render(<DonationModal isOpen={true} onClose={mockOnClose} />)
    })

    const subscribeButton = screen.getByRole("button", { name: /donate regularly with card/i })
    fireEvent.click(subscribeButton)

    await waitFor(() => {
      expect(screen.getByTestId("subscription-checkout")).toBeTruthy()
    })

    const completeButton = screen.getByText("Complete Subscription")
    fireEvent.click(completeButton)

    await waitFor(() => {
      expect(screen.getByText("Thank You!")).toBeTruthy()
      expect(screen.getByText(/subscription has been set up successfully/i)).toBeTruthy()
    })
  })
})
