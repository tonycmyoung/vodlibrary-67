// Donation amounts in AUD cents
export const DONATION_PRESETS = [
  { id: "donation-5", name: "$5", amountCents: 500 },
  { id: "donation-10", name: "$10", amountCents: 1000 },
  { id: "donation-25", name: "$25", amountCents: 2500 },
  { id: "donation-50", name: "$50", amountCents: 5000 },
] as const

export type DonationPreset = (typeof DONATION_PRESETS)[number]

export function getDonationPreset(id: string): DonationPreset | undefined {
  return DONATION_PRESETS.find((preset) => preset.id === id)
}

// Subscription tiers in AUD
export const SUBSCRIPTION_TIERS = [
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
] as const

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number]
export type SubscriptionInterval = "monthly" | "annual"

export function getSubscriptionTier(id: string): SubscriptionTier | undefined {
  return SUBSCRIPTION_TIERS.find((tier) => tier.id === id)
}
