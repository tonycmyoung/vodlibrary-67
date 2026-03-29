import { describe, it, expect, vi, beforeEach } from "vitest"
import { createDonationCheckout } from "@/lib/actions/donations"
import { getDonationPreset } from "@/lib/donation-products"

// Mock Stripe
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
  getStripe: vi.fn(),
}))

// Mock donation products
vi.mock("@/lib/donation-products", () => ({
  getDonationPreset: vi.fn(),
  DONATION_PRESETS: {
    small: { id: "small", label: "$5", amountCents: 500 },
    medium: { id: "medium", label: "$10", amountCents: 1000 },
    large: { id: "large", label: "$50", amountCents: 5000 },
  },
}))

describe("createDonationCheckout", () => {
  let mockStripe: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockStripe = vi.mocked(require("@/lib/stripe").stripe)
  })

  describe("with preset ID", () => {
    it("should create a checkout session with preset amount", async () => {
      const mockPreset = { id: "small", label: "$5", amountCents: 500 }
      vi.mocked(getDonationPreset).mockReturnValue(mockPreset)

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: "cs_test_123",
        client_secret: "pi_test_secret_456",
      })

      const result = await createDonationCheckout({
        presetId: "small",
        email: "donor@example.com",
        returnUrl: "https://example.com/donation/success",
      })

      expect(result.success).toBe(true)
      expect(result.clientSecret).toBe("pi_test_secret_456")
      expect(result.sessionId).toBe("cs_test_123")

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        mode: "payment",
        ui_mode: "embedded_page",
        customer_email: "donor@example.com",
        line_items: [
          {
            price_data: {
              currency: "aud",
              product_data: {
                name: "Okinawa Kobudo Library Donation",
                description: expect.stringContaining("Thank you"),
              },
              unit_amount: 500,
            },
            quantity: 1,
          },
        ],
        redirect_on_completion: "never",
      })
    })

    it("should return error if preset not found", async () => {
      vi.mocked(getDonationPreset).mockReturnValue(null)

      const result = await createDonationCheckout({
        presetId: "invalid",
        email: "donor@example.com",
        returnUrl: "https://example.com/donation/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invalid donation preset")
    })
  })

  describe("with custom amount", () => {
    it("should create a checkout session with custom amount", async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: "cs_test_456",
        client_secret: "pi_test_secret_789",
      })

      const result = await createDonationCheckout({
        amount: 2500, // $25 AUD
        email: "donor@example.com",
        returnUrl: "https://example.com/donation/success",
      })

      expect(result.success).toBe(true)
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 2500,
              }),
            }),
          ],
        })
      )
    })

    it("should reject amount less than $1 AUD", async () => {
      const result = await createDonationCheckout({
        amount: 50, // $0.50 AUD
        email: "donor@example.com",
        returnUrl: "https://example.com/donation/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("between $1 and $10,000 AUD")
    })

    it("should reject amount greater than $10,000 AUD", async () => {
      const result = await createDonationCheckout({
        amount: 1000001, // $10,000.01 AUD
        email: "donor@example.com",
        returnUrl: "https://example.com/donation/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("between $1 and $10,000 AUD")
    })

    it("should accept amount at $1 minimum", async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: "cs_test_min",
        client_secret: "pi_test_min",
      })

      const result = await createDonationCheckout({
        amount: 100, // $1 AUD
        email: "donor@example.com",
        returnUrl: "https://example.com/donation/success",
      })

      expect(result.success).toBe(true)
    })

    it("should accept amount at $10,000 maximum", async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: "cs_test_max",
        client_secret: "pi_test_max",
      })

      const result = await createDonationCheckout({
        amount: 1000000, // $10,000 AUD
        email: "donor@example.com",
        returnUrl: "https://example.com/donation/success",
      })

      expect(result.success).toBe(true)
    })
  })

  describe("error handling", () => {
    it("should return error if neither amount nor presetId provided", async () => {
      const result = await createDonationCheckout({
        email: "donor@example.com",
        returnUrl: "https://example.com/donation/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Either amount or presetId must be provided")
    })

    it("should return error if session creation fails", async () => {
      mockStripe.checkout.sessions.create.mockRejectedValue(
        new Error("Stripe API error")
      )

      const result = await createDonationCheckout({
        amount: 1000,
        email: "donor@example.com",
        returnUrl: "https://example.com/donation/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Stripe API error")
    })

    it("should return error if session missing client_secret", async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: "cs_test_no_secret",
        // client_secret missing
      })

      const result = await createDonationCheckout({
        amount: 1000,
        email: "donor@example.com",
        returnUrl: "https://example.com/donation/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to create checkout session")
    })

    it("should return error if session missing id", async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        client_secret: "pi_test_no_id",
        // id missing
      })

      const result = await createDonationCheckout({
        amount: 1000,
        email: "donor@example.com",
        returnUrl: "https://example.com/donation/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to create checkout session")
    })

    it("should handle non-Error exceptions", async () => {
      mockStripe.checkout.sessions.create.mockRejectedValue("Unknown error")

      const result = await createDonationCheckout({
        amount: 1000,
        email: "donor@example.com",
        returnUrl: "https://example.com/donation/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to create checkout session")
    })
  })
})
