import Stripe from "stripe"

// Server-only Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18",
})
