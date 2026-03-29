import Stripe from "stripe"

// Server-only Stripe client with lazy initialization
// This prevents errors during test/build when STRIPE_SECRET_KEY is not set
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set")
    }
    stripeInstance = new Stripe(secretKey)
  }
  return stripeInstance
}

// For backwards compatibility - will throw if accessed without STRIPE_SECRET_KEY
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return Reflect.get(getStripe(), prop)
  },
})
