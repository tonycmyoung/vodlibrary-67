import Stripe from "stripe"

// Server-only Stripe client
// Using current API version supported by sandbox
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-18.acacia" as unknown as Stripe.LatestApiVersion,
})
