import Stripe from "stripe"

// Server-only Stripe client
// Explicitly specify API version for sandbox compatibility
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-03-25.dahlia" as any,
})
