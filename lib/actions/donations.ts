"use server"

import { stripe } from "@/lib/stripe"
import { getDonationPreset, DONATION_PRESETS, getSubscriptionTier, SUBSCRIPTION_TIERS } from "@/lib/donation-products"

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
      ui_mode: "embedded_page",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: "Okinawa Kobudo Library Donation",
              description: `Thank you for supporting the Okinawa Kobudo Library`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      redirect_on_completion: "never",
    })

    if (!session.client_secret || !session.id) {
      throw new Error("Failed to create checkout session")
    }

    return {
      success: true,
      clientSecret: session.client_secret,
      sessionId: session.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create checkout session",
    }
  }
}

interface CreateSubscriptionCheckoutParams {
  tierId: string
  interval: "monthly" | "annual"
  email: string
  returnUrl: string
}

export async function createSubscriptionCheckout(params: CreateSubscriptionCheckoutParams) {
  try {
    const { tierId, interval, email, returnUrl } = params

    const tier = getSubscriptionTier(tierId)
    if (!tier) {
      throw new Error("Invalid subscription tier")
    }

    const priceData = tier.prices[interval]
    if (!priceData) {
      throw new Error("Invalid subscription interval")
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ui_mode: "embedded_page",
      customer_email: email,
      line_items: [
        {
          price: priceData.priceId,
          quantity: 1,
        },
      ],
      redirect_on_completion: "never",
    })

    if (!session.client_secret || !session.id) {
      throw new Error("Failed to create subscription checkout session")
    }

    return {
      success: true,
      clientSecret: session.client_secret,
      sessionId: session.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create subscription checkout session",
    }
  }
}

interface CreateCustomerPortalSessionParams {
  email: string
  returnUrl: string
}

export async function createCustomerPortalSession(params: CreateCustomerPortalSessionParams) {
  try {
    const { email, returnUrl } = params

    if (!email.trim()) {
      throw new Error("Email is required")
    }

    // List customers to find one with matching email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    })

    if (!customers.data || customers.data.length === 0) {
      return {
        success: false,
        error: "No active subscription found for your account.",
        portalUrl: null,
      }
    }

    const customer = customers.data[0]

    // Check if customer has active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    })

    if (!subscriptions.data || subscriptions.data.length === 0) {
      return {
        success: false,
        error: "No active subscription found for your account.",
        portalUrl: null,
      }
    }

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl,
    })

    if (!portalSession.url) {
      throw new Error("Failed to create portal session")
    }

    return {
      success: true,
      error: null,
      portalUrl: portalSession.url,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create portal session",
      portalUrl: null,
    }
  }
}
