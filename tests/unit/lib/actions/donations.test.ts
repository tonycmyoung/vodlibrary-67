import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock donation products BEFORE importing donations
vi.mock("@/lib/donation-products", () => ({
  getDonationPreset: vi.fn((id: string) => {
    const presets: Record<string, any> = {
      small: { id: "small", label: "$5", amountCents: 500 },
      medium: { id: "medium", label: "$10", amountCents: 1000 },
      large: { id: "large", label: "$50", amountCents: 5000 },
    }
    return presets[id] || null
  }),
  DONATION_PRESETS: {
    small: { id: "small", label: "$5", amountCents: 500 },
    medium: { id: "medium", label: "$10", amountCents: 1000 },
    large: { id: "large", label: "$50", amountCents: 5000 },
  },
}))

// Mock Stripe BEFORE importing donations
const mockCreateSession = vi.fn()
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: mockCreateSession,
      },
    },
  },
  getStripe: vi.fn(),
}))

// NOW import after mocks are set up
import { createDonationCheckout } from "@/lib/actions/donations"

describe("Donation Actions - createDonationCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("with preset ID", () => {
    it("should create checkout session with preset amount", async () => {
      mockCreateSession.mockResolvedValue({
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
      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "payment",
          ui_mode: "embedded_page",
          customer_email: "donor@example.com",
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: "aud",
                unit_amount: 500,
              }),
            }),
          ],
        })
      )
    })

    it("should return error for invalid preset", async () => {
      const result = await createDonationCheckout({
        presetId: "invalid_preset",
        email: "donor@example.com",
        returnUrl: "https://example.com/donation/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invalid donation preset")
    })
  })

  describe("with custom amount", () => {
    it("should create checkout with custom amount", async () => {
      mockCreateSession.mockResolvedValue({
        id: "cs_custom_amount",
        client_secret: "pi_custom_secret",
      })

      const result = await createDonationCheckout({
        amount: 2500, // $25 AUD
        email: "donor@example.com",
        returnUrl: "https://example.com/success",
      })

      expect(result.success).toBe(true)
      expect(mockCreateSession).toHaveBeenCalledWith(
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

    it("should reject amount less than $1 AUD (100 cents)", async () => {
      const result = await createDonationCheckout({
        amount: 50,
        email: "donor@example.com",
        returnUrl: "https://example.com/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("between $1 and $10,000 AUD")
    })

    it("should reject amount greater than $10,000 AUD", async () => {
      const result = await createDonationCheckout({
        amount: 1000001,
        email: "donor@example.com",
        returnUrl: "https://example.com/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("between $1 and $10,000 AUD")
    })

    it("should accept $1 minimum donation", async () => {
      mockCreateSession.mockResolvedValue({
        id: "cs_min",
        client_secret: "pi_min",
      })

      const result = await createDonationCheckout({
        amount: 100,
        email: "donor@example.com",
        returnUrl: "https://example.com/success",
      })

      expect(result.success).toBe(true)
    })

    it("should accept $10,000 maximum donation", async () => {
      mockCreateSession.mockResolvedValue({
        id: "cs_max",
        client_secret: "pi_max",
      })

      const result = await createDonationCheckout({
        amount: 1000000,
        email: "donor@example.com",
        returnUrl: "https://example.com/success",
      })

      expect(result.success).toBe(true)
    })
  })

  describe("validation and error handling", () => {
    it("should require either amount or presetId", async () => {
      const result = await createDonationCheckout({
        email: "donor@example.com",
        returnUrl: "https://example.com/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Either amount or presetId must be provided")
    })

    it("should handle Stripe API errors", async () => {
      mockCreateSession.mockRejectedValue(new Error("Stripe API rate limit exceeded"))

      const result = await createDonationCheckout({
        amount: 1000,
        email: "donor@example.com",
        returnUrl: "https://example.com/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Stripe API rate limit exceeded")
    })

    it("should require client_secret in response", async () => {
      mockCreateSession.mockResolvedValue({
        id: "cs_no_secret",
        // missing client_secret
      })

      const result = await createDonationCheckout({
        amount: 1000,
        email: "donor@example.com",
        returnUrl: "https://example.com/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to create checkout session")
    })

    it("should require session id in response", async () => {
      mockCreateSession.mockResolvedValue({
        client_secret: "pi_no_id",
        // missing id
      })

      const result = await createDonationCheckout({
        amount: 1000,
        email: "donor@example.com",
        returnUrl: "https://example.com/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to create checkout session")
    })

    it("should handle generic errors gracefully", async () => {
      mockCreateSession.mockRejectedValue("Unknown non-Error exception")

      const result = await createDonationCheckout({
        amount: 1000,
        email: "donor@example.com",
        returnUrl: "https://example.com/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to create checkout session")
    })
  })
})
