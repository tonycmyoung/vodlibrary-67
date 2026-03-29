"use server"

import { stripe } from "@/lib/stripe"
import { getDonationPreset, DONATION_PRESETS } from "@/lib/donation-products"

interface CreateDonationCheckoutParams {
  amount?: number // in AUD cents, for custom amounts
  presetId?: string // for preset amounts
  email: string
  returnUrl: string
}

export async function createDonationCheckout(params: CreateDonationCheckoutParams) {
  try {
    const { amount, presetId, email, returnUrl } = params

    let amountInCents = 0

    // Determine amount
    if (presetId) {
      const preset = getDonationPreset(presetId)
      if (!preset) {
        throw new Error("Invalid donation preset")
      }
      amountInCents = preset.amountCents
    } else if (amount) {
      // Validate custom amount: minimum $1 AUD, maximum $10,000 AUD
      if (amount < 100 || amount > 1000000) {
        throw new Error("Donation amount must be between $1 and $10,000 AUD")
      }
      amountInCents = amount
    } else {
      throw new Error("Either amount or presetId must be provided")
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: "Okinawa Kobudo Library Donation",
              description: `Thank you for supporting the Okinawa Kobudo Library`,
              images: ["https://images.unsplash.com/photo-1469903622937-723ae69e6d4f?w=400"],
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${returnUrl}?status=success`,
      cancel_url: `${returnUrl}?status=cancelled`,
    })

    if (!session.client_secret) {
      throw new Error("Failed to create checkout session")
    }

    return {
      success: true,
      clientSecret: session.client_secret,
      sessionId: session.id,
    }
  } catch (error) {
    console.error("[v0] Error creating donation checkout:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create checkout session",
    }
  }
}
