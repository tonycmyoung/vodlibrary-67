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

// Get subscription price IDs from environment variables
function getSubscriptionPriceIds() {
  return {
    supporterMonthly: process.env.NEXT_PUBLIC_SUPPORTER_MONTHLY_PRICE_ID,
    supporterAnnual: process.env.NEXT_PUBLIC_SUPPORTER_ANNUAL_PRICE_ID,
    patronMonthly: process.env.NEXT_PUBLIC_PATRON_MONTHLY_PRICE_ID,
    patronAnnual: process.env.NEXT_PUBLIC_PATRON_ANNUAL_PRICE_ID,
    championMonthly: process.env.NEXT_PUBLIC_CHAMPION_MONTHLY_PRICE_ID,
    championAnnual: process.env.NEXT_PUBLIC_CHAMPION_ANNUAL_PRICE_ID,
  }
}

// Subscription tiers in AUD
// Price IDs are loaded from environment variables
const priceIds = getSubscriptionPriceIds()

export const SUBSCRIPTION_TIERS = [
  {
    id: "supporter",
    name: "Supporter",
    prices: {
      monthly: { amount: 200, priceId: priceIds.supporterMonthly || "" },
      annual: { amount: 2000, priceId: priceIds.supporterAnnual || "" },
    },
  },
  {
    id: "patron",
    name: "Patron",
    prices: {
      monthly: { amount: 500, priceId: priceIds.patronMonthly || "" },
      annual: { amount: 5000, priceId: priceIds.patronAnnual || "" },
    },
  },
  {
    id: "champion",
    name: "Champion",
    prices: {
      monthly: { amount: 1000, priceId: priceIds.championMonthly || "" },
      annual: { amount: 10000, priceId: priceIds.championAnnual || "" },
    },
  },
] as const

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number]
export type SubscriptionInterval = "monthly" | "annual"

export function getSubscriptionTier(id: string): SubscriptionTier | undefined {
  return SUBSCRIPTION_TIERS.find((tier) => tier.id === id)
}
