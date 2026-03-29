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
