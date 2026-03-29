import Stripe from "stripe"

// Server-only Stripe client
// Don't specify apiVersion - let Stripe use its default supported version
// This avoids breaking when the npm package updates
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "")
