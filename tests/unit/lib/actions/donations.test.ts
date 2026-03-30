import { describe, it, expect, vi, beforeEach } from "vitest"

// Use vi.hoisted() to ensure mock functions are available when vi.mock factories run
const { mockCreateSession, mockGetDonationPreset, mockGetSubscriptionTier, mockListCustomers, mockListSubscriptions, mockCreatePortalSession } = vi.hoisted(() => ({
  mockCreateSession: vi.fn(),
  mockGetDonationPreset: vi.fn(),
  mockGetSubscriptionTier: vi.fn(),
  mockListCustomers: vi.fn(),
  mockListSubscriptions: vi.fn(),
  mockCreatePortalSession: vi.fn(),
}))

// Mock Stripe module
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: mockCreateSession,
      },
    },
    customers: {
      list: mockListCustomers,
    },
    subscriptions: {
      list: mockListSubscriptions,
    },
    billingPortal: {
      sessions: {
        create: mockCreatePortalSession,
      },
    },
  },
  getStripe: vi.fn(),
}))

// Mock donation products module
vi.mock("@/lib/donation-products", () => ({
  getDonationPreset: mockGetDonationPreset,
  getSubscriptionTier: mockGetSubscriptionTier,
  DONATION_PRESETS: [
    { id: "donation-5", name: "$5", amountCents: 500 },
    { id: "donation-10", name: "$10", amountCents: 1000 },
    { id: "donation-25", name: "$25", amountCents: 2500 },
    { id: "donation-50", name: "$50", amountCents: 5000 },
  ],
  SUBSCRIPTION_TIERS: [
    {
      id: "supporter",
      name: "Supporter",
      prices: {
        monthly: { amount: 200, priceId: "price_1TGTp4BrKQRCXygCJkv72PiL" },
        annual: { amount: 2000, priceId: "price_1TGTp4BrKQRCXygCE5wJhbWO" },
      },
    },
    {
      id: "patron",
      name: "Patron",
      prices: {
        monthly: { amount: 500, priceId: "price_1TGTsLBrKQRCXygCRkpnx6Qr" },
        annual: { amount: 5000, priceId: "price_1TGTt0BrKQRCXygCMb2jpA7P" },
      },
    },
    {
      id: "champion",
      name: "Champion",
      prices: {
        monthly: { amount: 1000, priceId: "price_1TGTxZBrKQRCXygCvGgrFOyO" },
        annual: { amount: 10000, priceId: "price_1TGTxZBrKQRCXygCTmxSmQ90" },
      },
    },
  ],
}))

// Import after mocks are set up
import { createDonationCheckout, createSubscriptionCheckout, createCustomerPortalSession } from "@/lib/actions/donations"

describe("Donation Actions - createDonationCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset default mock behavior
    mockGetDonationPreset.mockImplementation((id: string) => {
      const presets: Record<string, { id: string; name: string; amountCents: number }> = {
        "donation-5": { id: "donation-5", name: "$5", amountCents: 500 },
        "donation-10": { id: "donation-10", name: "$10", amountCents: 1000 },
        "donation-25": { id: "donation-25", name: "$25", amountCents: 2500 },
        "donation-50": { id: "donation-50", name: "$50", amountCents: 5000 },
      }
      return presets[id] || undefined
    })
  })
})

describe("Donation Actions - createCustomerPortalSession", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("with valid customer and subscription", () => {
    it("should create and return portal session URL", async () => {
      mockListCustomers.mockResolvedValue({
        data: [{ id: "cus_test_123", email: "subscriber@example.com" }],
      })

      mockListSubscriptions.mockResolvedValue({
        data: [
          {
            id: "sub_test_456",
            customer: "cus_test_123",
            status: "active",
          },
        ],
      })

      mockCreatePortalSession.mockResolvedValue({
        url: "https://billing.stripe.com/p/session/test_portal_session_url",
      })

      const result = await createCustomerPortalSession({
        email: "subscriber@example.com",
        returnUrl: "https://example.com",
      })

      expect(result.success).toBe(true)
      expect(result.portalUrl).toBe("https://billing.stripe.com/p/session/test_portal_session_url")
      expect(result.error).toBeNull()

      expect(mockListCustomers).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "subscriber@example.com",
        })
      )

      expect(mockListSubscriptions).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_test_123",
          status: "active",
        })
      )

      expect(mockCreatePortalSession).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_test_123",
          return_url: "https://example.com",
        })
      )
    })
  })

  describe("error handling - no customer found", () => {
    it("should return error when no customer matches email", async () => {
      mockListCustomers.mockResolvedValue({
        data: [],
      })

      const result = await createCustomerPortalSession({
        email: "nonexistent@example.com",
        returnUrl: "https://example.com",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("No active subscription found for your account.")
      expect(result.portalUrl).toBeNull()
      expect(mockListSubscriptions).not.toHaveBeenCalled()
      expect(mockCreatePortalSession).not.toHaveBeenCalled()
    })

    it("should handle when customers list returns null data", async () => {
      mockListCustomers.mockResolvedValue({
        data: null,
      })

      const result = await createCustomerPortalSession({
        email: "subscriber@example.com",
        returnUrl: "https://example.com",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("No active subscription found for your account.")
      expect(result.portalUrl).toBeNull()
    })
  })

  describe("error handling - no active subscriptions", () => {
    it("should return error when customer has no active subscriptions", async () => {
      mockListCustomers.mockResolvedValue({
        data: [{ id: "cus_test_123", email: "subscriber@example.com" }],
      })

      mockListSubscriptions.mockResolvedValue({
        data: [],
      })

      const result = await createCustomerPortalSession({
        email: "subscriber@example.com",
        returnUrl: "https://example.com",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("No active subscription found for your account.")
      expect(result.portalUrl).toBeNull()
      expect(mockCreatePortalSession).not.toHaveBeenCalled()
    })

    it("should handle when subscriptions list returns null data", async () => {
      mockListCustomers.mockResolvedValue({
        data: [{ id: "cus_test_123", email: "subscriber@example.com" }],
      })

      mockListSubscriptions.mockResolvedValue({
        data: null,
      })

      const result = await createCustomerPortalSession({
        email: "subscriber@example.com",
        returnUrl: "https://example.com",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("No active subscription found for your account.")
      expect(result.portalUrl).toBeNull()
    })
  })

  describe("validation and error handling", () => {
    it("should reject empty email", async () => {
      const result = await createCustomerPortalSession({
        email: "",
        returnUrl: "https://example.com",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Email is required")
      expect(result.portalUrl).toBeNull()
      expect(mockListCustomers).not.toHaveBeenCalled()
    })

    it("should reject whitespace-only email", async () => {
      const result = await createCustomerPortalSession({
        email: "   ",
        returnUrl: "https://example.com",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Email is required")
      expect(mockListCustomers).not.toHaveBeenCalled()
    })

    it("should handle Stripe API errors when listing customers", async () => {
      mockListCustomers.mockRejectedValue(new Error("Stripe API connection failed"))

      const result = await createCustomerPortalSession({
        email: "subscriber@example.com",
        returnUrl: "https://example.com",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Stripe API connection failed")
      expect(result.portalUrl).toBeNull()
    })

    it("should handle Stripe API errors when listing subscriptions", async () => {
      mockListCustomers.mockResolvedValue({
        data: [{ id: "cus_test_123", email: "subscriber@example.com" }],
      })

      mockListSubscriptions.mockRejectedValue(new Error("Stripe API rate limit"))

      const result = await createCustomerPortalSession({
        email: "subscriber@example.com",
        returnUrl: "https://example.com",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Stripe API rate limit")
      expect(result.portalUrl).toBeNull()
    })

    it("should handle Stripe API errors when creating portal session", async () => {
      mockListCustomers.mockResolvedValue({
        data: [{ id: "cus_test_123", email: "subscriber@example.com" }],
      })

      mockListSubscriptions.mockResolvedValue({
        data: [{ id: "sub_test_456", status: "active" }],
      })

      mockCreatePortalSession.mockRejectedValue(new Error("Portal session creation failed"))

      const result = await createCustomerPortalSession({
        email: "subscriber@example.com",
        returnUrl: "https://example.com",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Portal session creation failed")
      expect(result.portalUrl).toBeNull()
    })

    it("should handle missing portal URL in response", async () => {
      mockListCustomers.mockResolvedValue({
        data: [{ id: "cus_test_123", email: "subscriber@example.com" }],
      })

      mockListSubscriptions.mockResolvedValue({
        data: [{ id: "sub_test_456", status: "active" }],
      })

      mockCreatePortalSession.mockResolvedValue({
        // missing url
      })

      const result = await createCustomerPortalSession({
        email: "subscriber@example.com",
        returnUrl: "https://example.com",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to create portal session")
      expect(result.portalUrl).toBeNull()
    })

    it("should handle non-Error exceptions gracefully", async () => {
      mockListCustomers.mockRejectedValue("String error thrown")

      const result = await createCustomerPortalSession({
        email: "subscriber@example.com",
        returnUrl: "https://example.com",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to create portal session")
      expect(result.portalUrl).toBeNull()
    })
  })
})

  describe("with preset ID", () => {
    it("should create checkout session with preset amount", async () => {
      mockCreateSession.mockResolvedValue({
        id: "cs_test_123",
        client_secret: "pi_test_secret_456",
      })

      const result = await createDonationCheckout({
        presetId: "donation-5",
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
      mockGetDonationPreset.mockReturnValue(undefined)

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

describe("Donation Actions - createSubscriptionCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset default mock behavior
    mockGetSubscriptionTier.mockImplementation((id: string) => {
      const tiers: Record<
        string,
        {
          id: string
          name: string
          prices: {
            monthly: { amount: number; priceId: string }
            annual: { amount: number; priceId: string }
          }
        }
      > = {
        supporter: {
          id: "supporter",
          name: "Supporter",
          prices: {
            monthly: { amount: 200, priceId: "price_1TGTp4BrKQRCXygCJkv72PiL" },
            annual: { amount: 2000, priceId: "price_1TGTp4BrKQRCXygCE5wJhbWO" },
          },
        },
        patron: {
          id: "patron",
          name: "Patron",
          prices: {
            monthly: { amount: 500, priceId: "price_1TGTsLBrKQRCXygCRkpnx6Qr" },
            annual: { amount: 5000, priceId: "price_1TGTt0BrKQRCXygCMb2jpA7P" },
          },
        },
        champion: {
          id: "champion",
          name: "Champion",
          prices: {
            monthly: { amount: 1000, priceId: "price_1TGTxZBrKQRCXygCvGgrFOyO" },
            annual: { amount: 10000, priceId: "price_1TGTxZBrKQRCXygCTmxSmQ90" },
          },
        },
      }
      return tiers[id] || undefined
    })
  })

  describe("with valid subscription tiers", () => {
    it("should create checkout session for monthly subscription", async () => {
      mockCreateSession.mockResolvedValue({
        id: "cs_monthly_123",
        client_secret: "pi_monthly_secret",
      })

      const result = await createSubscriptionCheckout({
        tierId: "supporter",
        interval: "monthly",
        email: "subscriber@example.com",
        returnUrl: "https://example.com/subscribe/success",
      })

      expect(result.success).toBe(true)
      expect(result.clientSecret).toBe("pi_monthly_secret")
      expect(result.sessionId).toBe("cs_monthly_123")
      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          ui_mode: "embedded_page",
          customer_email: "subscriber@example.com",
          line_items: [
            expect.objectContaining({
              price: "price_1TGTp4BrKQRCXygCJkv72PiL",
              quantity: 1,
            }),
          ],
        })
      )
    })

    it("should create checkout session for annual subscription", async () => {
      mockCreateSession.mockResolvedValue({
        id: "cs_annual_456",
        client_secret: "pi_annual_secret",
      })

      const result = await createSubscriptionCheckout({
        tierId: "patron",
        interval: "annual",
        email: "subscriber@example.com",
        returnUrl: "https://example.com/subscribe/success",
      })

      expect(result.success).toBe(true)
      expect(result.clientSecret).toBe("pi_annual_secret")
      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price: "price_1TGTt0BrKQRCXygCMb2jpA7P",
              quantity: 1,
            }),
          ],
        })
      )
    })

    it("should support all three subscription tiers", async () => {
      mockCreateSession.mockResolvedValue({
        id: "cs_champion",
        client_secret: "pi_champion",
      })

      const result = await createSubscriptionCheckout({
        tierId: "champion",
        interval: "monthly",
        email: "subscriber@example.com",
        returnUrl: "https://example.com/subscribe/success",
      })

      expect(result.success).toBe(true)
      expect(mockCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price: "price_1TGTxZBrKQRCXygCvGgrFOyO",
            }),
          ],
        })
      )
    })
  })

  describe("validation and error handling", () => {
    it("should return error for invalid tier ID", async () => {
      mockGetSubscriptionTier.mockReturnValue(undefined)

      const result = await createSubscriptionCheckout({
        tierId: "invalid_tier",
        interval: "monthly",
        email: "subscriber@example.com",
        returnUrl: "https://example.com/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invalid subscription tier")
    })

    it("should handle Stripe API errors", async () => {
      mockCreateSession.mockRejectedValue(new Error("Stripe API connection error"))

      const result = await createSubscriptionCheckout({
        tierId: "supporter",
        interval: "monthly",
        email: "subscriber@example.com",
        returnUrl: "https://example.com/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Stripe API connection error")
    })

    it("should require client_secret in response", async () => {
      mockCreateSession.mockResolvedValue({
        id: "cs_no_secret",
        // missing client_secret
      })

      const result = await createSubscriptionCheckout({
        tierId: "supporter",
        interval: "monthly",
        email: "subscriber@example.com",
        returnUrl: "https://example.com/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to create subscription checkout session")
    })

    it("should require session id in response", async () => {
      mockCreateSession.mockResolvedValue({
        client_secret: "pi_no_id",
        // missing id
      })

      const result = await createSubscriptionCheckout({
        tierId: "supporter",
        interval: "monthly",
        email: "subscriber@example.com",
        returnUrl: "https://example.com/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to create subscription checkout session")
    })

    it("should handle generic errors gracefully", async () => {
      mockCreateSession.mockRejectedValue("Unknown error type")

      const result = await createSubscriptionCheckout({
        tierId: "supporter",
        interval: "monthly",
        email: "subscriber@example.com",
        returnUrl: "https://example.com/success",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to create subscription checkout session")
    })
  })
})
